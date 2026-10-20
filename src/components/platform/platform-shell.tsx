import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  PanelsTopLeft,
  HeartHandshake,
  UserRound,
  ArrowUpRight,
  Menu,
  X,
  Moon,
  LogOut,
  Wallet,
} from "lucide-react";
import { useAuth, getUsernameFromUser } from "@/lib/auth-context";

export function PlatformShell({
  children,
  workspace = false,
  activeSection = "invitations",
  onSectionChange,
}: {
  children: ReactNode;
  workspace?: boolean;
  activeSection?: "invitations" | "templates" | "credits";
  onSectionChange?: (section: "invitations" | "templates" | "credits") => void;
}) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const username = getUsernameFromUser(user) || "Your account";
  return (
    <div className="studio">
      <header className="studio-mobile">
        <Link to="/" className="studio-brand">
          <Moon size={22} /> inviting<span>you.</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open && (
        <button
          className="studio-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`studio-sidebar ${open ? "is-open" : ""}`}>
        <Link to="/" className="studio-brand">
          <span className="studio-brand-icon">
            <Moon size={22} />
          </span>{" "}
          inviting<span>you.</span>
        </Link>
        <p className="studio-nav-label">YOUR PARTNER WORKSPACE</p>
        <nav aria-label="Main navigation" onClick={() => setOpen(false)}>
          {workspace && onSectionChange ? (
            <>
              <button
                type="button"
                className={activeSection === "invitations" ? "is-active" : ""}
                aria-current={activeSection === "invitations" ? "page" : undefined}
                onClick={() => onSectionChange("invitations")}
              >
                <PanelsTopLeft size={18} /> My invitations
              </button>
              <button
                type="button"
                className={activeSection === "templates" ? "is-active" : ""}
                aria-current={activeSection === "templates" ? "page" : undefined}
                onClick={() => onSectionChange("templates")}
              >
                <Moon size={18} /> Template collection
              </button>
              <button
                type="button"
                className={activeSection === "credits" ? "is-active" : ""}
                aria-current={activeSection === "credits" ? "page" : undefined}
                onClick={() => onSectionChange("credits")}
              >
                <Wallet size={18} /> Credits & access
              </button>
            </>
          ) : (
            <>
              <Link to="/" className={!workspace ? "is-active" : ""}>
                <LayoutDashboard size={18} /> Overview
              </Link>
              <Link to={user ? "/dashboard" : "/sign-in"} className={workspace ? "is-active" : ""}>
                <PanelsTopLeft size={18} /> My invitations
              </Link>
              <a href="#collection">
                <Moon size={18} /> Template collection <span className="studio-new">NEW</span>
              </a>
            </>
          )}
          <Link to={user ? "/profile" : "/sign-in"}>
            <HeartHandshake size={18} /> Guest responses
          </Link>
          <Link to={user ? "/profile" : "/sign-in"}>
            <UserRound size={18} /> My account
          </Link>
        </nav>
        <div className="studio-sidebar-bottom">
          <div className="studio-note">
            <span className="studio-tiny-star">✧</span>
            <h3>A little more personal.</h3>
            <p>
              Your shop. Their story.
              <br />
              An invitation that feels like you.
            </p>
            <Link to="/demo">
              Explore a sample <ArrowUpRight size={14} />
            </Link>
          </div>
          {user ? (
            <div className="studio-account">
              <span className="studio-avatar">{username[0]?.toUpperCase()}</span>
              <div>
                <strong>{username}</strong>
                <span>Print-shop partner</span>
              </div>
              <button onClick={() => void signOut()} aria-label="Sign out">
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <div className="studio-guest">
              <Link to="/sign-in">Sign in</Link>
              <Link to="/sign-in">
                Exclusive partner access <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          <p className="studio-sidebar-foot">Made for moments that matter.</p>
        </div>
      </aside>
      <div className="studio-main">
        {children}
        <footer className="studio-footer">
          <span>
            invitingyou. <span className="studio-footer-muted">A beautiful beginning.</span>
          </span>
          <span>Made with care, shared with love. ♡</span>
        </footer>
      </div>
    </div>
  );
}
