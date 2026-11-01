import { HttpRepository } from "./repository";
// A drop-in service adapter. UI components never access localStorage or MongoDB.
// Server must implement the routes in docs/API_CONTRACT.md with cookie sessions.
export class HttpAcademy {
  constructor(baseUrl) {
    this.http = new HttpRepository(baseUrl);
    this.user = null;
    this.data = null;
  }
  async sync() {
    const result = await this.http.request("/bootstrap");
    this.user = result.user;
    this.data = result.data;
    return this.data;
  }
  async initialize() {
    return this.sync();
  }
  snapshot() {
    return this.data;
  }
  session() {
    return this.user;
  }
  async mutate(path, method, body) {
    const result = await this.http.request(path, {
      method,
      body: JSON.stringify(body),
    });
    await this.sync();
    return result;
  }
  async login(values) {
    const result = await this.mutate("/auth/login", "POST", values);
    return result.user;
  }
  async logout() {
    await this.mutate("/auth/logout", "POST", {});
  }
  async register(values) {
    const result = await this.mutate("/auth/register", "POST", values);
    return result.user;
  }
  enroll(values) {
    return this.mutate("/enrollments", "POST", values);
  }
  attendance(values) {
    return this.mutate("/attendance", "PUT", values);
  }
  evaluate(values) {
    return this.mutate("/evaluations", "POST", values);
  }
  save(resource, values) {
    return this.mutate(
      "/admin/" +
        resource +
        (values.id ? "/" + encodeURIComponent(values.id) : ""),
      values.id ? "PATCH" : "POST",
      values,
    );
  }
  remove(resource, id) {
    return this.mutate(
      "/admin/" + resource + "/" + encodeURIComponent(id),
      "DELETE",
      {},
    );
  }
  updateTraining(collection, id, values) {
    return this.mutate(
      "/" + collection + "/" + encodeURIComponent(id),
      values ? "PATCH" : "DELETE",
      values || {},
    );
  }
  profile(values) {
    return this.mutate("/profile", "PATCH", values);
  }
  toggleUser(id, active) {
    return this.mutate(
      "/admin/users/" + encodeURIComponent(id) + "/status",
      "PATCH",
      { active },
    );
  }
  readNotifications() {
    return this.mutate("/notifications", "PATCH", { markAll: true });
  }
  contact(values) {
    return this.mutate("/contact", "POST", values);
  }
}
