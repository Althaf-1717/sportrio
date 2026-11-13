import test from "node:test";
import assert from "node:assert/strict";
import app from "../server/app.js";
import vercelHandler from "../api/index.js";

test("Vercel entrypoint exports express app", () => {
  assert.equal(typeof vercelHandler, "function");
  assert.equal(typeof app, "function");
});

test("Express app has required API routes registered", () => {
  const router = app.router || app._router;
  assert.ok(router && router.stack, "Router must have stack");

  const routes = [];
  const printRoutes = (stack) => {
    stack.forEach((layer) => {
      if (layer.route) {
        routes.push(layer.route.path);
      } else if (layer.handle?.stack) {
        printRoutes(layer.handle.stack);
      }
    });
  };

  printRoutes(router.stack);
  assert.ok(routes.includes("/bootstrap"), "Must include /bootstrap");
  assert.ok(routes.includes("/auth/login"), "Must include /auth/login");
  assert.ok(routes.includes("/auth/register"), "Must include /auth/register");
  assert.ok(routes.includes("/enrollments"), "Must include /enrollments");
  assert.ok(routes.includes("/attendance"), "Must include /attendance");
  assert.ok(routes.includes("/evaluations"), "Must include /evaluations");
  assert.ok(routes.includes("/contact"), "Must include /contact");
});
