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
    [showConfirm, setShowConfirm] = useState(false),
    [forgot, setForgot] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [resetEmail, setResetEmail] = useState("");

  if (user) return <Navigate to={"/dashboard/" + user.role} replace />;

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
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

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const values = Object.fromEntries(new FormData(e.target));
    if (values.newPassword !== values.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (!values.newPassword || values.newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setBusy(true);
    try {
      await run(
        () =>
          api.resetPassword({
            email: values.email,
            newPassword: values.newPassword,
          }),
        "Password updated successfully! Please sign in with your new password.",
      );
      setSuccess("Password updated successfully! Please sign in with your new password.");
      setResetEmail(values.email);
      setForgot(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const roleName = role === "student" ? "Athlete" : role === "coach" ? "Coach" : "Admin";

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
            {register
              ? "YOUR NEXT CHAPTER"
              : forgot
                ? "ATHLETE PASSWORD RESET"
                : `${roleName.toUpperCase()} PORTAL`}
          </div>
          <h2>
            {register
              ? "Make your first move."
              : forgot
                ? "Reset your password."
                : "Good to have you back."}
          </h2>
          <p>
            {register
              ? "Create your athlete account and find your programme."
              : forgot
                ? "Enter your registered athlete email and choose a new password."
                : `Sign in to your ${roleName.toLowerCase()} workspace.`}
          </p>

          {success && (
            <div
              className="toast"
              style={{
                position: "static",
                margin: "16px 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span>{success}</span>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setSuccess("")}
                style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: "16px" }}
              >
                ×
              </button>
            </div>
          )}

          {forgot ? (
            <form className="form" onSubmit={handleResetPassword}>
              <Field
                label="Athlete email address"
                name="email"
                type="email"
                defaultValue={resetEmail}
                autoComplete="username"
                required
              />
              <Field label="New password (min 8 characters)">
                <div className="password-field">
                  <input
                    name="newPassword"
                    type={show ? "text" : "password"}
                    minLength={8}
                    autoComplete="new-password"
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
              <Field label="Confirm new password">
                <div className="password-field">
                  <input
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              {error && (
                <p role="alert" className="error-message">
                  {error}
                </p>
              )}
              <button className="button" disabled={busy}>
                {busy ? "Updating password…" : "Reset password & continue"}
                <ArrowUpRight size={18} />
              </button>
              <p className="auth-switch">
                <button
                  type="button"
                  className="text-link"
                  style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", color: "var(--green)", fontWeight: 700 }}
                  onClick={() => {
                    setForgot(false);
                    setError("");
                  }}
                >
                  ← Back to athlete sign in
                </button>
              </p>
            </form>
          ) : (
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
                defaultValue={resetEmail}
                autoComplete="username"
                required
              />
              <Field
                label={
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <span>Password</span>
                    {role === "student" && !register && (
                      <button
                        type="button"
                        className="text-link"
                        style={{
                          fontSize: "12px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          color: "var(--green)",
                          fontWeight: 600,
                        }}
                        onClick={() => {
                          setForgot(true);
                          setError("");
                          setSuccess("");
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                }
              >
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
          )}

          {!forgot && role === "student" && (
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
          )}

          <p className="micro-copy">
            Sportivo Athletic Academy · Secure Workspace
          </p>
        </div>
      </section>
    </main>
  );
}
