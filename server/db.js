import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { sports, plans, coaches, makeSeed } from "../src/data/seed.js";
import { demoAccounts } from "../src/data/accounts.js";

dotenv.config();

const DEFAULT_DB_NAME = "sportrio";

let cachedClient = null;
let cachedDb = null;

export async function getDb() {
  if (cachedDb) return cachedDb;

  let uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined. Please set MONGODB_URI in your environment or .env file."
    );
  }

  const dbName = process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME;

  if (!cachedClient) {
    cachedClient = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    await cachedClient.connect();
    console.log(`[MongoDB] Connected successfully to cluster. Using database: "${dbName}"`);
  }

  cachedDb = cachedClient.db(dbName);
  await ensureSeeded(cachedDb);
  return cachedDb;
}

export async function ensureSeeded(db) {
  try {
    const usersCount = await db.collection("users").countDocuments();
    if (usersCount === 0) {
      console.log("[MongoDB] Database is empty. Seeding initial data...");
      const seed = makeSeed();

      // Seed users
      await db.collection("users").insertMany(
        demoAccounts.map((u) => ({
          ...u,
          _id: u.id,
          createdAt: new Date().toISOString(),
        }))
      );

      // Seed sports
      if (sports.length) {
        await db.collection("sports").insertMany(
          sports.map((s) => ({ ...s, _id: s.id }))
        );
      }

      // Seed plans
      if (plans.length) {
        await db.collection("plans").insertMany(
          plans.map((p) => ({ ...p, _id: p.id }))
        );
      }

      // Seed coaches
      if (coaches.length) {
        await db.collection("coaches").insertMany(
          coaches.map((c) => ({ ...c, _id: c.id }))
        );
      }

      // Seed subscriptions
      if (seed.subscriptions?.length) {
        await db.collection("subscriptions").insertMany(
          seed.subscriptions.map((s) => ({ ...s, _id: s.id }))
        );
      }

      // Seed payments
      if (seed.payments?.length) {
        await db.collection("payments").insertMany(
          seed.payments.map((p) => ({ ...p, _id: p.id }))
        );
      }

      // Seed attendance
      if (seed.attendance?.length) {
        await db.collection("attendance").insertMany(
          seed.attendance.map((a) => ({ ...a, _id: a.id }))
        );
      }

      // Seed evaluations
      if (seed.evaluations?.length) {
        await db.collection("evaluations").insertMany(
          seed.evaluations.map((e) => ({ ...e, _id: e.id }))
        );
      }

      // Indexes
      await db.collection("users").createIndex({ email: 1 }, { unique: true });
      await db.collection("subscriptions").createIndex({ studentId: 1, sportId: 1 });
      await db.collection("attendance").createIndex({ studentId: 1, coachId: 1, date: 1 });

      console.log("[MongoDB] Initial seeding completed successfully.");
    }
  } catch (err) {
    console.error("[MongoDB] Seeding check error:", err.message);
  }
}
