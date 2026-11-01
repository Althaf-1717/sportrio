import { createServer } from "vite";
import fs from "node:fs/promises";
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
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const { default: React } = await import("react");
const { renderToString } = await import("react-dom/server");
const { MemoryRouter } = await import("react-router-dom");
const { default: App } = await vite.ssrLoadModule("/src/App.jsx");
const { api, AppContext } = await vite.ssrLoadModule(
  "/src/context/AppContext.jsx",
);
await api.initialize();
const routes = [
  "/",
  "/sports",
  "/sports/cricket",
  "/sports/football",
  "/sports/basketball",
  "/coaches",
  "/coaches/arjun-menon",
  "/membership",
  "/membership/basic",
  "/about",
  "/contact",
  "/login",
  "/coach",
  "/admin",
  "/register",
  "/unknown",
];
let count = 0;
const originalError = console.error;
console.error = (message, ...args) => {
  if (!String(message).includes("useLayoutEffect"))
    originalError(message, ...args);
};
function render(path) {
  const element = React.createElement(
    MemoryRouter,
    { initialEntries: [path] },
    React.createElement(
      AppContext.Provider,
      {
        value: {
          data: api.snapshot(),
          user: api.session(),
          run: async (fn) => fn(),
          refresh: () => {},
        },
      },
      React.createElement(App),
    ),
  );
  const html = renderToString(element);
  if (!html.length) throw Error("Empty route " + path);
  if (html.includes("Something went wrong"))
    throw Error("Render failed " + path);
  count++;
  return html;
}
for (const path of routes) render(path);
const portals = {
  student: [
    "",
    "sports",
    "coaches",
    "membership",
    "enroll",
    "enrollment",
    "attendance",
    "progress",
    "payments",
    "profile",
  ],
  coach: ["", "students", "attendance", "progress", "profile"],
  admin: [
    "",
    "students",
    "coaches",
    "sports",
    "membership-plans",
    "enrollments",
    "attendance",
    "progress",
    "payments",
    "users",
    "messages",
    "settings",
  ],
};
for (const [role, pages] of Object.entries(portals)) {
  await api.login({
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
  for (const page of pages) {
    const html = render("/dashboard/" + role + (page ? "/" + page : ""));
    if (!page && process.argv.includes("--snapshots"))
      await fs.writeFile(
        "public/qa-" + role + ".html",
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/styles.css"><title>Workspace QA</title></head><body>' +
          html +
          "</body></html>",
      );
  }
  render("/students/student1");
  api.logout();
}
console.error = originalError;
console.log("Rendered " + count + " routes across public pages and all roles.");
await vite.close();
