import { demoAccounts, adminCodeHash } from "../data/accounts.js";
const sessionKey = "sportivo_session_v1";
const id = () => crypto.randomUUID();
export const hash = async (value) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
const safe = ({ passwordHash, passwordAliases, ...user }) => user;
const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const fail = (message) => {
  throw Error(message);
};
export class Academy {
  constructor(repo, sessionStorage) {
    this.repo = repo;
    this.sessions = sessionStorage;
  }
  async initialize() {
    await this.repo.transaction((db) => {
      if (!db.users.length) db.users = structuredClone(demoAccounts);
    });
    return this.snapshot();
  }
  session() {
    try {
      const s = JSON.parse(this.sessions.getItem(sessionKey));
      if (!s || s.expires < Date.now()) return null;
      const u = this.repo
        .read()
        .users.find((u) => u.id === s.userId && u.active);
      return u ? safe(u) : null;
    } catch {
      return null;
    }
  }
  require(roles) {
    const u = this.session();
    if (!u || !roles.includes(u.role))
      fail("You do not have permission for this action.");
    return u;
  }
  snapshot() {
    const db = this.repo.read(),
      u = this.session();
    const publicData = {
      sports: db.sports,
      plans: db.plans,
      coaches: db.coaches.map(({ email, passwordHash, ...c }) => c),
    };
    if (!u) return publicData;
    if (u.role === "admin")
      return {
        ...db,
        notifications: (db.notifications || []).filter(
          (n) => n.userId === u.id,
        ),
        users: db.users.map(safe),
      };
    const studentIds =
      u.role === "student"
        ? [u.id]
        : db.subscriptions
            .filter((s) => s.coachId === u.id)
            .map((s) => s.studentId);
    return {
      ...publicData,
      users: db.users
        .filter((x) => studentIds.includes(x.id) || x.id === u.id)
        .map(safe),
      subscriptions: db.subscriptions.filter(
        (s) =>
          studentIds.includes(s.studentId) &&
          (u.role === "student" || s.coachId === u.id),
      ),
      attendance: db.attendance.filter(
        (s) =>
          studentIds.includes(s.studentId) &&
          (u.role === "student" || s.coachId === u.id),
      ),
      evaluations: db.evaluations.filter(
        (s) =>
          studentIds.includes(s.studentId) &&
          (u.role === "student" || s.coachId === u.id),
      ),
      notifications: (db.notifications || []).filter((n) => n.userId === u.id),
      payments:
        u.role === "student"
          ? db.payments.filter((p) => p.studentId === u.id)
          : [],
      messages: [],
    };
  }
  async login({ email, password, role, code }) {
    const u = this.repo
      .read()
      .users.find(
        (x) =>
          x.email.toLowerCase() === email.trim().toLowerCase() &&
          x.role === role &&
          x.active,
      );
    if (
      !u ||
      ![u.passwordHash, ...(u.passwordAliases || [])].includes(
        await hash(password),
      )
    )
      fail("Email or password is incorrect for this portal.");
    if (role === "admin" && (await hash(code || "")) !== adminCodeHash)
      fail("The admin security code is incorrect.");
    this.sessions.setItem(
      sessionKey,
      JSON.stringify({ userId: u.id, expires: Date.now() + 8 * 3600000 }),
    );
    return safe(u);
  }
  logout() {
    this.sessions.removeItem(sessionKey);
  }
  async register({ name, email, password }) {
    if (!name?.trim() || !emailValid(email) || password.length < 8)
      fail(
        "Enter your name, a valid email, and a password of at least 8 characters.",
      );
    const passwordHash = await hash(password);
    const user = await this.repo.transaction((db) => {
      if (
        db.users.some(
          (u) => u.email.toLowerCase() === email.toLowerCase().trim(),
        )
      )
        fail("An account already exists for this email.");
      const u = {
        id: id(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: "student",
        active: true,
      };
      db.users.push(u);
      return safe(u);
    });
    this.sessions.setItem(
      sessionKey,
      JSON.stringify({ userId: user.id, expires: Date.now() + 8 * 3600000 }),
    );
    return user;
  }
  async resetPassword({ email, newPassword }) {
    if (!emailValid(email) || !newPassword || newPassword.length < 8)
      fail("Enter a valid athlete email and a new password of at least 8 characters.");
    const passwordHash = await hash(newPassword);
    return this.repo.transaction((db) => {
      const u = db.users.find(
        (x) =>
          x.email.toLowerCase() === email.trim().toLowerCase() &&
          x.role === "student" &&
          x.active,
      );
      if (!u) fail("No active athlete account found with this email.");
      u.passwordHash = passwordHash;
      u.passwordAliases = [];
      db.audit = db.audit || [];
      db.audit.push({
        id: id(),
        actor: u.name,
        action: "Athlete password reset",
        date: new Date().toISOString(),
      });
      return { success: true };
    });
  }
  async enroll({ sportId, coachId, planId }) {
    const u = this.require(["student"]);
    return this.repo.transaction((db) => {
      const sport = db.sports.find((x) => x.id === sportId),
        coach = db.coaches.find(
          (x) => x.id === coachId && x.sportId === sportId,
        ),
        plan = db.plans.find((x) => x.id === planId);
      if (!sport || !coach || !plan)
        fail("Select a valid programme, coach and plan.");
      const active = (s) =>
        s.status === "Active" &&
        s.endDate >= new Date().toISOString().slice(0, 10);
      if (
        db.subscriptions.some(
          (s) => s.studentId === u.id && s.sportId === sportId && active(s),
        )
      )
        fail("You already have an active membership for this sport.");
      if (
        db.subscriptions.filter((s) => s.coachId === coachId && active(s))
          .length >= sport.capacity
      )
        fail("This cohort is full. Please choose another coach.");
      const start = new Date(),
        end = new Date(start);
      end.setMonth(end.getMonth() + Number(plan.months));
      const sub = {
        id: id(),
        studentId: u.id,
        sportId,
        coachId,
        planId,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        status: "Active",
      };
      db.subscriptions.push(sub);
      const receipt = {
        id: id(),
        studentId: u.id,
        subscriptionId: sub.id,
        plan: plan.name,
        sport: sport.name,
        amount: Number(plan.price),
        date: sub.startDate,
        status: "Simulated",
      };
      db.payments.push(receipt);
      db.notifications ??= [];
      db.notifications.push({
        id: id(),
        userId: u.id,
        message: sport.name + " membership activated. Your receipt is ready.",
        date: new Date().toISOString(),
        read: false,
      });
      return receipt;
    });
  }
  async attendance({ date, time, drill, records }) {
    const u = this.require(["coach", "admin"]);
    if (
      !date ||
      date > new Date().toISOString().slice(0, 10) ||
      !time ||
      !drill?.trim() ||
      !records.length
    )
      fail(
        "Choose a valid session date, time, drill and at least one athlete.",
      );
    return this.repo.transaction((db) => {
      for (const r of records) {
        const sub = db.subscriptions.find(
          (s) =>
            s.studentId === r.studentId &&
            (u.role === "admin" || s.coachId === u.id) &&
            s.status === "Active",
        );
        if (!sub) fail("Athlete is not assigned to your cohort.");
        if (!["Present", "Absent"].includes(r.status))
          fail("Invalid attendance status.");
        const record = {
          ...r,
          date,
          time,
          drill,
          coachId: sub.coachId,
          sportId: sub.sportId,
        };
        const old = db.attendance.find(
          (x) =>
            x.studentId === r.studentId &&
            x.date === date &&
            x.coachId === sub.coachId,
        );
        if (old) Object.assign(old, record);
        else db.attendance.push({ ...record, id: id() });
      }
      db.audit.push({
        id: id(),
        actor: u.name,
        action: "Attendance saved",
        date: new Date().toISOString(),
      });
    });
  }
  async evaluate(data) {
    const u = this.require(["coach", "admin"]);
    return this.repo.transaction((db) => {
      if (
        !db.subscriptions.some(
          (s) =>
            s.studentId === data.studentId &&
            (u.role === "admin" || s.coachId === u.id),
        )
      )
        fail("Choose an athlete in your cohort.");
      for (const k of ["fitness", "technique", "composure"])
        if (
          !Number.isFinite(Number(data[k])) ||
          Number(data[k]) < 0 ||
          Number(data[k]) > 100
        )
          fail("Scores must be between 0 and 100.");
      if (!data.date || data.date > new Date().toISOString().slice(0, 10))
        fail("Choose a valid evaluation date.");
      const overall =
        data.override === "" || data.override == null
          ? Math.round((+data.fitness + +data.technique + +data.composure) / 3)
          : +data.override;
      if (!Number.isFinite(overall) || overall < 0 || overall > 100)
        fail("Overall score must be between 0 and 100.");
      db.evaluations.push({ ...data, id: id(), overall, coachId: u.id });
      db.notifications ??= [];
      db.notifications.push({
        id: id(),
        userId: data.studentId,
        message:
          "Your coach added a new skill evaluation: " + overall + "/100.",
        date: new Date().toISOString(),
        read: false,
      });
    });
  }
  async save(collection, record) {
    const u = this.require(["admin"]);
    if (
      !["sports", "plans", "coaches", "users", "subscriptions"].includes(
        collection,
      )
    )
      fail("Unsupported resource.");
    const clean = { ...record };
    if (
      ["sports", "plans", "coaches", "users"].includes(collection) &&
      !clean.name?.trim()
    )
      fail("Name is required.");
    if (collection === "users") {
      if (!emailValid(clean.email)) fail("Enter a valid email.");
      if (clean.role !== "student")
        fail("Use coach provisioning for coach access.");
    }
    if (collection === "coaches" && !emailValid(clean.email || ""))
      fail("Enter a valid coach email.");
    if (
      collection === "plans" &&
      (!(+clean.price > 0) || !(+clean.months >= 1))
    )
      fail("Price and duration must be positive.");
    if (
      collection === "sports" &&
      !(+clean.capacity >= 1 && +clean.capacity <= 6)
    )
      fail("Cohort capacity must be between 1 and 6.");
    if (clean.password) {
      if (clean.password.length < 8)
        fail("Password must have at least 8 characters.");
      clean.passwordHash = await hash(clean.password);
      clean.passwordAliases = [];
    }
    delete clean.password;
    return this.repo.transaction((db) => {
      if (
        ["users", "coaches"].includes(collection) &&
        clean.email &&
        db.users.some(
          (x) =>
            x.email.toLowerCase() === clean.email.toLowerCase() &&
            x.id !== clean.id,
        )
      )
        fail("Email is already in use.");
      if (
        collection === "coaches" &&
        !db.sports.some((s) => s.id === clean.sportId)
      )
        fail("Choose a valid sport.");
      if (collection === "subscriptions") {
        if (
          !db.users.some(
            (s) => s.id === clean.studentId && s.role === "student",
          ) ||
          !db.plans.some((s) => s.id === clean.planId) ||
          !db.coaches.some(
            (s) => s.id === clean.coachId && s.sportId === clean.sportId,
          )
        )
          fail("Choose a valid athlete, plan, sport and coach.");
        if (
          !clean.startDate ||
          !clean.endDate ||
          !["Active", "Expired", "Cancelled"].includes(clean.status)
        )
          fail("Complete membership dates and status.");
        if (clean.status === "Active") {
          const other = db.subscriptions.filter(
            (s) =>
              s.id !== clean.id &&
              s.status === "Active" &&
              s.endDate >= new Date().toISOString().slice(0, 10),
          );
          if (
            other.some(
              (s) =>
                s.studentId === clean.studentId && s.sportId === clean.sportId,
            )
          )
            fail("Athlete already has an active membership for this sport.");
          const sport = db.sports.find((s) => s.id === clean.sportId);
          if (
            other.filter((s) => s.coachId === clean.coachId).length >=
            Number(sport?.capacity || 6)
          )
            fail("Cohort is full.");
        }
        if (clean.endDate < clean.startDate)
          fail("End date must follow start date.");
      }
      let old = db[collection].find((x) => x.id === clean.id);
      if (old) Object.assign(old, clean);
      else {
        if (["users", "coaches"].includes(collection) && !clean.passwordHash)
          fail("Provide an initial password.");
        clean.id = clean.id || id();
        db[collection].push(clean);
      }
      if (collection === "coaches") {
        let account = db.users.find((x) => x.id === clean.id);
        const details = {
          id: clean.id,
          name: clean.name,
          email: clean.email,
          role: "coach",
          active: true,
          ...(clean.passwordHash
            ? { passwordHash: clean.passwordHash, passwordAliases: [] }
            : {}),
        };
        if (account) Object.assign(account, details);
        else db.users.push(details);
        delete clean.passwordHash;
        const c = db.coaches.find((x) => x.id === clean.id);
        delete c.passwordHash;
        delete c.passwordAliases;
      }
      db.audit.push({
        id: id(),
        actor: u.name,
        action: `${old ? "Updated" : "Created"} ${collection}`,
        date: new Date().toISOString(),
      });
    });
  }
  async remove(collection, recordId) {
    const u = this.require(["admin"]);
    return this.repo.transaction((db) => {
      if (
        ![
          "sports",
          "plans",
          "coaches",
          "users",
          "subscriptions",
          "attendance",
          "evaluations",
          "messages",
        ].includes(collection)
      )
        fail("This record cannot be deleted.");
      if (recordId === u.id) fail("You cannot remove your own account.");
      const refs = {
        sports: "sportId",
        plans: "planId",
        coaches: "coachId",
        users: "studentId",
      };
      if (
        refs[collection] &&
        db.subscriptions.some((s) => s[refs[collection]] === recordId)
      )
        fail(
          "This record has linked memberships. Edit or deactivate it instead.",
        );
      db[collection] = db[collection].filter((x) => x.id !== recordId);
      if (collection === "coaches")
        db.users = db.users.filter((x) => x.id !== recordId);
      db.audit.push({
        id: id(),
        actor: u.name,
        action: `Deleted ${collection} record`,
        date: new Date().toISOString(),
      });
    });
  }
  async updateTraining(collection, recordId, values) {
    const u = this.require(["coach", "admin"]);
    if (!["attendance", "evaluations"].includes(collection))
      fail("Invalid resource.");
    return this.repo.transaction((db) => {
      const row = db[collection].find((x) => x.id === recordId);
      if (!row || (u.role === "coach" && row.coachId !== u.id))
        fail("You cannot edit this record.");
      if (values === null) {
        db[collection] = db[collection].filter((x) => x.id !== recordId);
      } else {
        if (!values.date || values.date > new Date().toISOString().slice(0, 10))
          fail("Choose a valid date.");
        if (collection === "attendance") {
          if (
            !values.time ||
            !values.drill?.trim() ||
            !["Present", "Absent"].includes(values.status)
          )
            fail("Complete the session details.");
          Object.assign(row, {
            date: values.date,
            time: values.time,
            drill: values.drill,
            status: values.status,
            remarks: values.remarks || "",
          });
        } else {
          for (const key of ["fitness", "technique", "composure", "overall"]) {
            const n = Number(values[key]);
            if (!Number.isFinite(n) || n < 0 || n > 100)
              fail("Scores must be from 0 to 100.");
          }
          Object.assign(row, {
            date: values.date,
            notes: values.notes,
            ...Object.fromEntries(
              ["fitness", "technique", "composure", "overall"].map((k) => [
                k,
                Number(values[k]),
              ]),
            ),
          });
        }
      }
      db.audit.push({
        id: id(),
        actor: u.name,
        action: (values ? "Updated " : "Deleted ") + collection,
        date: new Date().toISOString(),
      });
    });
  }
  async toggleUser(userId, active) {
    const u = this.require(["admin"]);
    if (u.id === userId && !active)
      fail("You cannot deactivate your own account.");
    return this.repo.transaction((db) => {
      const target = db.users.find((x) => x.id === userId);
      if (!target) fail("Account not found.");
      target.active = active;
      db.audit.push({
        id: id(),
        actor: u.name,
        action: (active ? "Activated" : "Deactivated") + " " + target.name,
        date: new Date().toISOString(),
      });
    });
  }
  async readNotifications() {
    const u = this.require(["student", "coach", "admin"]);
    return this.repo.transaction((db) =>
      (db.notifications || []).forEach((n) => {
        if (n.userId === u.id) n.read = true;
      }),
    );
  }
  async profile(values) {
    const u = this.require(["student", "coach", "admin"]);
    const {
      name,
      phone,
      dateOfBirth,
      gender,
      address,
      specialty,
      bio,
      currentPassword,
      newPassword,
    } = values;
    if (!name?.trim()) fail("Name is required.");
    if (phone && !/^[+\d\s()-]{7,20}$/.test(phone))
      fail("Enter a valid phone number.");
    if (dateOfBirth && dateOfBirth > new Date().toISOString().slice(0, 10))
      fail("Date of birth cannot be in the future.");
    let passwordHash;
    if (newPassword) {
      if (newPassword.length < 8)
        fail("Use a password of at least 8 characters.");
      const account = this.repo.read().users.find((x) => x.id === u.id);
      if (
        ![account.passwordHash, ...(account.passwordAliases || [])].includes(
          await hash(currentPassword),
        )
      )
        fail("Current password is incorrect.");
      passwordHash = await hash(newPassword);
    }
    return this.repo.transaction((db) => {
      const account = db.users.find((x) => x.id === u.id);
      Object.assign(account, {
        name: name.trim(),
        phone,
        dateOfBirth,
        gender,
        address,
      });
      if (passwordHash) {
        account.passwordHash = passwordHash;
        account.passwordAliases = [];
      }
      const c = db.coaches.find((x) => x.id === u.id);
      if (c) Object.assign(c, { name: name.trim(), specialty, bio });
    });
  }
  async contact({ name, email, message }) {
    if (!name?.trim() || !emailValid(email) || message?.trim().length < 10)
      fail(
        "Enter your name, valid email, and a message of at least 10 characters.",
      );
    return this.repo.transaction((db) =>
      db.messages.push({
        id: id(),
        name,
        email,
        message,
        date: new Date().toISOString(),
        status: "New",
      }),
    );
  }
}
