import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Download,
  Globe2,
  Heart,
  MousePointer2,
  Music2,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { useAuth } from "@/lib/auth-context";
import { Dashboard } from "./dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InvitingYou — Exclusive digital invitations for print shops" },
      {
        name: "description",
        content:
          "Exclusive digital invitation tools for printing shops. ₹1,000 in cash buys 10 digital card credits. Accounts are personally issued by InvitingYou.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "InvitingYou — A beautiful beginning" },
      {
        property: "og:description",
        content:
          "Your own invitation, soundtrack and AI host. Create privately, publish when ready, and collect guest replies.",
      },
    ],
  }),
  component: Home,
});

const collection = [
  {
    name: "Moonlit Courtyard",
    style: "moon",
    category: "REGAL · TIMELESS",
    names: ["Ayaan", "Zara"],
    caption: "For a love written in the stars.",
  },
  {
    name: "Rosewater Romance",
    style: "rose",
    category: "SOFT · ROMANTIC",
    names: ["Arjun", "Meera"],
    caption: "A softer shade of forever.",
  },
  {
    name: "The Royal Edit",
    style: "royal",
    category: "BOLD · ELEGANT",
    names: ["Kabir", "Aisha"],
    caption: "A celebration fit for your story.",
  },
];

export function Home() {
  const { user, loading } = useAuth();
  if (user) return <Dashboard />;
  return (
    <PlatformShell>
      <div className="studio-topbar">
        <span>The digital invitation studio for printing shops</span>
        <div>
          <span className="studio-status-dot" /> Your invitation studio{" "}
          <Link to="/sign-in">
            Sign in <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="studio-content">
        <section className="studio-hero">
          <div className="studio-hero-copy">
            <span className="studio-eyebrow">
              <span /> EXCLUSIVELY FOR OUR PRINT-SHOP PARTNERS
            </span>
            <h1>
              Your shop.
              <br />
              Beautifully <em>invited.</em>
            </h1>
            <p>
              Give your customers more than a printed card. Create beautiful digital invitations
              with their own story, soundtrack and AI host—ready to share with one link.
            </p>
            <div className="studio-hero-actions">
              <Link to={user ? "/dashboard" : "/sign-in"} className="studio-button">
                Partner sign in <Plus size={17} />
              </Link>
              <Link to="/demo" className="studio-text-button">
                Explore the experience <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="studio-hero-checks">
              <span>
                <Check size={13} /> ₹1,000 cash · 10 card credits
              </span>
              <span>
                <Check size={13} /> Personally issued shop accounts
              </span>
            </div>
          </div>
          <div
            className="studio-hero-art"
            aria-label="Illustration of a personalized wedding invitation"
          >
            <span className="studio-orbit orbit-one" />
            <span className="studio-orbit orbit-two" />
            <span className="studio-art-star star-one">✧</span>
            <span className="studio-art-star star-two">✦</span>
            <div className="studio-paper-back" />
            <div className="studio-invite">
              <div className="studio-invite-frame">
                <span className="studio-invite-moon">☾</span>
                <span className="studio-invite-kicker">TOGETHER WITH THEIR FAMILIES</span>
                <span className="studio-invite-names">
                  Your name<em>&</em>Their name
                </span>
                <div className="studio-invite-rule">✧</div>
                <span className="studio-invite-date">A DAY TO REMEMBER</span>
                <span className="studio-invite-message">The beginning of our forever.</span>
              </div>
            </div>
            <div className="studio-art-chip chip-top">
              <span>
                <Heart size={15} />
              </span>{" "}
              Made for your kind of love
            </div>
            <div className="studio-art-chip chip-bottom">
              <span>
                <MousePointer2 size={15} />
              </span>{" "}
              One link. Everyone you love.
            </div>
          </div>
        </section>
        <div className="studio-promise">
          <span>
            <ShieldCheck size={16} /> Private until you publish
          </span>
          <span>
            <Globe2 size={16} /> Beautiful on every screen
          </span>
          <span>
            <Music2 size={16} /> Your own soundtrack
          </span>
          <span>
            <Sparkles size={16} /> A personal AI host
          </span>
        </div>
        <section className="studio-steps-section">
          <div className="studio-section-heading">
            <div>
              <span className="studio-eyebrow">A LITTLE INSPIRATION. A LOT OF YOU.</span>
              <h2>From “we’re getting married” to “you’re invited.”</h2>
            </div>
            <a href="#collection" className="studio-text-button">
              Find your beginning <ChevronDown size={15} />
            </a>
          </div>
          <div className="studio-steps">
            {[
              ["01", "Make it yours", "Choose a look, add your names, and tell your story."],
              [
                "02",
                "Add the little details",
                "The venue, the music, the moments your guests should know.",
              ],
              [
                "03",
                "Let the celebration begin",
                "Preview, publish, and share your link with your favourite people.",
              ],
            ].map(([number, title, detail]) => (
              <div className="studio-step" key={number}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section id="collection" className="studio-collection">
          <div className="studio-section-heading">
            <div>
              <span className="studio-eyebrow">THE DESIGN COLLECTION</span>
              <h2>A mood for every kind of forever.</h2>
            </div>
            <span className="studio-collection-tag">
              Personalise every detail <Sparkles size={14} />
            </span>
          </div>
          <div className="studio-template-grid">
            {collection.map((template) => (
              <article key={template.name} className="studio-template">
                <div className={`studio-template-art ${template.style}`}>
                  <span className="studio-template-label">STYLE INSPIRATION</span>
                  <div className="studio-template-frame">
                    <span className="studio-template-symbol">
                      {template.style === "rose" ? "❦" : template.style === "royal" ? "✧" : "☾"}
                    </span>
                    <span className="studio-template-kicker">THE WEDDING CELEBRATION OF</span>
                    <span className="studio-template-names">
                      {template.names[0]}
                      <em>&</em>
                      {template.names[1]}
                    </span>
                    <span className="studio-template-ornament">― ✧ ―</span>
                    <span className="studio-template-caption">{template.caption}</span>
                  </div>
                </div>
                <div className="studio-template-info">
                  <div>
                    <span>{template.category}</span>
                    <h3>{template.name}</h3>
                  </div>
                  <Link
                    to="/sign-in"
                    aria-label={`Create an invitation inspired by ${template.name}`}
                  >
                    <ArrowUpRight size={20} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="studio-collection-note">
            Illustrative design inspiration. Choose and customise your theme inside the invitation
            editor.
          </p>
        </section>
        <section className="studio-bottom-banner">
          <span className="studio-banner-icon">✧</span>
          <div>
            <h2>One cash package. Ten beautiful invitations.</h2>
            <p>
              Pay ₹1,000 directly to your InvitingYou representative. We create your account and add
              10 card credits. No public signup. No online payments.
            </p>
          </div>
          <Link to="/sign-in" className="studio-button">
            Access your studio <ArrowRight size={16} />
          </Link>
        </section>
        <section
          id="download-app"
          aria-label="Download offline studio app"
          className="studio-download-banner"
        >
          <div className="studio-download-copy">
            <span className="studio-eyebrow">
              <span /> OFFLINE STUDIO APP
            </span>
            <h2>Design offline. Publish when online.</h2>
            <p>
              Download the InvitingYou Offline App for your shop counter. Create, edit, and preview
              every theme without Wi-Fi—internet is only needed when you publish.
            </p>
          </div>
          <div className="studio-download-actions">
            <Link to="/download" className="studio-button">
              <Download size={16} /> Download offline app
            </Link>
            <Link to="/offline-studio" className="studio-text-button">
              Open offline studio <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
        {loading && (
          <span className="sr-only" role="status">
            Checking your account…
          </span>
        )}
      </div>
    </PlatformShell>
  );
}
