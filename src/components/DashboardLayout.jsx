import React, { useState } from "react";
import {
  NavLink,
  Link,
  Outlet,
  Navigate,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Trophy,
  CreditCard,
  CalendarCheck,
  TrendingUp,
  UserRound,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useApp, api } from "../context/AppContext";
import { Brand, initials, title } from "./UI";
const navs = {
  student: [
    ["", "Overview", LayoutDashboard],
    ["sports", "Programmes", Trophy],
    ["coaches", "Coaches", Users],
    ["membership", "Membership", CreditCard],
    ["attendance", "Attendance", CalendarCheck],
    ["progress", "My progress", TrendingUp],
    ["payments", "Payments", CreditCard],
    ["profile", "My profile", UserRound],
  ],
  coach: [
    ["", "Overview", LayoutDashboard],
    ["students", "My squad", Users],
    ["attendance", "Attendance", CalendarCheck],
    ["progress", "Evaluations", TrendingUp],
    ["profile", "My profile", UserRound],
  ],
  admin: [
    ["", "Overview", LayoutDashboard],
    ["students", "Athletes", Users],
    ["coaches", "Coaches", UserRound],
    ["sports", "Programmes", Trophy],
    ["membership-plans", "Membership plans", CreditCard],
    ["enrollments", "Enrolments", ShieldCheck],
    ["attendance", "Attendance", CalendarCheck],
    ["progress", "Evaluations", TrendingUp],
    ["payments", "Payments", CreditCard],
    ["users", "Accounts", Users],
    ["messages", "Enquiries", Mail],
    ["settings", "Settings", Settings],
  ],
};
export default function DashboardLayout() {
  const { user, data, run } = useApp(),
    { role } = useParams(),
    location = useLocation(),
    navigate = useNavigate(),
    [open, setOpen] = useState(false),
    [bells, setBells] = useState(false);
  if (!user)
    return (
      <Navigate
        to={
          role === "admin" ? "/admin" : role === "coach" ? "/coach" : "/login"
        }
        replace
      />
    );
  if (user.role !== role)
    return <Navigate to={"/dashboard/" + user.role} replace />;
  const base = "/dashboard/" + role;
  return (
    <div className="workspace">
      <aside className={"sidebar " + (open ? "visible" : "")}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-toggle icon-button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>
        <div className="eyebrow sidebar-caption">
          {role === "admin"
            ? "ACADEMY OPERATIONS"
            : role === "coach"
              ? "COACH WORKSPACE"
              : "YOUR ATHLETE SPACE"}
        </div>
        <nav aria-label="Workspace navigation">
          {navs[role].map(([p, n, Icon]) => (
            <NavLink
              key={p}
              to={base + (p ? "/" + p : "")}
              end
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {n}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mode-note">
            <span className="status-dot" /> Local demo mode
            <small>Saved on this device</small>
          </div>
          <button
            onClick={() =>
              run(() => api.logout(), "Signed out.")
                .then(() => navigate("/"))
                .catch(() => {})
            }
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      {open && (
        <div className="sidebar-overlay" onClick={() => setOpen(false)} />
      )}
      <div className="workspace-body">
        <header className="workspace-top">
          <button
            className="mobile-toggle icon-button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {title(location.pathname.split("/")[3] || "Overview")}
            </strong>
          </div>
          <div className="workspace-top-actions">
            <span className="today">
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <div className="notification-wrap">
              <button
                className="icon-button"
                aria-label="Notifications"
                aria-expanded={bells}
                onClick={() => setBells(!bells)}
              >
                <Bell size={20} />
                {data.notifications?.some((n) => !n.read) && <i />}
              </button>
              {bells && (
                <div className="notification-panel">
                  <div className="section-heading">
                    <h3>Notifications</h3>
                    <button
                      className="small-link"
                      onClick={() =>
                        run(
                          () => api.readNotifications(),
                          "Notifications marked read.",
                        ).catch(() => {})
                      }
                    >
                      Mark all read
                    </button>
                  </div>
                  {data.notifications?.length ? (
                    data.notifications.map((n) => (
                      <p key={n.id} className={n.read ? "muted" : ""}>
                        {n.message}
                        <small>{new Date(n.date).toLocaleDateString()}</small>
                      </p>
                    ))
                  ) : (
                    <p>
                      No new updates. Coach reviews and enrolments will appear
                      here.
                    </p>
                  )}
                </div>
              )}
            </div>
            <Link
              to={base + (role === "admin" ? "/settings" : "/profile")}
              className="user-chip"
            >
              <span>{initials(user.name)}</span>
              <div>
                <strong>{user.name}</strong>
                <small>{title(role)}</small>
              </div>
            </Link>
          </div>
        </header>
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
