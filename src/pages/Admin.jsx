import React, { useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Plus, Download, Pencil, Trash2 } from "lucide-react";
import { useApp, api } from "../context/AppContext";
import {
  Intro,
  Field,
  DataTable,
  Modal,
  exportCSV,
  download,
  Empty,
  ButtonLink,
  money,
} from "../components/UI";
const schemas = {
  sports: [
    ["name", "Programme name"],
    ["tag", "Tagline"],
    ["description", "Description"],
    ["skills", "Training skills (comma separated)"],
    ["schedule", "Schedule"],
    ["capacity", "Cohort capacity", "number"],
  ],
  plans: [
    ["name", "Plan name"],
    ["price", "Price in INR", "number"],
    ["months", "Duration in months", "number"],
    ["description", "Description"],
    ["features", "Features (comma separated)"],
  ],
  coaches: [
    ["name", "Coach name"],
    ["email", "Login email", "email"],
    ["password", "Initial / new password", "password"],
    ["sportId", "Sport", "sports"],
    ["specialty", "Specialty"],
    ["experience", "Experience in years", "number"],
    ["bio", "Biography"],
  ],
  users: [
    ["name", "Athlete name"],
    ["email", "Email address", "email"],
    ["password", "Initial / new password", "password"],
    ["phone", "Phone"],
  ],
  subscriptions: [
    ["studentId", "Athlete", "students"],
    ["sportId", "Sport", "sports"],
    ["coachId", "Coach", "coaches"],
    ["planId", "Membership plan", "plans"],
    ["startDate", "Start date", "date"],
    ["endDate", "End date", "date"],
    ["status", "Status", "statuses"],
  ],
};
export function AdminResource({ resource }) {
  const { data, run } = useApp(),
    [query, setQuery] = useState(""),
    [edit, setEdit] = useState(null),
    [del, setDel] = useState(null),
    [busy, setBusy] = useState(false);
  const col =
    {
      students: "users",
      "membership-plans": "plans",
      enrollments: "subscriptions",
    }[resource] || resource;
  const rows = (data[col] || [])
    .filter((x) => resource !== "students" || x.role === "student")
    .filter((x) =>
      JSON.stringify(x).toLowerCase().includes(query.toLowerCase()),
    );
  const lookup = (c, id) => data[c]?.find((x) => x.id === id)?.name || id;
  const columns = {
    sports: [
      ["name", "Programme"],
      ["schedule", "Schedule"],
      ["capacity", "Cohort limit"],
    ],
    plans: [
      ["name", "Plan"],
      ["price", "Price"],
      ["months", "Months"],
    ],
    coaches: [
      ["name", "Coach"],
      ["sportId", "Sport"],
      ["specialty", "Specialty"],
      ["experience", "Years"],
    ],
    users: [
      ["name", "Name"],
      ["email", "Email"],
      ["role", "Role"],
      ["active", "Status"],
    ],
    subscriptions: [
      ["studentId", "Athlete"],
      ["sportId", "Sport"],
      ["coachId", "Coach"],
      ["planId", "Plan"],
      ["endDate", "Expires"],
      ["status", "Status"],
    ],
    messages: [
      ["name", "Name"],
      ["email", "Email"],
      ["message", "Enquiry"],
      ["date", "Date"],
    ],
    audit: [
      ["actor", "User"],
      ["action", "Action"],
      ["date", "Date"],
    ],
  };
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(e.target));
    try {
      await run(
        () =>
          api.save(col, {
            ...edit,
            ...values,
            ...(col === "users"
              ? { role: "student", active: edit.active ?? true }
              : {}),
          }),
        "Record saved.",
      );
      setEdit(null);
    } catch {
    } finally {
      setBusy(false);
    }
  }
  const defs = (columns[col] || []).map(([key, label]) => ({
    key,
    label,
    render: (r) =>
      key === "price" ? (
        money(r[key])
      ) : key === "active" ? (
        <span className={"badge " + (!r.active ? "warning" : "")}>
          {r.active ? "Active" : "Inactive"}
        </span>
      ) : key === "studentId" ? (
        <Link className="small-link" to={"/students/" + r.studentId}>
          {lookup("users", r.studentId)}
        </Link>
      ) : key === "sportId" ? (
        lookup("sports", r[key])
      ) : key === "coachId" ? (
        lookup("coaches", r[key])
      ) : key === "planId" ? (
        lookup("plans", r[key])
      ) : (
        String(r[key] ?? "—")
      ),
  }));
  defs.push({
    key: "actions",
    label: "Actions",
    render: (r) => (
      <div className="row-actions">
        {schemas[col] && (col !== "users" || r.role === "student") && (
          <button
            aria-label={"Edit " + (r.name || "record")}
            onClick={() => setEdit({ ...r })}
          >
            <Pencil size={16} />
          </button>
        )}
        {col === "users" && (
          <button
            className="small-link"
            onClick={() =>
              run(
                () => api.toggleUser(r.id, !r.active),
                "Account updated.",
              ).catch(() => {})
            }
          >
            {r.active ? "Deactivate" : "Activate"}
          </button>
        )}
        <button
          aria-label={"Delete " + (r.name || "record")}
          onClick={() => setDel(r)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    ),
  });
  return (
    <>
      <Intro
        eyebrow="ACADEMY OPERATIONS"
        title={
          {
            students: "Your athlete directory.",
            coaches: "Build your coaching team.",
            sports: "Your programmes.",
            "membership-plans": "Memberships made simple.",
            enrollments: "Every athlete. Every programme.",
            users: "Account access.",
            messages: "Academy enquiries.",
          }[resource] || resource
        }
      />
      <section className="panel">
        <div className="toolbar">
          <input
            aria-label={"Search " + resource}
            placeholder={"Search " + resource + "…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="actions">
            <button
              className="button secondary"
              disabled={!rows.length}
              onClick={() => exportCSV(rows)}
            >
              <Download size={16} />
              Export CSV
            </button>
            {schemas[col] && (
              <button
                className="button"
                onClick={() =>
                  setEdit(
                    col === "sports"
                      ? { capacity: 6 }
                      : col === "subscriptions"
                        ? { status: "Active" }
                        : {},
                  )
                }
              >
                <Plus size={17} />
                Add{" "}
                {resource === "users"
                  ? "athlete"
                  : resource === "membership-plans"
                    ? "plan"
                    : "record"}
              </button>
            )}
          </div>
        </div>
        <DataTable rows={rows} columns={defs} />
        <p className="micro-copy">
          {rows.length} records · Changes persist on this device
        </p>
      </section>
      {edit && (
        <Modal
          title={
            (edit.id ? "Edit" : "Add") +
            " " +
            (resource === "users" ? "athlete" : resource)
          }
          onClose={() => setEdit(null)}
        >
          <form className="form" onSubmit={save}>
            {schemas[col].map(([key, label, type = "text"]) => (
              <Field key={key} label={label}>
                {[
                  "sports",
                  "students",
                  "coaches",
                  "plans",
                  "statuses",
                ].includes(type) ? (
                  <select name={key} defaultValue={edit[key] || ""} required>
                    <option value="">Select {label.toLowerCase()}</option>
                    {type === "statuses"
                      ? ["Active", "Expired", "Cancelled"].map((s) => (
                          <option key={s}>{s}</option>
                        ))
                      : (type === "students"
                          ? data.users.filter((u) => u.role === "student")
                          : data[type]
                        ).map((r) => (
                          <option value={r.id} key={r.id}>
                            {r.name}
                          </option>
                        ))}
                  </select>
                ) : (
                  <input
                    name={key}
                    type={type}
                    defaultValue={type === "password" ? "" : (edit[key] ?? "")}
                    min={
                      type === "number"
                        ? key === "experience"
                          ? 0
                          : 1
                        : undefined
                    }
                    max={key === "capacity" ? 6 : undefined}
                    minLength={type === "password" ? 8 : undefined}
                    required={
                      ![
                        "phone",
                        "bio",
                        "tag",
                        "description",
                        "password",
                      ].includes(key) ||
                      (key === "password" && !edit.id)
                    }
                  />
                )}
              </Field>
            ))}
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      )}
      {del && (
        <Modal title="Delete this record?" onClose={() => setDel(null)}>
          <p>
            This removes the record from this browser. Linked people, plans and
            sports cannot be removed while memberships refer to them.
          </p>
          <div className="actions">
            <button className="button secondary" onClick={() => setDel(null)}>
              Keep record
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await run(() => api.remove(col, del.id), "Record removed.");
                  setDel(null);
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete record
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Settings() {
  const { data } = useApp();
  return (
    <>
      <Intro eyebrow="ACADEMY SETTINGS" title="A clear view of your setup." />
      <div className="grid two">
        {[
          [
            "Data storage",
            "Local browser storage",
            "Accounts, memberships and training records are saved on this device.",
          ],
          [
            "Authentication",
            "Local role-based demo",
            "The existing documented accounts work locally. Real server sessions require the API integration.",
          ],
          [
            "Payments",
            "Simulation mode",
            "No charge, UPI request or external payment connection is made.",
          ],
          [
            "Database integration",
            "API adapter prepared",
            "Connect a server using the documented service contract. Keep MongoDB credentials exclusively on that server.",
          ],
        ].map(([t, s, d]) => (
          <section className="panel" key={t}>
            <span className="badge">{s}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </section>
        ))}
      </div>
      <section className="panel">
        <h3>Export academy data</h3>
        <p>
          Download an application data snapshot for review or migration.
          Password hashes and authentication secrets are excluded.
        </p>
        <button
          className="button"
          onClick={() =>
            download(
              "sportivo-data.json",
              JSON.stringify(data, null, 2),
              "application/json",
            )
          }
        >
          <Download size={17} />
          Export data
        </button>
      </section>
      <section className="panel">
        <h3>Activity log</h3>
        <DataTable
          rows={[...(data.audit || [])].reverse()}
          columns={[
            { key: "date", label: "Date" },
            { key: "actor", label: "Account" },
            { key: "action", label: "Action" },
          ]}
        />
      </section>
    </>
  );
}
export function AthleteDetail() {
  const { studentId } = useParams(),
    { user, data } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  const athlete = data.users?.find(
    (u) => u.id === studentId && u.role === "student",
  );
  if (!athlete)
    return (
      <main className="container page">
        <Intro
          title="Athlete unavailable."
          description="This profile is outside your assigned workspace or no longer exists."
        />
        <ButtonLink to={"/dashboard/" + user.role}>
          Back to workspace
        </ButtonLink>
      </main>
    );
  const a = data.attendance.filter((r) => r.studentId === studentId),
    ev = data.evaluations.filter((r) => r.studentId === studentId);
  return (
    <main className="container page">
      <ButtonLink to={"/dashboard/" + user.role}>Back to workspace</ButtonLink>
      <Intro
        eyebrow="ATHLETE PROFILE"
        title={athlete.name}
        description={athlete.email}
      />
      <div className="grid two">
        <section className="panel">
          <h3>Training history</h3>
          <DataTable
            rows={a}
            columns={[
              { key: "date", label: "Date" },
              { key: "drill", label: "Drill" },
              { key: "status", label: "Status" },
            ]}
          />
        </section>
        <section className="panel">
          <h3>Coach evaluations</h3>
          {ev.length ? (
            ev.map((e) => (
              <div className="session-row" key={e.id}>
                <div>
                  <strong>
                    {e.overall}/100 · {e.date}
                  </strong>
                  <p>{e.notes}</p>
                </div>
              </div>
            ))
          ) : (
            <Empty text="No evaluations yet." />
          )}
        </section>
      </div>
    </main>
  );
}
