import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  PanelsTopLeft,
  HeartHandshake,
  UserRound,
  ArrowUpRight,
  Download,
  Menu,
  X,
  Moon,
  LogOut,
  Wallet,
  Sparkles,
} from "lucide-react";
import { useAuth, getUsernameFromUser } from "@/lib/auth-context";

export function PlatformShell({
  children,
  workspace = false,
  activeSection = "invitations",
  activePage,
  onSectionChange,
}: {
  children: ReactNode;
  workspace?: boolean;
  activeSection?: "invitations" | "templates" | "credits";
  activePage?: "responses";
  onSectionChange?: (section: "invitations" | "templates" | "credits") => void;
}) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const username = getUsernameFromUser(user) || "Partner";

  return (
    <div className={`studio ${workspace ? "studio-workspace" : ""}`}>
      <header className="studio-mobile">
        <Link to="/" className="studio-brand">
          <Moon size={20} /> inviting<span>you.</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
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
            <Moon size={20} />
          </span>{" "}
          inviting<span>you.</span>
        </Link>
        {!workspace && <p className="studio-nav-label">YOUR PARTNER WORKSPACE</p>}
        <nav
          aria-label="Main navigation"
          className={workspace ? "mt-8" : undefined}
          onClick={() => setOpen(false)}
        >
          {workspace ? (
            onSectionChange ? (
              <>
                <button
                  type="button"
                  className={!activePage && activeSection === "invitations" ? "is-active" : ""}
                  aria-current={!activePage && activeSection === "invitations" ? "page" : undefined}
                  onClick={() => onSectionChange("invitations")}
                >
                  <PanelsTopLeft size={17} /> My invitations
                </button>
                <button
                  type="button"
                  className={!activePage && activeSection === "templates" ? "is-active" : ""}
                  aria-current={!activePage && activeSection === "templates" ? "page" : undefined}
                  onClick={() => onSectionChange("templates")}
                >
                  <Sparkles size={17} /> Templates
                </button>
                <button
                  type="button"
                  className={!activePage && activeSection === "credits" ? "is-active" : ""}
                  aria-current={!activePage && activeSection === "credits" ? "page" : undefined}
                  onClick={() => onSectionChange("credits")}
                >
                  <Wallet size={17} /> Credits & access
                </button>
              </>
            ) : (
              <Link to="/dashboard">
                <PanelsTopLeft size={17} /> My invitations
              </Link>
            )
          ) : (
            <>
              <Link to="/" className="is-active">
                <LayoutDashboard size={18} /> Overview
              </Link>
              <Link to={user ? "/dashboard" : "/sign-in"}>
                <PanelsTopLeft size={18} /> My invitations
              </Link>
              <a href="#collection">
                <Moon size={18} /> Template collection <span className="studio-new">NEW</span>
              </a>
            </>
          )}
          <Link
            to={user ? "/profile" : "/sign-in"}
            className={activePage === "responses" ? "is-active" : ""}
          >
            <HeartHandshake size={17} /> Guest responses
          </Link>
          {!workspace && (
            <Link to={user ? "/profile" : "/sign-in"}>
              <UserRound size={18} /> My account
            </Link>
          )}
        </nav>
        <div className="studio-sidebar-bottom">
          {!workspace && (
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
          )}
          {user ? (
            <div className="studio-account">
              <span className="studio-avatar">{username[0]?.toUpperCase()}</span>
              <div>
                <strong>{username}</strong>
                <span>Partner</span>
              </div>
              <button onClick={() => void signOut()} aria-label="Sign out" title="Sign out">
                <LogOut size={16} />
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
          {!workspace && <p className="studio-sidebar-foot">Made for moments that matter.</p>}
        </div>
      </aside>
      <div className="studio-main">
        {children}
        {!workspace && (
          <footer className="studio-footer">
            <span>
              invitingyou. <span className="studio-footer-muted">A beautiful beginning.</span>
            </span>
            <div className="studio-footer-right">
              <Link to="/download" className="studio-footer-download">
                <Download size={12} aria-hidden="true" /> Download offline app
              </Link>
              <span>Made with care, shared with love. ♡</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
