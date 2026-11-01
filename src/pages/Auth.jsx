import React, { useState } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { ArrowUpRight, Eye, EyeOff, Check } from "lucide-react";
import { useApp, api } from "../context/AppContext";
import { Brand, Field } from "../components/UI";
export default function Auth({ role = "student", register = false }) {
  const { user, run } = useApp(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (user) return <Navigate to={"/dashboard/" + user.role} replace />;
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(e.target));
    try {
      const u = await run(() =>
        register ? api.register(values) : api.login({ ...values, role }),
      );
      navigate(
        "/dashboard/" +
          u.role +
          (params.get("plan") || params.get("sport")
            ? "/enroll?" + params.toString()
            : ""),
        { replace: true },
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <div className="eyebrow">YOUR GAME. CONNECTED.</div>
          <h1>
            Show up.
            <br />
            Step up.
            <br />
            <em>Repeat.</em>
          </h1>
          <p>
            A little more purpose in your practice.
            <br />A little more progress, every day.
          </p>
          <div className="auth-benefits">
            {[
              "Small squads. Personal coaching.",
              "Your attendance and progress, together.",
              "One academy. Three connected portals.",
            ].map((t) => (
              <span key={t}>
                <Check size={17} />
                {t}
              </span>
            ))}
          </div>
        </div>
        <small>SPORTIVO ATHLETIC ACADEMY / BENGALURU</small>
      </aside>
      <section className="auth-form-area">
        <Link to="/" className="text-link">
          ← Back to academy
        </Link>
        <div className="auth-form-inner">
          <div className="eyebrow">
            {register ? "YOUR NEXT CHAPTER" : role + " PORTAL"}
          </div>
          <h2>
            {register ? "Make your first move." : "Good to have you back."}
          </h2>
          <p>
            {register
              ? "Create your athlete account and find your programme."
              : "Sign in to your " + role + " workspace."}
          </p>
          {!register && (
            <div className="tabs auth-tabs">
              {[
                ["student", "/login"],
                ["coach", "/coach"],
                ["admin", "/admin"],
              ].map(([r, path]) => (
                <Link key={r} className={r === role ? "active" : ""} to={path}>
                  {r === "student" ? "Athlete" : r}
                </Link>
              ))}
            </div>
          )}
          <form className="form" onSubmit={submit}>
            {register && (
              <Field
                label="Full name"
                name="name"
                minLength="2"
                autoComplete="name"
                required
              />
            )}
            <Field
              label="Email address"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
            <Field label="Password">
              <div className="password-field">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  minLength={register ? 8 : undefined}
                  autoComplete={register ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {role === "admin" && (
              <Field
                label="Admin security code"
                name="code"
                type="password"
                inputMode="numeric"
                required
              />
            )}
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? "Please wait…"
                : register
                  ? "Create athlete account"
                  : "Sign in"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already part of the academy?" : "New to Sportivo?"}{" "}
            <Link
              to={
                register
                  ? "/login"
                  : "/register" + (params.size ? "?" + params.toString() : "")
              }
            >
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className="micro-copy">
            Standalone demo · Your data stays in this browser.
          </p>
        </div>
      </section>
    </main>
  );
}
