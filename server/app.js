import express from "express";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import { getDb } from "./db.js";
import { adminCodeHash } from "../src/data/accounts.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

const SESSION_COOKIE = "sportivo_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "sportivo-secret-key-1717";

const hash = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

const id = () => crypto.randomUUID();

const safeUser = (user) => {
  if (!user) return null;
  const { passwordHash, passwordAliases, _id, ...safe } = user;
  return { ...safe, id: user.id || String(_id) };
};

const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Session token generation / verification
function createToken(userId, role) {
  const payload = {
    userId,
    role,
    expires: Date.now() + 8 * 3600000,
  };
  const str = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(str).digest("base64url");
  return `${str}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [str, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(str).digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(str, "base64url").toString());
    if (!payload.expires || payload.expires < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Session middleware
async function getUserFromRequest(req) {
  const token = req.cookies[SESSION_COOKIE];
  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const db = await getDb();
    const user = await db.collection("users").findOne({
      $or: [{ id: payload.userId }, { _id: payload.userId }],
      active: true,
    });
    return user ? safeUser(user) : null;
  } catch (err) {
    console.error("[Session] Error fetching user:", err.message);
    return null;
  }
}

const requireAuth = (roles) => async (req, res, next) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  if (roles && !roles.includes(user.role)) {
    return res.status(403).json({ message: "You do not have permission for this action." });
  }
  req.user = user;
  next();
};

// Router supporting both /api/* and root /* (in case mounted under /api or directly)
const router = express.Router();

// Helper to sanitize doc IDs
const cleanDoc = (doc) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: doc.id || String(_id) };
};

// 1. GET /bootstrap
router.get("/bootstrap", async (req, res) => {
  try {
    const db = await getDb();
    const user = await getUserFromRequest(req);

    const [sports, plans, coaches] = await Promise.all([
      db.collection("sports").find({}).toArray(),
      db.collection("plans").find({}).toArray(),
      db.collection("coaches").find({}).toArray(),
    ]);

    const publicData = {
      sports: sports.map(cleanDoc),
      plans: plans.map(cleanDoc),
      coaches: coaches.map((c) => {
        const { email, passwordHash, ...clean } = cleanDoc(c);
        return clean;
      }),
    };

    if (!user) {
      return res.json({ user: null, data: publicData });
    }

    if (user.role === "admin") {
      const [users, subscriptions, attendance, evaluations, notifications, payments, messages, audit] =
        await Promise.all([
          db.collection("users").find({}).toArray(),
          db.collection("subscriptions").find({}).toArray(),
          db.collection("attendance").find({}).toArray(),
          db.collection("evaluations").find({}).toArray(),
          db.collection("notifications").find({ userId: user.id }).toArray(),
          db.collection("payments").find({}).toArray(),
          db.collection("messages").find({}).toArray(),
          db.collection("audit").find({}).sort({ date: -1 }).toArray(),
        ]);

      return res.json({
        user,
        data: {
          ...publicData,
          users: users.map(safeUser),
          subscriptions: subscriptions.map(cleanDoc),
          attendance: attendance.map(cleanDoc),
          evaluations: evaluations.map(cleanDoc),
          notifications: notifications.map(cleanDoc),
          payments: payments.map(cleanDoc),
          messages: messages.map(cleanDoc),
          audit: audit.map(cleanDoc),
        },
      });
    }

    // Student or Coach
    const allSubs = await db.collection("subscriptions").find({}).toArray();
    let studentIds = [];
    if (user.role === "student") {
      studentIds = [user.id];
    } else {
      studentIds = allSubs.filter((s) => s.coachId === user.id).map((s) => s.studentId);
    }

    const [relatedUsers, attendance, evaluations, notifications, payments] = await Promise.all([
      db.collection("users").find({
        $or: [{ id: { $in: [...studentIds, user.id] } }, { _id: { $in: [...studentIds, user.id] } }],
      }).toArray(),
      db.collection("attendance").find({
        studentId: { $in: studentIds },
        ...(user.role === "coach" ? { coachId: user.id } : {}),
      }).toArray(),
      db.collection("evaluations").find({
        studentId: { $in: studentIds },
        ...(user.role === "coach" ? { coachId: user.id } : {}),
      }).toArray(),
      db.collection("notifications").find({ userId: user.id }).toArray(),
      user.role === "student" ? db.collection("payments").find({ studentId: user.id }).toArray() : [],
    ]);

    return res.json({
      user,
      data: {
        ...publicData,
        users: relatedUsers.map(safeUser),
        subscriptions: allSubs
          .filter((s) => studentIds.includes(s.studentId) && (user.role === "student" || s.coachId === user.id))
          .map(cleanDoc),
        attendance: attendance.map(cleanDoc),
        evaluations: evaluations.map(cleanDoc),
        notifications: notifications.map(cleanDoc),
        payments: payments.map(cleanDoc),
        messages: [],
      },
    });
  } catch (err) {
    console.error("[Bootstrap Error]", err);
    res.status(500).json({ message: err.message || "Failed to load academy data." });
  }
});

// 2. POST /auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password, role, code } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and portal role are required." });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({
      email: email.trim().toLowerCase(),
      role,
      active: true,
    });

    if (!user) {
      return res.status(401).json({ message: "Email or password is incorrect for this portal." });
    }

    const pHash = hash(password);
    const validHashes = [user.passwordHash, ...(user.passwordAliases || [])];
    if (!validHashes.includes(pHash)) {
      return res.status(401).json({ message: "Email or password is incorrect for this portal." });
    }

    if (role === "admin" && hash(code || "") !== adminCodeHash) {
      return res.status(401).json({ message: "The admin security code is incorrect." });
    }

    const token = createToken(user.id || String(user._id), user.role);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 8 * 3600000,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    res.json({ user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. POST /auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name?.trim() || !emailValid(email) || !password || password.length < 8) {
      return res.status(400).json({
        message: "Enter your name, a valid email, and a password of at least 8 characters.",
      });
    }

    const db = await getDb();
    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.collection("users").findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: "An account already exists for this email." });
    }

    const newId = id();
    const newUser = {
      _id: newId,
      id: newId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash: hash(password),
      role: "student",
      active: true,
      createdAt: new Date().toISOString(),
    };

    await db.collection("users").insertOne(newUser);

    const token = createToken(newId, "student");
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 8 * 3600000,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(201).json({ user: safeUser(newUser) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. POST /auth/logout
router.post("/auth/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ message: "Logged out" });
});

// POST /auth/reset-password (athlete forgot password)
router.post("/auth/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    if (!emailValid(email) || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        message: "Enter a valid athlete email and a new password of at least 8 characters.",
      });
    }

    const db = await getDb();
    const cleanEmail = email.trim().toLowerCase();
    const user = await db.collection("users").findOne({
      email: cleanEmail,
      role: "student",
      active: true,
    });

    if (!user) {
      return res.status(404).json({ message: "No active athlete account found with this email." });
    }

    const newHash = hash(newPassword);
    await db.collection("users").updateOne(
      { $or: [{ id: user.id }, { _id: user._id }] },
      { $set: { passwordHash: newHash, passwordAliases: [] } }
    );

    await db.collection("audit").insertOne({
      _id: id(),
      id: id(),
      actor: user.name,
      action: "Athlete password reset",
      date: new Date().toISOString(),
    });

    res.json({ message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. POST /enrollments
router.post("/enrollments", requireAuth(["student"]), async (req, res) => {
  try {
    const { sportId, coachId, planId } = req.body || {};
    const db = await getDb();
    const user = req.user;

    const [sport, coach, plan] = await Promise.all([
      db.collection("sports").findOne({ $or: [{ id: sportId }, { _id: sportId }] }),
      db.collection("coaches").findOne({
        $or: [{ id: coachId }, { _id: coachId }],
        sportId,
      }),
      db.collection("plans").findOne({ $or: [{ id: planId }, { _id: planId }] }),
    ]);

    if (!sport || !coach || !plan) {
      return res.status(400).json({ message: "Select a valid programme, coach and plan." });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const existing = await db.collection("subscriptions").findOne({
      studentId: user.id,
      sportId,
      status: "Active",
      endDate: { $gte: todayStr },
    });

    if (existing) {
      return res.status(400).json({ message: "You already have an active membership for this sport." });
    }

    const cohortCount = await db.collection("subscriptions").countDocuments({
      coachId,
      status: "Active",
      endDate: { $gte: todayStr },
    });

    if (cohortCount >= (sport.capacity || 6)) {
      return res.status(400).json({ message: "This cohort is full. Please choose another coach." });
    }

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(plan.months || 1));

    const subId = id();
    const subscription = {
      _id: subId,
      id: subId,
      studentId: user.id,
      sportId,
      coachId,
      planId,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      status: "Active",
    };

    const receiptId = id();
    const receipt = {
      _id: receiptId,
      id: receiptId,
      studentId: user.id,
      subscriptionId: subId,
      plan: plan.name,
      sport: sport.name,
      amount: Number(plan.price),
      date: subscription.startDate,
      status: "Simulated",
    };

    const notificationId = id();
    const notification = {
      _id: notificationId,
      id: notificationId,
      userId: user.id,
      message: `${sport.name} membership activated. Your receipt is ready.`,
      date: new Date().toISOString(),
      read: false,
    };

    await Promise.all([
      db.collection("subscriptions").insertOne(subscription),
      db.collection("payments").insertOne(receipt),
      db.collection("notifications").insertOne(notification),
    ]);

    res.status(201).json(cleanDoc(receipt));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. PUT /attendance
router.put("/attendance", requireAuth(["coach", "admin"]), async (req, res) => {
  try {
    const { date, time, drill, records } = req.body || {};
    const user = req.user;
    const todayStr = new Date().toISOString().slice(0, 10);

    if (!date || date > todayStr || !time || !drill?.trim() || !Array.isArray(records) || !records.length) {
      return res.status(400).json({
        message: "Choose a valid session date, time, drill and at least one athlete.",
      });
    }

    const db = await getDb();
    const subs = await db.collection("subscriptions").find({
      studentId: { $in: records.map((r) => r.studentId) },
      status: "Active",
      ...(user.role === "coach" ? { coachId: user.id } : {}),
    }).toArray();

    for (const r of records) {
      const sub = subs.find(
        (s) => s.studentId === r.studentId && (user.role === "admin" || s.coachId === user.id)
      );
      if (!sub) {
        return res.status(400).json({ message: "Athlete is not assigned to your cohort." });
      }
      if (!["Present", "Absent"].includes(r.status)) {
        return res.status(400).json({ message: "Invalid attendance status." });
      }

      const rec = {
        studentId: r.studentId,
        date,
        time,
        drill,
        status: r.status,
        remarks: r.remarks || "",
        coachId: sub.coachId,
        sportId: sub.sportId,
      };

      await db.collection("attendance").updateOne(
        { studentId: r.studentId, date, coachId: sub.coachId },
        { $set: rec, $setOnInsert: { _id: id(), id: id() } },
        { upsert: true }
      );
    }

    const auditEntry = {
      _id: id(),
      id: id(),
      actor: user.name,
      action: "Attendance saved",
      date: new Date().toISOString(),
    };
    await db.collection("audit").insertOne(auditEntry);

    res.json({ message: "Attendance saved successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7. POST /evaluations
router.post("/evaluations", requireAuth(["coach", "admin"]), async (req, res) => {
  try {
    const data = req.body || {};
    const user = req.user;
    const db = await getDb();

    const sub = await db.collection("subscriptions").findOne({
      studentId: data.studentId,
      ...(user.role === "coach" ? { coachId: user.id } : {}),
    });

    if (!sub) {
      return res.status(400).json({ message: "Choose an athlete in your cohort." });
    }

    for (const k of ["fitness", "technique", "composure"]) {
      const val = Number(data[k]);
      if (!Number.isFinite(val) || val < 0 || val > 100) {
        return res.status(400).json({ message: "Scores must be between 0 and 100." });
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (!data.date || data.date > todayStr) {
      return res.status(400).json({ message: "Choose a valid evaluation date." });
    }

    const overall =
      data.override === "" || data.override == null
        ? Math.round((Number(data.fitness) + Number(data.technique) + Number(data.composure)) / 3)
        : Number(data.override);

    if (!Number.isFinite(overall) || overall < 0 || overall > 100) {
      return res.status(400).json({ message: "Overall score must be between 0 and 100." });
    }

    const evalId = id();
    const evalDoc = {
      ...data,
      _id: evalId,
      id: evalId,
      overall,
      coachId: user.id,
      createdAt: new Date().toISOString(),
    };

    const notifId = id();
    const notifDoc = {
      _id: notifId,
      id: notifId,
      userId: data.studentId,
      message: `Your coach added a new skill evaluation: ${overall}/100.`,
      date: new Date().toISOString(),
      read: false,
    };

    await Promise.all([
      db.collection("evaluations").insertOne(evalDoc),
      db.collection("notifications").insertOne(notifDoc),
    ]);

    res.status(201).json(cleanDoc(evalDoc));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. PATCH & DELETE /attendance/:id
router.patch("/attendance/:id", requireAuth(["coach", "admin"]), async (req, res) => {
  try {
    const recId = req.params.id;
    const values = req.body || {};
    const user = req.user;
    const db = await getDb();

    const existing = await db.collection("attendance").findOne({
      $or: [{ id: recId }, { _id: recId }],
    });

    if (!existing || (user.role === "coach" && existing.coachId !== user.id)) {
      return res.status(403).json({ message: "You cannot edit this record." });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (!values.date || values.date > todayStr) {
      return res.status(400).json({ message: "Choose a valid date." });
    }

    if (!values.time || !values.drill?.trim() || !["Present", "Absent"].includes(values.status)) {
      return res.status(400).json({ message: "Complete the session details." });
    }

    const update = {
      date: values.date,
      time: values.time,
      drill: values.drill,
      status: values.status,
      remarks: values.remarks || "",
    };

    await db.collection("attendance").updateOne(
      { $or: [{ id: recId }, { _id: recId }] },
      { $set: update }
    );

    await db.collection("audit").insertOne({
      _id: id(),
      id: id(),
      actor: user.name,
      action: "Updated attendance",
      date: new Date().toISOString(),
    });

    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/attendance/:id", requireAuth(["coach", "admin"]), async (req, res) => {
  try {
    const recId = req.params.id;
    const user = req.user;
    const db = await getDb();

    const existing = await db.collection("attendance").findOne({
      $or: [{ id: recId }, { _id: recId }],
    });

    if (!existing || (user.role === "coach" && existing.coachId !== user.id)) {
      return res.status(403).json({ message: "You cannot delete this record." });
    }

    await db.collection("attendance").deleteOne({ $or: [{ id: recId }, { _id: recId }] });
    await db.collection("audit").insertOne({
      _id: id(),
      id: id(),
      actor: user.name,
      action: "Deleted attendance",
      date: new Date().toISOString(),
    });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 9. PATCH & DELETE /evaluations/:id
router.patch("/evaluations/:id", requireAuth(["coach", "admin"]), async (req, res) => {
  try {
    const recId = req.params.id;
    const values = req.body || {};
    const user = req.user;
    const db = await getDb();

    const existing = await db.collection("evaluations").findOne({
      $or: [{ id: recId }, { _id: recId }],
    });

    if (!existing || (user.role === "coach" && existing.coachId !== user.id)) {
      return res.status(403).json({ message: "You cannot edit this record." });
    }

    for (const key of ["fitness", "technique", "composure", "overall"]) {
      const n = Number(values[key]);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return res.status(400).json({ message: "Scores must be from 0 to 100." });
      }
    }

    const update = {
      date: values.date,
      notes: values.notes,
      trainingNotes: values.trainingNotes,
      fitness: Number(values.fitness),
      technique: Number(values.technique),
      composure: Number(values.composure),
      overall: Number(values.overall),
    };

    await db.collection("evaluations").updateOne(
      { $or: [{ id: recId }, { _id: recId }] },
      { $set: update }
    );

    await db.collection("audit").insertOne({
      _id: id(),
      id: id(),
      actor: user.name,
      action: "Updated evaluations",
      date: new Date().toISOString(),
    });

    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/evaluations/:id", requireAuth(["coach", "admin"]), async (req, res) => {
  try {
    const recId = req.params.id;
    const user = req.user;
    const db = await getDb();

    const existing = await db.collection("evaluations").findOne({
      $or: [{ id: recId }, { _id: recId }],
    });

    if (!existing || (user.role === "coach" && existing.coachId !== user.id)) {
      return res.status(403).json({ message: "You cannot delete this record." });
    }

    await db.collection("evaluations").deleteOne({ $or: [{ id: recId }, { _id: recId }] });
    await db.collection("audit").insertOne({
      _id: id(),
      id: id(),
      actor: user.name,
      action: "Deleted evaluations",
      date: new Date().toISOString(),
    });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 10. Admin resource CRUD
router.post("/admin/:resource", requireAuth(["admin"]), async (req, res) => {
  try {
    const resource = req.params.resource;
    if (!["sports", "plans", "coaches", "users", "subscriptions"].includes(resource)) {
      return res.status(400).json({ message: "Unsupported resource." });
    }

    const clean = { ...req.body };
    const db = await getDb();
    const user = req.user;

    if (["sports", "plans", "coaches", "users"].includes(resource) && !clean.name?.trim()) {
      return res.status(400).json({ message: "Name is required." });
    }

    if (resource === "users") {
      if (!emailValid(clean.email)) return res.status(400).json({ message: "Enter a valid email." });
      if (clean.role !== "student") return res.status(400).json({ message: "Use coach provisioning for coach access." });
    }

    if (resource === "coaches" && !emailValid(clean.email || "")) {
      return res.status(400).json({ message: "Enter a valid coach email." });
    }

    if (resource === "plans" && (!(Number(clean.price) > 0) || !(Number(clean.months) >= 1))) {
      return res.status(400).json({ message: "Price and duration must be positive." });
    }

    if (resource === "sports" && !(Number(clean.capacity) >= 1 && Number(clean.capacity) <= 6)) {
      return res.status(400).json({ message: "Cohort capacity must be between 1 and 6." });
    }

    if (["users", "coaches"].includes(resource)) {
      if (clean.email) {
        const dup = await db.collection("users").findOne({
          email: clean.email.toLowerCase(),
          id: { $ne: clean.id },
        });
        if (dup) return res.status(400).json({ message: "Email is already in use." });
      }
      if (!clean.password || clean.password.length < 8) {
        return res.status(400).json({ message: "Provide an initial password of at least 8 characters." });
      }
      clean.passwordHash = hash(clean.password);
      delete clean.password;
    }

    const recId = clean.id || id();
    clean._id = recId;
    clean.id = recId;

    if (resource === "coaches") {
      const coachAccount = {
        _id: recId,
        id: recId,
        name: clean.name,
        email: clean.email,
        role: "coach",
        active: true,
        passwordHash: clean.passwordHash,
      };
      await db.collection("users").updateOne(
        { $or: [{ id: recId }, { _id: recId }] },
        { $set: coachAccount },
        { upsert: true }
      );
      delete clean.passwordHash;
    }

    await db.collection(resource).insertOne(clean);
    await db.collection("audit").insertOne({
      _id: id(),
      id: id(),
      actor: user.name,
      action: `Created ${resource}`,
      date: new Date().toISOString(),
    });

    res.status(201).json(cleanDoc(clean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/admin/:resource/:id", requireAuth(["admin"]), async (req, res) => {
  try {
    const { resource, id: recId } = req.params;
    if (!["sports", "plans", "coaches", "users", "subscriptions"].includes(resource)) {
      return res.status(400).json({ message: "Unsupported resource." });
    }

    const clean = { ...req.body };
    const db = await getDb();
    const user = req.user;

    if (clean.password) {
      if (clean.password.length < 8) {
        return res.status(400).json({ message: "Password must have at least 8 characters." });
      }
      clean.passwordHash = hash(clean.password);
      clean.passwordAliases = [];
      delete clean.password;
    }

    if (resource === "coaches" && clean.email) {
      const coachAccount = {
        name: clean.name,
        email: clean.email,
        ...(clean.passwordHash ? { passwordHash: clean.passwordHash, passwordAliases: [] } : {}),
      };
      await db.collection("users").updateOne(
        { $or: [{ id: recId }, { _id: recId }] },
        { $set: coachAccount }
      );
      delete clean.passwordHash;
    }

    delete clean._id;
    await db.collection(resource).updateOne(
      { $or: [{ id: recId }, { _id: recId }] },
      { $set: clean }
    );

    await db.collection("audit").insertOne({
      _id: id(),
      id: id(),
      actor: user.name,
      action: `Updated ${resource}`,
      date: new Date().toISOString(),
    });

    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/admin/:resource/:id", requireAuth(["admin"]), async (req, res) => {
  try {
    const { resource, id: recId } = req.params;
    const user = req.user;
    if (recId === user.id) {
      return res.status(400).json({ message: "You cannot remove your own account." });
    }

    const db = await getDb();
    const refs = {
      sports: "sportId",
      plans: "planId",
      coaches: "coachId",
      users: "studentId",
    };

    if (refs[resource]) {
      const activeLink = await db.collection("subscriptions").findOne({ [refs[resource]]: recId });
      if (activeLink) {
        return res.status(400).json({
          message: "This record has linked memberships. Edit or deactivate it instead.",
        });
      }
    }

    await db.collection(resource).deleteOne({ $or: [{ id: recId }, { _id: recId }] });
    if (resource === "coaches") {
      await db.collection("users").deleteOne({ $or: [{ id: recId }, { _id: recId }] });
    }

    await db.collection("audit").insertOne({
      _id: id(),
      id: id(),
      actor: user.name,
      action: `Deleted ${resource} record`,
      date: new Date().toISOString(),
    });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 11. PATCH /admin/users/:id/status
router.patch("/admin/users/:id/status", requireAuth(["admin"]), async (req, res) => {
  try {
    const recId = req.params.id;
    const { active } = req.body || {};
    const user = req.user;
    if (user.id === recId && !active) {
      return res.status(400).json({ message: "You cannot deactivate your own account." });
    }

    const db = await getDb();
    const target = await db.collection("users").findOne({ $or: [{ id: recId }, { _id: recId }] });
    if (!target) return res.status(404).json({ message: "Account not found." });

    await db.collection("users").updateOne(
      { $or: [{ id: recId }, { _id: recId }] },
      { $set: { active: !!active } }
    );

    await db.collection("audit").insertOne({
      _id: id(),
      id: id(),
      actor: user.name,
      action: `${active ? "Activated" : "Deactivated"} ${target.name}`,
      date: new Date().toISOString(),
    });

    res.json({ message: "Status updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 12. PATCH /profile
router.patch("/profile", requireAuth(), async (req, res) => {
  try {
    const user = req.user;
    const { name, phone, dateOfBirth, gender, address, specialty, bio, currentPassword, newPassword } =
      req.body || {};

    if (!name?.trim()) return res.status(400).json({ message: "Name is required." });
    if (phone && !/^[+\d\s()-]{7,20}$/.test(phone)) {
      return res.status(400).json({ message: "Enter a valid phone number." });
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dateOfBirth && dateOfBirth > todayStr) {
      return res.status(400).json({ message: "Date of birth cannot be in the future." });
    }

    const db = await getDb();
    const account = await db.collection("users").findOne({ $or: [{ id: user.id }, { _id: user.id }] });

    let newHash = null;
    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Use a password of at least 8 characters." });
      }
      const curHash = hash(currentPassword);
      const validHashes = [account.passwordHash, ...(account.passwordAliases || [])];
      if (!validHashes.includes(curHash)) {
        return res.status(400).json({ message: "Current password is incorrect." });
      }
      newHash = hash(newPassword);
    }

    const updateFields = {
      name: name.trim(),
      phone,
      dateOfBirth,
      gender,
      address,
      ...(newHash ? { passwordHash: newHash, passwordAliases: [] } : {}),
    };

    await db.collection("users").updateOne(
      { $or: [{ id: user.id }, { _id: user.id }] },
      { $set: updateFields }
    );

    if (user.role === "coach") {
      await db.collection("coaches").updateOne(
        { $or: [{ id: user.id }, { _id: user.id }] },
        { $set: { name: name.trim(), specialty, bio } }
      );
    }

    res.json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 13. PATCH /notifications
router.patch("/notifications", requireAuth(), async (req, res) => {
  try {
    const user = req.user;
    const db = await getDb();
    await db.collection("notifications").updateMany({ userId: user.id }, { $set: { read: true } });
    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 14. POST /contact
router.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name?.trim() || !emailValid(email) || !message?.trim() || message.trim().length < 10) {
      return res.status(400).json({
        message: "Enter your name, valid email, and a message of at least 10 characters.",
      });
    }

    const db = await getDb();
    const msgId = id();
    const msgDoc = {
      _id: msgId,
      id: msgId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      date: new Date().toISOString(),
      status: "New",
    };

    await db.collection("messages").insertOne(msgDoc);
    res.status(201).json({ message: "Message sent successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mount router under both /api and root
app.use("/api", router);
app.use(router);

export default app;
