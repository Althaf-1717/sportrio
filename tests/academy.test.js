import test from "node:test";
import assert from "node:assert/strict";
import { LocalRepository, DB_KEY } from "../src/services/repository.js";
import { Academy } from "../src/services/academy.js";
class MemoryStorage {
  data = new Map();
  getItem(k) {
    return this.data.get(k) || null;
  }
  setItem(k, v) {
    this.data.set(k, v);
  }
  removeItem(k) {
    this.data.delete(k);
  }
}
async function setup() {
  const storage = new MemoryStorage(),
    session = new MemoryStorage(),
    repo = new LocalRepository(storage),
    api = new Academy(repo, session);
  await api.initialize();
  return { api, repo, storage, session };
}
const sign = (api, role) =>
  api.login({
    role,
    email:
      role === "admin" ? "althafshaik1717@gmail.com" : role + "1@gmail.com",
    password:
      role === "admin"
        ? "Althaf@7727"
        : role === "student"
          ? "Student@Sportivo2026"
          : "Coach@Sportivo2026",
    code: role === "admin" ? "1234567" : undefined,
  });
test("documented accounts, role isolation, security code, logout and expiry", async () => {
  const { api, session } = await setup();
  for (const role of ["student", "coach", "admin"]) {
    assert.equal((await sign(api, role)).role, role);
    assert.equal(api.session().role, role);
    api.logout();
    assert.equal(api.session(), null);
  }
  await assert.rejects(() =>
    api.login({
      email: "student1@gmail.com",
      password: "Student@Sportivo2026",
      role: "admin",
      code: "1234567",
    }),
  );
  await assert.rejects(() =>
    api.login({
      email: "althafshaik1717@gmail.com",
      password: "Althaf@7727",
      role: "admin",
      code: "wrong",
    }),
  );
  await sign(api, "student");
  session.setItem(
    "sportivo_session_v1",
    JSON.stringify({ userId: "student1", expires: 1 }),
  );
  assert.equal(api.session(), null);
});
test("registration, duplicate prevention and atomic enrolment / payment", async () => {
  const { api } = await setup();
  await api.register({
    name: "Test Athlete",
    email: "new@example.com",
    password: "TestPassword1",
  });
  await assert.rejects(() =>
    api.register({
      name: "Duplicate",
      email: "NEW@example.com",
      password: "TestPassword1",
    }),
  );
  assert.equal(api.snapshot().subscriptions.length, 0);
  await assert.rejects(() =>
    api.enroll({ sportId: "football", coachId: "coach1", planId: "basic" }),
  );
  assert.equal(api.snapshot().payments.length, 0);
  const receipt = await api.enroll({
    sportId: "cricket",
    coachId: "coach1",
    planId: "basic",
  });
  assert.equal(receipt.amount, 1499);
  assert.equal(api.snapshot().subscriptions.length, 1);
  assert.equal(api.snapshot().notifications.length, 1);
  await assert.rejects(() =>
    api.enroll({ sportId: "cricket", coachId: "coach1", planId: "basic" }),
  );
  assert.equal(api.snapshot().payments.length, 1);
  await api.readNotifications();
  assert.equal(api.snapshot().notifications[0].read, true);
});
test("cohort cap rejects seventh enrolment", async () => {
  const { api } = await setup();
  for (let i = 0; i < 5; i++) {
    await api.register({
      name: "Athlete " + i,
      email: `cohort${i}@example.com`,
      password: "TestPassword1",
    });
    await api.enroll({
      sportId: "cricket",
      coachId: "coach1",
      planId: "basic",
    });
  }
  await api.register({
    name: "Seventh",
    email: "seventh@example.com",
    password: "TestPassword1",
  });
  await assert.rejects(
    () =>
      api.enroll({ sportId: "cricket", coachId: "coach1", planId: "basic" }),
    /full/,
  );
});
test("coach attendance upsert, validation and evaluation visibility", async () => {
  const { api } = await setup();
  await sign(api, "coach");
  const record = {
    date: "2026-01-01",
    time: "16:30",
    drill: "Batting",
    records: [{ studentId: "student1", status: "Present" }],
  };
  await api.attendance(record);
  await api.attendance({
    ...record,
    records: [{ studentId: "student1", status: "Absent" }],
  });
  assert.equal(
    api.snapshot().attendance.filter((x) => x.date === "2026-01-01").length,
    1,
  );
  assert.equal(
    api.snapshot().attendance.find((x) => x.date === "2026-01-01").status,
    "Absent",
  );
  await assert.rejects(() =>
    api.attendance({
      ...record,
      records: [{ studentId: "unassigned", status: "Present" }],
    }),
  );
  await assert.rejects(() =>
    api.evaluate({
      studentId: "student1",
      date: "2026-01-01",
      fitness: 101,
      technique: 80,
      composure: 70,
    }),
  );
  await api.evaluate({
    studentId: "student1",
    date: "2026-01-01",
    fitness: 90,
    technique: 80,
    composure: 70,
    notes: "Good",
  });
  await sign(api, "student");
  assert.equal(api.snapshot().evaluations.at(-1).overall, 80);
  await assert.rejects(() => api.save("sports", { name: "Other" }));
  assert.equal(api.snapshot().users.length, 1);
  assert.equal(JSON.stringify(api.snapshot()).includes("passwordHash"), false);
});
test("admin CRUD persists and protects linked records and own account", async () => {
  const { api, repo } = await setup();
  await sign(api, "admin");
  await api.save("plans", {
    name: "Test Plan",
    price: 200,
    months: 1,
    features: "Training",
  });
  let p = api.snapshot().plans.find((p) => p.name === "Test Plan");
  await api.save("plans", { ...p, price: 300 });
  assert.equal(repo.read().plans.find((x) => x.id === p.id).price, 300);
  await api.remove("plans", p.id);
  assert(!api.snapshot().plans.some((x) => x.id === p.id));
  await assert.rejects(() => api.remove("sports", "cricket"), /linked/);
  await assert.rejects(() => api.toggleUser("admin", false), /own/);
  await api.toggleUser("student1", false);
  await assert.rejects(() => sign(api, "student"));
});
test("profile password change invalidates old password, safe exports", async () => {
  const { api } = await setup();
  await sign(api, "student");
  await assert.rejects(() =>
    api.profile({
      name: "Test",
      currentPassword: "wrong",
      newPassword: "ChangedPassword1",
    }),
  );
  await api.profile({
    name: "Updated Athlete",
    phone: "+91 9999999999",
    currentPassword: "Student@Sportivo2026",
    newPassword: "ChangedPassword1",
  });
  api.logout();
  await assert.rejects(() => sign(api, "student"));
  await api.login({
    email: "student1@gmail.com",
    password: "ChangedPassword1",
    role: "student",
  });
  assert.equal(api.session().name, "Updated Athlete");
  assert.equal(api.session().passwordHash, undefined);
  assert.equal(api.session().passwordAliases, undefined);
});
test("storage corruption, quota failure and enquiry validation report errors", async () => {
  const { api, storage, repo } = await setup();
  await assert.rejects(() =>
    api.contact({ name: "Test", email: "bad", message: "hello" }),
  );
  await api.contact({
    name: "Test",
    email: "a@b.com",
    message: "Please share the training schedule.",
  });
  assert.equal(repo.read().messages.length, 1);
  storage.setItem(DB_KEY, "bad-json");
  assert.throws(() => repo.read(), /could not be read/);
  const bad = new LocalRepository({
    getItem: () => null,
    setItem: () => {
      throw Error("Quota");
    },
  });
  assert.throws(() => bad.write({}), /Unable to save/);
});

test("training updates validate before writing and deletion honors ownership", async () => {
  const { api } = await setup();
  await sign(api, "coach");
  const first = api.snapshot().attendance[0];
  await api.updateTraining("attendance", first.id, {
    date: "2026-01-03",
    time: "17:00",
    drill: "Footwork",
    status: "Present",
    remarks: "Improved",
  });
  assert.equal(
    api.snapshot().attendance.find((a) => a.id === first.id).drill,
    "Footwork",
  );
  const ev = api.snapshot().evaluations[0];
  await assert.rejects(() =>
    api.updateTraining("evaluations", ev.id, {
      date: "2026-01-03",
      fitness: 110,
      technique: 20,
      composure: 30,
      overall: 40,
    }),
  );
  assert.equal(
    api.snapshot().evaluations.find((e) => e.id === ev.id).fitness,
    65,
  );
  await api.updateTraining("evaluations", ev.id, null);
  assert(!api.snapshot().evaluations.some((e) => e.id === ev.id));
  await sign(api, "student");
  await assert.rejects(() => api.updateTraining("attendance", first.id, null));
});
test("concurrent mutations retain both enquiries", async () => {
  const { api, repo } = await setup();
  await Promise.all([
    api.contact({
      name: "First",
      email: "first@example.com",
      message: "I would like to join cricket.",
    }),
    api.contact({
      name: "Second",
      email: "second@example.com",
      message: "I would like to join football.",
    }),
  ]);
  assert.equal(repo.read().messages.length, 2);
});
test("coach provisioning produces valid credentials without exposing hashes", async () => {
  const { api } = await setup();
  await sign(api, "admin");
  await api.save("coaches", {
    name: "New Coach",
    email: "newcoach@example.com",
    password: "NewCoachPassword1",
    sportId: "football",
    experience: 3,
    specialty: "Youth development",
  });
  const c = api
    .snapshot()
    .coaches.find((c) => c.email === "newcoach@example.com");
  assert(c);
  assert.equal(c.passwordHash, undefined);
  await api.login({
    email: "newcoach@example.com",
    password: "NewCoachPassword1",
    role: "coach",
  });
  assert.equal(api.snapshot().subscriptions.length, 0);
  assert.equal(api.snapshot().attendance.length, 0);
});
