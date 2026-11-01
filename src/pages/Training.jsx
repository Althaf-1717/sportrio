import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Download,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useApp, api } from "../context/AppContext";
import {
  Intro,
  ButtonLink,
  Field,
  Empty,
  DataTable,
  Modal,
  download,
  money,
  initials,
} from "../components/UI";
import TrainingActions from "../components/TrainingActions";
import { SportCards, CoachCards, Plans } from "./Public";
export const today = () => new Date().toISOString().slice(0, 10);
export function Overview() {
  const { data, user } = useApp(),
    a = data.attendance || [],
    ev = data.evaluations || [],
    subs = data.subscriptions || [];
  const rate = a.length
      ? Math.round(
          (a.filter((x) => x.status === "Present").length / a.length) * 100,
        )
      : 0,
    latest = [...ev].sort((a, b) => b.date.localeCompare(a.date))[0];
  const latestByStudent = [
    ...new Map(
      [...ev]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => [e.studentId, e]),
    ).values(),
  ];
  const avg = latestByStudent.length
    ? Math.round(
        latestByStudent.reduce((s, e) => s + e.overall, 0) /
          latestByStudent.length,
      )
    : 0;
  const metrics =
    user.role === "admin"
      ? [
          ["Athletes", data.users.filter((u) => u.role === "student").length],
          ["Coaches", data.coaches.length],
          ["Enrolments", subs.length],
          [
            "Active memberships",
            subs.filter((s) => s.status === "Active" && s.endDate >= today())
              .length,
          ],
          [
            "Simulated revenue",
            money(data.payments.reduce((s, p) => s + p.amount, 0)),
          ],
          ["Today’s attendance", a.filter((x) => x.date === today()).length],
          ["Attendance rate", rate + "%"],
          ["Average progress", avg + "%"],
        ]
      : user.role === "coach"
        ? [
            ["Assigned athletes", new Set(subs.map((s) => s.studentId)).size],
            ["Attendance rate", rate + "%"],
            ["Average progress", avg + "%"],
            ["Reviews logged", ev.length],
          ]
        : [
            ["Attendance rate", rate + "%"],
            ["Skill index", (latest?.overall || 0) + "/100"],
            ["Sessions logged", a.length],
            [
              "Active programmes",
              subs.filter((s) => s.status === "Active" && s.endDate >= today())
                .length,
            ],
          ];
  return (
    <>
      <div className="section-heading dashboard-intro">
        <Intro
          eyebrow={
            user.role === "student"
              ? "YOUR NEXT CHAPTER"
              : "ACADEMY AT A GLANCE"
          }
          title={"Welcome back, " + user.name.split(" ")[0] + "."}
          description={
            user.role === "student"
              ? "A little more progress, every time you show up."
              : "Everything you need to keep your academy moving."
          }
        />
        <ButtonLink
          to={
            "/dashboard/" +
            user.role +
            (user.role === "student"
              ? "/enroll"
              : user.role === "coach"
                ? "/attendance"
                : "/students")
          }
        >
          {user.role === "student"
            ? "Join a programme"
            : user.role === "coach"
              ? "Mark attendance"
              : "Manage athletes"}
        </ButtonLink>
      </div>
      <div className="stats-grid">
        {metrics.map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>From your saved academy records</small>
          </div>
        ))}
      </div>
      <div className="grid two">
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STEADY PROGRESS</span>
              <h3>
                {user.role === "admin"
                  ? "Enrolments by programme"
                  : "Skill development"}
              </h3>
            </div>
            <TrendingUp size={21} />
          </div>
          {user.role === "admin" ? (
            data.sports.map((s) => (
              <div className="score-row" key={s.id}>
                <span>{s.name}</span>
                <progress
                  max={Math.max(subs.length, 1)}
                  value={subs.filter((x) => x.sportId === s.id).length}
                />
                <strong>{subs.filter((x) => x.sportId === s.id).length}</strong>
              </div>
            ))
          ) : ev.length ? (
            <div
              className="bar-chart"
              aria-label="Skill progress by evaluation date"
            >
              {[...ev]
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(-8)
                .map((e) => (
                  <div key={e.id}>
                    <strong>{e.overall}%</strong>
                    <i style={{ height: Math.max(e.overall, 3) * 1.5 }} />
                    <small>{e.date.slice(5)}</small>
                  </div>
                ))}
            </div>
          ) : (
            <Empty text="Your first evaluation is ahead." />
          )}
        </section>
        <section className="panel">
          <span className="eyebrow">YOUR TRAINING ROUTINE</span>
          <h3>
            {user.role === "student" ? "Current programmes" : "Recent activity"}
          </h3>
          {subs.length ? (
            subs.slice(0, 4).map((s) => (
              <div className="session-row" key={s.id}>
                <span className="session-icon">
                  <Check size={19} />
                </span>
                <div>
                  <strong>
                    {data.sports.find((x) => x.id === s.sportId)?.name} ·{" "}
                    {data.plans.find((x) => x.id === s.planId)?.name}
                  </strong>
                  <p>{data.coaches.find((x) => x.id === s.coachId)?.name}</p>
                  <small>
                    {data.sports.find((x) => x.id === s.sportId)?.schedule}
                  </small>
                </div>
                <span className="badge">
                  {s.endDate < today() ? "Expired" : s.status}
                </span>
              </div>
            ))
          ) : (
            <Empty
              text="Your programme is waiting."
              to="/dashboard/student/enroll"
            />
          )}
        </section>
      </div>
      {user.role === "admin" && (
        <div className="grid two">
          <section className="panel">
            <h3>Monthly simulated revenue</h3>
            {Object.entries(
              data.payments.reduce((r, p) => {
                r[p.date.slice(0, 7)] = (r[p.date.slice(0, 7)] || 0) + p.amount;
                return r;
              }, {}),
            ).map(([m, n]) => (
              <div className="score-row" key={m}>
                <span>{m}</span>
                <progress
                  max={Math.max(...data.payments.map((p) => p.amount), n)}
                  value={n}
                />
                <strong>{money(n)}</strong>
              </div>
            ))}
          </section>
          <section className="panel">
            <h3>Skill distribution</h3>
            {["Beginner", "Intermediate", "Advanced", "Professional"].map(
              (l, i) => {
                const n = latestByStudent.filter(
                  (e) =>
                    (e.skillLevel ||
                      (e.overall < 40
                        ? "Beginner"
                        : e.overall < 70
                          ? "Intermediate"
                          : e.overall < 90
                            ? "Advanced"
                            : "Professional")) === l,
                ).length;
                return (
                  <div className="score-row" key={l}>
                    <span>{l}</span>
                    <progress
                      value={n}
                      max={Math.max(latestByStudent.length, 1)}
                    />
                    <strong>{n}</strong>
                  </div>
                );
              },
            )}
          </section>
        </div>
      )}
    </>
  );
}
export function Enrollment() {
  const { data, run } = useApp(),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    [step, setStep] = useState(0),
    [planId, setPlan] = useState((params.get("plan") || "").split("-")[0]),
    [sportId, setSport] = useState(params.get("sport") || ""),
    [coachId, setCoach] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const plan = data.plans.find((x) => x.id === planId),
    sport = data.sports.find((x) => x.id === sportId),
    coach = data.coaches.find((x) => x.id === coachId);
  const next = () => {
    if (![plan, sport, coach][step]) {
      setError("Please select an option to continue.");
      return;
    }
    setError("");
    setStep(step + 1);
  };
  async function pay() {
    setBusy(true);
    setError("");
    try {
      await run(
        () => api.enroll({ planId, sportId, coachId }),
        "Membership activated. Your simulated receipt is ready.",
      );
      navigate("/dashboard/student/payments");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Intro
        eyebrow="BUILD YOUR SEASON"
        title="A programme that’s yours."
        description="Choose your plan, sport and coach. Review everything before you enrol."
      />
      <section className="panel wizard">
        <ol className="wizard-steps">
          {["Plan", "Sport", "Coach", "Review"].map((s, i) => (
            <li key={s} className={i <= step ? "active" : ""}>
              <span>{i < step ? <Check size={16} /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <h2>
          {
            [
              "Find your training rhythm.",
              "Choose your discipline.",
              "Find your coach.",
              "Ready for your first session?",
            ][step]
          }
        </h2>
        {step === 0 && (
          <div className="grid three">
            {data.plans.map((p) => (
              <button
                className={
                  "selection-card " + (p.id === planId ? "selected" : "")
                }
                onClick={() => setPlan(p.id)}
                key={p.id}
              >
                <span className="eyebrow">{p.name}</span>
                <h3>{money(p.price)}</h3>
                <p>{p.months} months</p>
                <p>{p.description}</p>
              </button>
            ))}
          </div>
        )}
        {step === 1 && (
          <div className="grid three">
            {data.sports.map((s) => (
              <button
                key={s.id}
                className={
                  "selection-card " + (s.id === sportId ? "selected" : "")
                }
                onClick={() => {
                  setSport(s.id);
                  setCoach("");
                }}
              >
                <h3>{s.name}</h3>
                <p>{s.description}</p>
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="grid three">
            {data.coaches
              .filter((c) => c.sportId === sportId)
              .map((c) => (
                <button
                  key={c.id}
                  className={
                    "selection-card " + (c.id === coachId ? "selected" : "")
                  }
                  onClick={() => setCoach(c.id)}
                >
                  <span className="avatar">{initials(c.name)}</span>
                  <h3>{c.name}</h3>
                  <p>{c.specialty}</p>
                </button>
              ))}
          </div>
        )}
        {step === 3 && (
          <div className="review-panel">
            <div>
              <small>YOUR PROGRAMME</small>
              <h3>{sport?.name}</h3>
              <p>{coach?.name}</p>
              <p>{sport?.schedule}</p>
            </div>
            <div>
              <small>YOUR MEMBERSHIP</small>
              <h3>
                {plan?.name} · {plan?.months} months
              </h3>
              <strong className="price">{money(plan?.price)}</strong>
              <p>Payment simulation · No money collected</p>
            </div>
          </div>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="wizard-actions">
          <button
            className="button secondary"
            onClick={() =>
              step ? setStep(step - 1) : navigate("/dashboard/student")
            }
            disabled={busy}
          >
            {step ? "Back" : "Cancel"}
          </button>
          {step < 3 ? (
            <button className="button" onClick={next}>
              Continue <ArrowRight size={18} />
            </button>
          ) : (
            <button className="button" disabled={busy} onClick={pay}>
              {busy ? "Activating…" : "Simulate payment & enrol"}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
export function StudentMembership() {
  const { data } = useApp();
  return (
    <>
      <Intro title="Your season, in focus." eyebrow="MEMBERSHIP" />
      <div className="grid two">
        {data.subscriptions?.map((s) => (
          <article className="panel" key={s.id}>
            <span className="badge">
              {s.endDate < today() ? "Expired" : s.status}
            </span>
            <h2>{data.sports.find((x) => x.id === s.sportId)?.name}</h2>
            <p>
              {data.plans.find((x) => x.id === s.planId)?.name} ·{" "}
              {data.coaches.find((x) => x.id === s.coachId)?.name}
            </p>
            <p>
              Valid {s.startDate} to {s.endDate}
            </p>
            <ButtonLink
              secondary
              to={"/dashboard/student/enroll?sport=" + s.sportId}
            >
              Choose or renew a plan
            </ButtonLink>
          </article>
        ))}
      </div>
      <section className="section">
        <h2>Your next programme.</h2>
        <Plans />
      </section>
    </>
  );
}
export function StudentSports() {
  return (
    <>
      <Intro title="Keep exploring your game." eyebrow="PROGRAMMES" />
      <SportCards />
      <div className="section">
        <ButtonLink to="/dashboard/student/enroll">Join a programme</ButtonLink>
      </div>
    </>
  );
}
export function StudentCoaches() {
  const { data } = useApp();
  return (
    <>
      <Intro title="Your coaching team." eyebrow="PEOPLE IN YOUR CORNER" />
      <CoachCards coaches={data.coaches} />
    </>
  );
}
export function Attendance() {
  const { data, user, run } = useApp(),
    [date, setDate] = useState(today()),
    [time, setTime] = useState("16:30"),
    [drill, setDrill] = useState(""),
    [marks, setMarks] = useState({}),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  const assigned =
    data.users?.filter(
      (u) =>
        u.role === "student" &&
        data.subscriptions.some(
          (s) =>
            s.studentId === u.id &&
            s.status === "Active" &&
            (user.role === "admin" || s.coachId === user.id),
        ),
    ) || [];
  const rows = (data.attendance || [])
    .map((a) => ({
      ...a,
      name: data.users.find((x) => x.id === a.studentId)?.name || "Athlete",
    }))
    .filter((a) =>
      `${a.date} ${a.drill} ${a.name} ${a.status}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await run(
        () =>
          api.attendance({
            date,
            time,
            drill,
            records: assigned.map((u) => ({
              studentId: u.id,
              status: marks[u.id]?.status || "Present",
              remarks: marks[u.id]?.remarks || "",
            })),
          }),
        "Session attendance saved.",
      );
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Intro
        title={
          user.role === "student"
            ? "Every session counts."
            : "Keep your squad on track."
        }
        eyebrow="ATTENDANCE"
      />
      {user.role !== "student" && (
        <form className="panel form" onSubmit={submit}>
          <h3>Record a training session</h3>
          <div className="grid three">
            <Field
              label="Session date"
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Field
              label="Time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
            <Field
              label="Drill / training focus"
              value={drill}
              onChange={(e) => setDrill(e.target.value)}
              required
            />
          </div>
          {assigned.length ? (
            assigned.map((u) => (
              <div className="attendance-row" key={u.id}>
                <strong>{u.name}</strong>
                <select
                  aria-label={u.name + " attendance"}
                  value={marks[u.id]?.status || "Present"}
                  onChange={(e) =>
                    setMarks({
                      ...marks,
                      [u.id]: { ...marks[u.id], status: e.target.value },
                    })
                  }
                >
                  <option>Present</option>
                  <option>Absent</option>
                </select>
                <input
                  aria-label={u.name + " remarks"}
                  placeholder="Session remarks"
                  value={marks[u.id]?.remarks || ""}
                  onChange={(e) =>
                    setMarks({
                      ...marks,
                      [u.id]: { ...marks[u.id], remarks: e.target.value },
                    })
                  }
                />
              </div>
            ))
          ) : (
            <Empty text="No athletes assigned yet." />
          )}
          <button className="button" disabled={busy || !assigned.length}>
            {busy ? "Saving…" : "Save session attendance"}
          </button>
        </form>
      )}
      <section className="panel">
        <div className="toolbar">
          <h3>Session history</h3>
          <input
            aria-label="Search attendance"
            placeholder="Search date, athlete or drill…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <DataTable
          rows={rows}
          columns={[
            { key: "date", label: "Date" },
            { key: "name", label: "Athlete" },
            { key: "time", label: "Time" },
            { key: "drill", label: "Training focus" },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <span
                  className={
                    "badge " + (r.status === "Absent" ? "warning" : "")
                  }
                >
                  {r.status}
                </span>
              ),
            },
            { key: "remarks", label: "Remarks" },
            ...(user.role !== "student"
              ? [
                  {
                    key: "actions",
                    label: "Actions",
                    render: (r) => (
                      <TrainingActions collection="attendance" record={r} />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </section>
    </>
  );
}
export function Progress() {
  const { data, user, run } = useApp(),
    [busy, setBusy] = useState(false);
  const athletes =
    data.users?.filter(
      (u) =>
        u.role === "student" &&
        data.subscriptions.some(
          (s) =>
            s.studentId === u.id &&
            (user.role === "admin" || s.coachId === user.id),
        ),
    ) || [];
  const rows = [...(data.evaluations || [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await run(
        () => api.evaluate(Object.fromEntries(new FormData(e.target))),
        "Evaluation saved and shared with the athlete.",
      );
      e.target.reset();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Intro
        title={
          user.role === "student"
            ? "See how far you’ve come."
            : "Turn feedback into progress."
        }
        eyebrow="SKILL DEVELOPMENT"
      />
      {user.role !== "student" && (
        <form className="panel form" onSubmit={submit}>
          <h3>New skill evaluation</h3>
          <div className="grid two">
            <Field label="Athlete">
              <select name="studentId" required>
                <option value="">Choose athlete</option>
                {athletes.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Evaluation date"
              name="date"
              type="date"
              defaultValue={today()}
              max={today()}
              required
            />
          </div>
          <div className="grid three">
            {["Fitness", "Technique", "Composure"].map((k) => (
              <Field
                key={k}
                label={k + " / 100"}
                name={k.toLowerCase()}
                type="number"
                min="0"
                max="100"
                required
              />
            ))}
          </div>
          <div className="grid two">
            <Field
              label="Overall override (optional)"
              name="override"
              type="number"
              min="0"
              max="100"
            />
            <Field label="Skill level">
              <select name="skillLevel">
                {["Beginner", "Intermediate", "Advanced", "Professional"].map(
                  (l) => (
                    <option key={l}>{l}</option>
                  ),
                )}
              </select>
            </Field>
          </div>
          <Field label="Coach feedback">
            <textarea name="notes" rows="3" maxLength="1000" required />
          </Field>
          <Field label="Training notes">
            <textarea name="trainingNotes" rows="2" maxLength="2000" />
          </Field>
          <button className="button" disabled={busy || !athletes.length}>
            {busy ? "Saving…" : "Publish evaluation"}
          </button>
        </form>
      )}
      {rows.length ? (
        <div className="grid two">
          {rows.map((e) => (
            <article className="panel" key={e.id}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    {e.date} · {e.skillLevel || "Skill review"}
                  </span>
                  <h3>
                    {data.users.find((u) => u.id === e.studentId)?.name ||
                      "Your evaluation"}
                  </h3>
                </div>
                <strong className="score-circle">
                  {e.overall}
                  <small>/100</small>
                </strong>
              </div>
              {["fitness", "technique", "composure"].map((k) => (
                <div className="score-row" key={k}>
                  <span>{k}</span>
                  <progress max="100" value={e[k]} />
                  <strong>{e[k]}%</strong>
                </div>
              ))}
              <blockquote>{e.notes}</blockquote>
              {e.trainingNotes && <p>{e.trainingNotes}</p>}
              <TrainingActions collection="evaluations" record={e} />
            </article>
          ))}
        </div>
      ) : (
        <Empty text="Your first skill review is ahead." />
      )}
    </>
  );
}
export function Payments() {
  const { data, user } = useApp(),
    [receipt, setReceipt] = useState(null);
  const text = (r) =>
    `SPORTIVO — SIMULATED PAYMENT RECEIPT\n\nReceipt: ${r.id}\nAthlete: ${data.users.find((u) => u.id === r.studentId)?.name || user.name}\nDate: ${r.date}\nProgramme: ${r.sport}\nPlan: ${r.plan}\nAmount: INR ${r.amount}\nStatus: ${r.status}\n\nDemo transaction. No money was collected.`;
  return (
    <>
      <Intro
        title="Your training, accounted for."
        eyebrow="PAYMENTS & RECEIPTS"
      />
      <div className="notice">
        Demo payments only. Receipts do not confirm a real financial
        transaction.
      </div>
      <section className="panel">
        <DataTable
          rows={data.payments || []}
          columns={[
            { key: "date", label: "Date" },
            { key: "sport", label: "Programme" },
            { key: "plan", label: "Plan" },
            { key: "amount", label: "Amount", render: (r) => money(r.amount) },
            {
              key: "status",
              label: "Status",
              render: (r) => <span className="badge">{r.status}</span>,
            },
            {
              key: "actions",
              label: "Receipt",
              render: (r) => (
                <button className="small-link" onClick={() => setReceipt(r)}>
                  View receipt ↗
                </button>
              ),
            },
          ]}
        />
      </section>
      {receipt && (
        <Modal title="Payment receipt" onClose={() => setReceipt(null)}>
          <pre className="receipt">{text(receipt)}</pre>
          <div className="actions no-print">
            <button
              className="button"
              onClick={() =>
                download(
                  "sportivo-receipt-" + receipt.id + ".txt",
                  text(receipt),
                )
              }
            >
              <Download size={16} />
              Download receipt
            </button>
            <button className="button secondary" onClick={() => window.print()}>
              Print receipt
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Squad() {
  const { data } = useApp(),
    [q, setQ] = useState("");
  const rows = data.users.filter(
    (u) =>
      u.role === "student" && u.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <Intro title="Your squad. Your impact." eyebrow="ASSIGNED ATHLETES" />
      <section className="panel">
        <div className="toolbar">
          <h3>Athlete directory</h3>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search athletes"
            placeholder="Search athletes…"
          />
        </div>
        <DataTable
          rows={rows}
          columns={[
            {
              key: "name",
              label: "Athlete",
              render: (u) => (
                <Link className="small-link" to={"/students/" + u.id}>
                  {u.name} ↗
                </Link>
              ),
            },
            { key: "email", label: "Email" },
            {
              key: "attendance",
              label: "Attendance",
              render: (u) => {
                const a = data.attendance.filter((x) => x.studentId === u.id);
                return a.length
                  ? Math.round(
                      (a.filter((x) => x.status === "Present").length /
                        a.length) *
                        100,
                    ) + "%"
                  : "No sessions";
              },
            },
            {
              key: "progress",
              label: "Latest score",
              render: (u) =>
                [...data.evaluations]
                  .filter((e) => e.studentId === u.id)
                  .sort((a, b) => b.date.localeCompare(a.date))[0]?.overall ??
                "Not evaluated",
            },
          ]}
        />
      </section>
    </>
  );
}
export function Profile() {
  const { user, data, run } = useApp(),
    [busy, setBusy] = useState(false);
  const coach = data.coaches.find((c) => c.id === user.id);
  async function submit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.target));
    if (values.newPassword !== values.confirmPassword) {
      return run(() =>
        Promise.reject(Error("New passwords do not match.")),
      ).catch(() => {});
    }
    setBusy(true);
    try {
      await run(() => api.profile(values), "Profile updated.");
      e.target.currentPassword.value = "";
      e.target.newPassword.value = "";
      e.target.confirmPassword.value = "";
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Intro title="Make yourself at home." eyebrow="YOUR PROFILE" />
      <form className="panel form" onSubmit={submit}>
        <div className="profile-heading">
          <span className="avatar">{initials(user.name)}</span>
          <div>
            <h3>{user.name}</h3>
            <p>
              {user.email} · {user.role}
            </p>
          </div>
        </div>
        <div className="grid two">
          <Field
            label="Full name"
            name="name"
            defaultValue={user.name}
            required
          />
          <Field
            label="Email (managed by admin)"
            defaultValue={user.email}
            disabled
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={user.phone}
          />
          <Field
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            max={today()}
            defaultValue={user.dateOfBirth}
          />
        </div>
        <Field label="Gender">
          <select name="gender" defaultValue={user.gender || ""}>
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
          </select>
        </Field>
        <Field label="Address">
          <textarea
            name="address"
            defaultValue={user.address}
            maxLength="500"
          />
        </Field>
        {coach && (
          <>
            <Field
              label="Specialty"
              name="specialty"
              defaultValue={coach.specialty}
            />
            <Field label="Coaching bio">
              <textarea name="bio" defaultValue={coach.bio} maxLength="2000" />
            </Field>
          </>
        )}
        <h3>Change password</h3>
        <p className="muted">
          Leave these fields empty to keep your existing password.
        </p>
        <div className="grid three">
          <Field
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
          />
          <Field
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength="8"
          />
          <Field
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
          />
        </div>
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>
    </>
  );
}
