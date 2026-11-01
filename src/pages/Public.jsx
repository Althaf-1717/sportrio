import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Target,
  Users,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { useApp, api } from "../context/AppContext";
import {
  Intro,
  ButtonLink,
  Field,
  Empty,
  initials,
  money,
} from "../components/UI";
export function SportArt({ sport }) {
  return (
    <div className={"sport-art " + sport}>
      <div className="court-lines" />
      {["cricket", "football", "basketball"].includes(sport) ? (
        <img
          src={"/images/sport-" + sport + ".jpg"}
          alt={sport + " training at Sportivo"}
        />
      ) : (
        <div className="ball" aria-hidden="true">
          {sport === "football" ? "⚽" : "🏀"}
        </div>
      )}
      <span className="sport-number">
        {sport === "cricket" ? "01" : sport === "football" ? "02" : "03"}
      </span>
    </div>
  );
}
export function SportCards() {
  const { data } = useApp();
  return (
    <div className="grid three">
      {data.sports.map((s) => (
        <Link className="sport-card" to={"/sports/" + s.id} key={s.id}>
          <SportArt sport={s.id} />
          <div className="card-body">
            <div className="section-heading">
              <h3>{s.name}</h3>
              <ArrowUpRight />
            </div>
            <p>{s.description}</p>
            <span className="small-link">
              Explore programme <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
export function Plans({ sport }) {
  const { data, user } = useApp();
  return (
    <div className="grid three">
      {data.plans.map((p, i) => (
        <article className={"plan " + (i === 1 ? "featured" : "")} key={p.id}>
          <div className="section-heading">
            <span className="eyebrow">{p.name}</span>
            {i === 1 && <span className="tag">MOST POPULAR</span>}
          </div>
          <h3>
            {money(p.price)}
            <small>
              / {p.months} {+p.months === 1 ? "month" : "months"}
            </small>
          </h3>
          <p>{p.description}</p>
          <ul>
            {p.features.split(",").map((f) => (
              <li key={f}>
                <Check size={17} />
                {f.trim()}
              </li>
            ))}
          </ul>
          <ButtonLink
            to={`${user ? "/dashboard/" + user.role + "/enroll" : "/login"}?plan=${p.id}${sport ? "&sport=" + sport : ""}`}
            secondary={i !== 1}
          >
            Choose {p.name}
          </ButtonLink>
        </article>
      ))}
    </div>
  );
}
export function Home() {
  return (
    <main>
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> ENROLMENT OPEN · 2026 SEASON
          </div>
          <h1>
            Less sidelines.
            <br />
            More <em>game.</em>
          </h1>
          <p>
            Find your sport. Train with people who know your potential. Turn
            every session into your next breakthrough.
          </p>
          <div className="actions">
            <ButtonLink to="/register">Find your programme</ButtonLink>
            <Link className="text-link" to="/about">
              Meet your academy <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack">
              <span>AM</span>
              <span>KR</span>
              <span>DS</span>
            </div>
            <div>
              <strong>Small squads. Big possibilities.</strong>
              <small>Specialist coaches · Just 6 athletes per cohort</small>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="vertical-label">EVERY GREAT GAME STARTS HERE</div>
          <img
            src="/images/cricket.jpg"
            alt="Athletes training on a cricket field"
          />
          <div className="photo-shade" />
          <div className="hero-photo-label">
            <span>01 / THE CRICKET PROGRAMME</span>
            <h2>
              Your next innings
              <br />
              starts here.
            </h2>
            <Link to="/sports/cricket" aria-label="Explore cricket programme">
              <ArrowUpRight />
            </Link>
          </div>
          <div className="floating-card">
            <span className="mini-icon">
              <TrendingUp size={24} />
            </span>
            <div>
              <small>YOUR PROGRESS, VISIBLE.</small>
              <strong>Better every session.</strong>
            </div>
            <div className="mini-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="corner-label">SPORTIVO / ACADEMY</span>
        </div>
      </section>
      <section className="value-strip">
        <div className="container">
          <div>
            <strong>01—06</strong>
            <span>Athletes per coach</span>
          </div>
          <div>
            <strong>3 sports</strong>
            <span>One connected academy</span>
          </div>
          <div>
            <strong>Your pace</strong>
            <span>Morning & evening sessions</span>
          </div>
          <div>
            <strong>Real progress</strong>
            <span>Attendance & skill tracking</span>
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FIND YOUR DISCIPLINE</div>
            <h2>
              Different games.
              <br />
              The same dedication.
            </h2>
          </div>
          <Link className="text-link" to="/sports">
            All programmes <ArrowUpRight size={19} />
          </Link>
        </div>
        <SportCards />
      </section>
      <section className="approach">
        <div className="container split">
          <div>
            <div className="eyebrow">BUILT AROUND YOU</div>
            <h2>
              Good coaching.
              <br />A clear way forward.
            </h2>
            <p>
              Leave the crowded batches and scattered updates behind. Your
              coach, schedule and progress belong in one place.
            </p>
            <ButtonLink to="/about">The Sportivo approach</ButtonLink>
          </div>
          <div className="steps">
            {[
              [
                Users,
                "A squad, not a crowd",
                "Six athletes. One specialist. Individual attention in every drill.",
              ],
              [
                CalendarDays,
                "A routine that fits",
                "Choose a discipline and a season plan that works with your life.",
              ],
              [
                TrendingUp,
                "Progress you can see",
                "Follow attendance, skill scores and coach feedback in your workspace.",
              ],
            ].map(([Icon, h, p], i) => (
              <div key={h}>
                <span className="step-number">0{i + 1}</span>
                <div>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
                <Icon size={24} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">INVEST IN YOUR GAME</div>
            <h2>Your season. Your pace.</h2>
          </div>
          <p>
            Simple plans. Specialist coaching.
            <br />A clear picture of your progress.
          </p>
        </div>
        <Plans />
      </section>
      <section className="container section faq">
        <div>
          <div className="eyebrow">BEFORE YOU STEP ONTO THE FIELD</div>
          <h2>A few good questions.</h2>
        </div>
        <div>
          {[
            [
              "Can beginners join?",
              "Absolutely. Coaches help you develop a baseline and choose the right training pace, from your first session to match preparation.",
            ],
            [
              "How does progress tracking work?",
              "Your coach records attendance and evaluations in the coach portal. Your athlete workspace shows your session history, technique, fitness, composure and feedback.",
            ],
            [
              "Can I train in more than one sport?",
              "Yes. Add another programme from your athlete workspace and choose its plan and coach.",
            ],
            [
              "How do I get started?",
              "Create an athlete account, choose your sport, select a coach and membership, then complete the enrolment flow. This local version uses simulated payments.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="container final-cta">
        <div>
          <div className="eyebrow">YOUR NEXT CHAPTER</div>
          <h2>
            There’s a better player in you.
            <br />
            Let’s find them.
          </h2>
        </div>
        <ButtonLink to="/register">Start your journey</ButtonLink>
      </section>
    </main>
  );
}
export function Sports() {
  return (
    <main className="container page">
      <Intro
        eyebrow="THREE DISCIPLINES. ONE STANDARD."
        title="Find where you belong."
        description="Purposeful training. Personal attention. A pathway from the fundamentals to your next match."
      />
      <SportCards />
    </main>
  );
}
export function SportDetail() {
  const { id } = useParams(),
    { data } = useApp();
  const s = data.sports.find((s) => s.id === id);
  if (!s) return <NotFound />;
  return (
    <main className="container page">
      <div className="split detail-hero">
        <div>
          <Intro
            eyebrow={s.name + " / PROGRAMME"}
            title={s.tag || s.name}
            description={s.description}
          />
          <ButtonLink to={"/register?sport=" + s.id}>Join {s.name}</ButtonLink>
          <p className="muted">
            {s.schedule} · Maximum {s.capacity} athletes
          </p>
        </div>
        <SportArt sport={s.id} />
      </div>
      <section className="section">
        <div className="eyebrow">THE TRAINING PLAN</div>
        <h2>
          Fundamentals first.
          <br />
          Game ready next.
        </h2>
        <div className="grid three">
          {s.skills.split(",").map((x, i) => (
            <article className="panel" key={x}>
              <span className="eyebrow">0{i + 1}</span>
              <h3>{x}</h3>
              <p>
                Focused drills, individual correction and regular coach
                evaluations.
              </p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>Your coaching team.</h2>
        <CoachCards coaches={data.coaches.filter((c) => c.sportId === id)} />
      </section>
      <section className="section">
        <h2>A plan for your season.</h2>
        <Plans sport={id} />
      </section>
    </main>
  );
}
export function CoachCards({ coaches }) {
  return (
    <div className="grid three">
      {coaches.map((c) => (
        <Link to={"/coaches/" + c.id} className="coach-card panel" key={c.id}>
          <div className="coach-avatar">
            {initials(c.name)}
            <ArrowUpRight />
          </div>
          <span className="eyebrow">{c.sportId}</span>
          <h3>{c.name}</h3>
          <strong>{c.specialty}</strong>
          <p>{c.bio}</p>
          <span className="badge">{c.experience} years coaching</span>
        </Link>
      ))}
    </div>
  );
}
export function Coaches() {
  const { data } = useApp();
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState("");
  const list = data.coaches.filter(
    (c) =>
      (filter === "all" || c.sportId === filter) &&
      `${c.name} ${c.specialty}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main className="container page">
      <Intro
        eyebrow="THE PEOPLE IN YOUR CORNER"
        title="Great games start with great coaches."
        description="Specialist knowledge. A personal approach. Meet the people helping you build your game."
      />
      <div className="toolbar">
        <div className="tabs">
          {["all", ...data.sports.map((s) => s.id)].map((s) => (
            <button
              className={filter === s ? "active" : ""}
              onClick={() => setFilter(s)}
              key={s}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          aria-label="Search coaches"
          placeholder="Search coaches…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {list.length ? (
        <CoachCards coaches={list} />
      ) : (
        <Empty text="No coaches match your search." />
      )}
    </main>
  );
}
export function CoachDetail() {
  const { id } = useParams(),
    { data } = useApp();
  const c = data.coaches.find((c) => c.id === id);
  if (!c) return <NotFound />;
  return (
    <main className="container page">
      <div className="split">
        <div>
          <Intro
            eyebrow={c.sportId + " / SPECIALIST COACH"}
            title={c.name}
            description={c.specialty}
          />
          <p>{c.bio}</p>
          <p>
            {c.experience} years of coaching experience · Small-group training
          </p>
          <ButtonLink to={"/register?sport=" + c.sportId}>
            Train with {c.name.split(" ")[0]}
          </ButtonLink>
        </div>
        <div className="coach-profile-art">
          {initials(c.name)}
          <span>YOUR GAME. OUR FOCUS.</span>
        </div>
      </div>
      <section className="section">
        <h2>A coaching plan built around you.</h2>
        <p>
          Build your baseline, practise with purpose and review your progress.
          Training includes individual feedback on technique, fitness and match
          composure.
        </p>
      </section>
    </main>
  );
}
export function Membership() {
  return (
    <main className="container page">
      <Intro
        eyebrow="MEMBERSHIP / 2026–27"
        title="Make room for your game."
        description="Choose a rhythm that works for you. Every plan includes small-group coaching and access to your athlete workspace."
      />
      <Plans />
      <div className="notice">
        All prices in INR. The standalone application uses simulated payments;
        no money is collected.
      </div>
    </main>
  );
}
export function About() {
  return (
    <main className="container page">
      <Intro
        eyebrow="THIS IS SPORTIVO"
        title="More than a place to train."
        description="A connected academy for cricket, football and basketball in Bengaluru. Built around focused coaching, consistent practice and visible progress."
      />
      <div className="grid three">
        {[
          [
            "01",
            "Athletes",
            "Your schedule, memberships, attendance and coach feedback.",
            "/login",
          ],
          [
            "02",
            "Coaches",
            "Your squad, session attendance and skill evaluations.",
            "/coach",
          ],
          [
            "03",
            "Academy team",
            "People, programmes, memberships and academy operations.",
            "/admin",
          ],
        ].map(([n, h, p, to]) => (
          <article className="panel" key={h}>
            <span className="eyebrow">{n} / CONNECTED WORKSPACES</span>
            <h2>{h}</h2>
            <p>{p}</p>
            <ButtonLink secondary to={to}>
              Open portal
            </ButtonLink>
          </article>
        ))}
      </div>
      <section className="section">
        <h2>
          Six athletes.
          <br />
          One shared commitment.
        </h2>
        <p className="lead">
          The 1:6 cohort model gives your coach time to understand your game.
          Every session has a purpose, and every assessment gives you something
          concrete to work on.
        </p>
      </section>
    </main>
  );
}
export function Contact() {
  const { run } = useApp(),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await run(
        () => api.contact(Object.fromEntries(new FormData(e.target))),
        "Enquiry saved.",
      );
      setDone(true);
      e.target.reset();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="container page">
      <div className="split">
        <div>
          <Intro
            eyebrow="LET’S TALK TRAINING"
            title="Your first step starts with a conversation."
            description="Ask about programmes, coaching, memberships or joining a cohort."
          />
          <div className="panel">
            <h3>Sportivo Athletic Academy</h3>
            <p>Bengaluru, India</p>
            <p>Cricket · Football · Basketball</p>
            <p className="muted">
              Local demo: enquiries are saved for the admin portal in this
              browser. No email is sent.
            </p>
          </div>
        </div>
        <form className="panel form" onSubmit={submit}>
          <h2>Get in touch</h2>
          <Field label="Your name" name="name" required />
          <Field label="Email address" name="email" type="email" required />
          <Field label="How can we help?">
            <textarea name="message" rows="6" minLength="10" required />
          </Field>
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Send enquiry"}
            <ArrowUpRight size={17} />
          </button>
          {done && (
            <p role="status" className="success">
              Your enquiry is saved in the local admin inbox.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
export function NotFound() {
  return (
    <main className="container page">
      <Intro
        eyebrow="404 / OUT OF BOUNDS"
        title="This page is off the field."
        description="The link may have changed. Let’s get you back into the game."
      />
      <ButtonLink to="/">Back to home</ButtonLink>
    </main>
  );
}

export function MembershipDetail() {
  const { planId } = useParams(),
    { data, user } = useApp();
  const plan = data.plans.find(
    (p) => p.id === planId || planId.startsWith(p.id + "-"),
  );
  if (!plan) return <NotFound />;
  return (
    <main className="container page">
      <Intro
        eyebrow="MEMBERSHIP DETAILS"
        title={plan.name + " membership."}
        description={plan.description}
      />
      <section className="panel">
        <h2>
          {money(plan.price)} <small>for {plan.months} months</small>
        </h2>
        <h3>What’s included</h3>
        <ul className="feature-list">
          {plan.features.split(",").map((f) => (
            <li key={f}>
              <Check size={18} />
              {f}
            </li>
          ))}
        </ul>
        <ButtonLink
          to={
            (user ? "/dashboard/" + user.role + "/enroll" : "/register") +
            "?plan=" +
            plan.id
          }
        >
          Select this plan
        </ButtonLink>
      </section>
    </main>
  );
}
