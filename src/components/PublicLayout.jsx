import React, { useState } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Brand, ButtonLink } from "./UI";
import { useApp } from "../context/AppContext";
export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useApp();
  return (
    <>
      <div className="top-strip">
        BENGALURU · A NEW STANDARD OF TRAINING <span>2026 / 27 SEASON</span>
      </div>
      <nav className="public-nav container" aria-label="Main navigation">
        <Brand />
        <button
          className="mobile-toggle icon-button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <div
          className={"nav-links " + (open ? "open" : "")}
          onClick={() => setOpen(false)}
        >
          {[
            ["/sports", "Programmes"],
            ["/coaches", "Our coaches"],
            ["/membership", "Membership"],
            ["/about", "Academy"],
            ["/contact", "Contact"],
          ].map(([p, n]) => (
            <NavLink key={p} to={p}>
              {n}
            </NavLink>
          ))}
        </div>
        <Link
          className="nav-login"
          to={user ? `/dashboard/${user.role}` : "/login"}
        >
          {user ? "My workspace" : "Sign in"} <ArrowUpRight size={16} />
        </Link>
      </nav>
      <Outlet />
      <footer>
        <div className="container footer-grid">
          <div>
            <Brand />
            <p>
              Purpose in every session.
              <br />
              Progress in every season.
            </p>
            <span className="eyebrow">BENGALURU, INDIA</span>
          </div>
          <div>
            <h4>Find your game</h4>
            <Link to="/sports/cricket">Cricket</Link>
            <Link to="/sports/football">Football</Link>
            <Link to="/sports/basketball">Basketball</Link>
            <Link to="/membership">Membership</Link>
          </div>
          <div>
            <h4>Your academy</h4>
            <Link to="/about">Our approach</Link>
            <Link to="/coaches">Coaching team</Link>
            <Link to="/contact">Get in touch</Link>
          </div>
          <div>
            <h4>Your workspace</h4>
            <Link to="/login">Athlete portal ↗</Link>
            <Link to="/coach">Coach portal ↗</Link>
            <Link to="/admin">Admin portal ↗</Link>
            <Link to="/register">Create an account ↗</Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Sportivo Athletic Academy</span>
          <span>TRAIN WITH PURPOSE. PLAY WITH BELIEF.</span>
        </div>
      </footer>
    </>
  );
}
