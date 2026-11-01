import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Activity, Menu, X } from "lucide-react";
export const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const initials = (s) =>
  s
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Sportivo home">
      <span className="brand-mark">
        <Activity size={25} />
      </span>
      sportivo<span className="brand-dot">®</span>
    </Link>
  );
}
export function ButtonLink({ to, children, secondary = false }) {
  return (
    <Link to={to} className={"button " + (secondary ? "secondary" : "")}>
      {children}
      <ArrowUpRight size={18} />
    </Link>
  );
}
export function Intro({ eyebrow, title: heading, description }) {
  return (
    <header className="intro">
      <div className="eyebrow">{eyebrow || "THE SPORTIVO ACADEMY"}</div>
      <h1>{heading}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Empty({
  text = "Nothing here yet.",
  to,
  label = "Get started",
}) {
  return (
    <div className="empty">
      <Activity />
      <h3>{text}</h3>
      {to && <ButtonLink to={to}>{label}</ButtonLink>}
    </div>
  );
}
export function Modal({ title: heading, onClose, children }) {
  useEffect(() => {
    const handle = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <div className="section-heading">
          <h2>{heading}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function DataTable({ columns, rows, empty = "No records found." }) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? c.render(r) : (r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty text={empty} />
  );
}
export function download(name, content, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCSV(rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = (v) =>
    '"' +
    String(typeof v === "object" ? JSON.stringify(v) : (v ?? ""))
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  download(
    "sportivo-records.csv",
    [
      keys.map(cell).join(","),
      ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
    ].join("\n"),
    "text/csv",
  );
}
export function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
