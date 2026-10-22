import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { mascotsForTheme, type InvitationLayout } from "./invitation-options";

/**
 * The living world that follows a guest down a card.
 *
 * Two themes (Chand Bagh, Mela Maidan) turn the invitation into something to
 * poke at: stars to collect, a cat and a squirrel who walk with you, riddles,
 * a moon you can spin, lanterns to send up and a locked letter that only opens
 * when every wonder is found. Everything is drawn in CSS/SVG — no video, no
 * audio file, no network — and the state lives in localStorage per card, so a
 * guest can leave and come back to the same garden.
 */

export const STAR_TOTAL = 9;
export const WONDER_TOTAL = 5;

export type WorldState = {
  stars: number[];
  riddles: number;
  moon: number;
  lanterns: number;
  treasure: boolean;
  wishes: number;
};

const EMPTY: WorldState = {
  stars: [],
  riddles: 0,
  moon: 0,
  lanterns: 0,
  treasure: false,
  wishes: 0,
};

type WorldApi = {
  state: WorldState;
  stars: number;
  wonders: number;
  done: boolean;
  collectStar: (id: number) => void;
  answerRiddle: (answer: number) => boolean;
  nextMoon: () => void;
  lightLantern: () => void;
  openTreasure: () => void;
  bumpWish: () => void;
};

const WorldContext = createContext<WorldApi | null>(null);

function storageKey(cardKey: string) {
  return `invite-world:${cardKey}`;
}

function readState(cardKey: string): WorldState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(cardKey));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<WorldState>;
    return {
      stars: Array.isArray(parsed.stars) ? parsed.stars.filter((n) => Number.isInteger(n)) : [],
      riddles: Number(parsed.riddles) || 0,
      moon: Number(parsed.moon) || 0,
      lanterns: Number(parsed.lanterns) || 0,
      treasure: parsed.treasure === true,
      wishes: Number(parsed.wishes) || 0,
    };
  } catch {
    return EMPTY;
  }
}

/** Number of finished wonders, 0–5. */
export function wonderCount(state: WorldState) {
  return [
    state.stars.length >= STAR_TOTAL,
    state.riddles >= 3,
    state.moon >= 8,
    state.lanterns >= 3 || state.wishes > 0,
    state.treasure,
  ].filter(Boolean).length;
}

export function WorldProvider({ cardKey, children }: { cardKey: string; children: ReactNode }) {
  const [state, setState] = useState<WorldState>(EMPTY);

  useEffect(() => {
    setState(readState(cardKey));
  }, [cardKey]);

  const save = useCallback(
    (next: WorldState) => {
      setState(next);
      try {
        window.localStorage.setItem(storageKey(cardKey), JSON.stringify(next));
      } catch {
        // Private mode: the world still works for this visit.
      }
    },
    [cardKey],
  );

  const api = useMemo<WorldApi>(
    () => ({
      state,
      stars: state.stars.length,
      wonders: wonderCount(state),
      done: wonderCount(state) >= WONDER_TOTAL,
      collectStar: (id) => {
        if (state.stars.includes(id)) return;
        save({ ...state, stars: [...state.stars, id].slice(0, STAR_TOTAL) });
      },
      answerRiddle: (answer) => {
        if (answer !== state.riddles) return false;
        save({ ...state, riddles: Math.min(3, state.riddles + 1) });
        return true;
      },
      nextMoon: () => save({ ...state, moon: Math.min(8, state.moon + 1) }),
      lightLantern: () => save({ ...state, lanterns: Math.min(6, state.lanterns + 1) }),
      openTreasure: () => save({ ...state, treasure: true }),
      bumpWish: () => save({ ...state, wishes: state.wishes + 1 }),
    }),
    [state, save],
  );

  return <WorldContext.Provider value={api}>{children}</WorldContext.Provider>;
}

export function useWorld(): WorldApi {
  const api = useContext(WorldContext);
  if (api) return api;
  // Sections can render outside a provider in tests; they get a quiet stand-in.
  return {
    state: EMPTY,
    stars: 0,
    wonders: 0,
    done: false,
    collectStar: () => {},
    answerRiddle: () => false,
    nextMoon: () => {},
    lightLantern: () => {},
    openTreasure: () => {},
    bumpWish: () => {},
  };
}

/* ────────────────────────────── mascots ────────────────────────────── */

export function CatMascot({
  className = "",
  mood = "night",
}: {
  className?: string;
  mood?: string;
}) {
  return (
    <svg viewBox="0 0 120 120" className={`mascot-alive ${className}`} aria-hidden="true" fill="none">
      <ellipse cx="60" cy="106" rx="30" ry="5" fill="currentColor" opacity=".12" />
      <path
        d="M38 100c-6-8-8-18-6-27 2-11 10-18 20-18h16c10 0 18 7 20 18 2 9 0 19-6 27"
        fill="currentColor"
        opacity=".92"
      />
      <path className="m-ear-l" d="M41 60 35 36l18 10Z" fill="currentColor" opacity=".92" />
      <path className="m-ear-r" d="M79 60 85 36 67 46Z" fill="currentColor" opacity=".92" />
      <path d="M43 44l-2-9 8 5Z" fill="#f7c8b8" opacity=".8" />
      <path d="M77 44l2-9-8 5Z" fill="#f7c8b8" opacity=".8" />
      <ellipse className="m-eye" cx="51" cy="66" rx="3.4" ry="4.2" fill={mood === "day" ? "#2b1d12" : "#f8e7a8"} />
      <ellipse className="m-eye" cx="69" cy="66" rx="3.4" ry="4.2" fill={mood === "day" ? "#2b1d12" : "#f8e7a8"} />
      <path d="M57 74h6l-3 3Z" fill="#f0a898" />
      <path
        d="M60 77c0 3-5 4-6 1M60 77c0 3 5 4 6 1"
        stroke="#f0a898"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M40 68h10M40 73h10M70 68h10M70 73h10"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".35"
        strokeLinecap="round"
      />
      <path
        className="m-cat-tail"
        d="M92 100c9-4 16-12 18-22"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="35" cy="86" r="7" fill="#f2c14e" opacity=".9" />
      <path d="M35 79v14M28 86h14" stroke="#8a5a12" strokeWidth="1" opacity=".5" />
    </svg>
  );
}

export function SquirrelMascot({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`mascot-alive ${className}`} aria-hidden="true" fill="none">
      <ellipse cx="58" cy="106" rx="24" ry="4" fill="currentColor" opacity=".12" />
      <path
        className="m-sq-tail"
        d="M78 96c14-6 24-20 22-36-2-18-18-28-32-22-9 4-10 15-4 20 7 6 17 1 18-8"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        opacity=".55"
      />
      <ellipse cx="52" cy="82" rx="20" ry="22" fill="currentColor" opacity=".95" />
      <circle cx="46" cy="57" r="16" fill="currentColor" opacity=".95" />
      <path d="M34 46l-3-10 10 5Z" fill="currentColor" opacity=".95" />
      <path d="M58 46l3-10-10 5Z" fill="currentColor" opacity=".95" />
      <ellipse className="m-eye" cx="40" cy="56" rx="2.8" ry="3.4" fill="#20140c" />
      <ellipse className="m-eye" cx="52" cy="56" rx="2.8" ry="3.4" fill="#20140c" />
      <circle cx="46" cy="63" r="2.2" fill="#20140c" />
      <path d="M46 65v3" stroke="#20140c" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="40" cy="72" rx="7" ry="9" fill="#f6d8a8" opacity=".9" />
      <circle cx="35" cy="88" r="7" fill="#f2c14e" opacity=".9" />
      <path d="M35 81v14M28 88h14" stroke="#8a5a12" strokeWidth="1" opacity=".5" />
    </svg>
  );
}

/* ─────────────────────────── the fixed world ─────────────────────────── */

const SPARKLE_CORNERS = ["tl", "tr", "bl", "br", "tl", "br", "tr", "bl", "tl"] as const;

const COMPANION_LINES: Record<string, string[]> = {
  "chand-bagh": [
    "Come in, the garden is awake.",
    "Noor here. The moon is ours tonight.",
    "Psst… tap the gold stars. Gul is counting.",
    "The lanterns downstream are still lit.",
    "You found most of them. Keep going!",
    "The keepers of the garden left you a letter.",
  ],
  "mela-maidan": [
    "Roll up! The mela is open.",
    "Mithai here — mind the drum.",
    "Chintu bet you cannot find nine stars.",
    "Kites are flying. Try the moon stall.",
    "Almost there! Do not miss the letter.",
    "You are a proper mela-walla now.",
  ],
};

export function CardWorld({
  layout,
  details,
  cardKey,
  guestName = "",
}: {
  layout: InvitationLayout;
  details: InvitationDetails;
  cardKey: string;
  guestName?: string;
}) {
  const world = useWorld();
  const reduced = useReducedMotion();
  const mascots = mascotsForTheme(details.theme);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });
  const [line, setLine] = useState(0);
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onScroll = () => {
      const pages = document.body.scrollHeight - window.innerHeight;
      const share = pages > 0 ? window.scrollY / pages : 0;
      setLine(Math.min(5, Math.floor(share * 6)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.current = {
        x: (event.clientX / window.innerWidth - 0.5) * 18,
        y: (event.clientY / window.innerHeight - 0.5) * 12,
      };
      const sky = document.querySelector<HTMLElement>(
        `.invite-world-sky[data-theme="${details.theme}"]`,
      );
      if (sky) {
        sky.style.setProperty("--sky-x", `${pointer.current.x}px`);
        sky.style.setProperty("--sky-y", `${pointer.current.y}px`);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, details.theme]);

  const lines =
    COMPANION_LINES[layout as keyof typeof COMPANION_LINES] ?? COMPANION_LINES["chand-bagh"];

  function sparkleAt(event: React.MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setBurst({ id: Date.now(), x: box.x + box.width / 2, y: box.y + box.height / 2 });
    window.setTimeout(() => setBurst(null), 900);
  }

  const greeting = guestName ? `${guestName}, ` : "";

  return (
    <div
      className={`invite-world invite-world-${layout}`}
      data-theme={details.theme}
      aria-hidden={false}
    >
      <div className="invite-world-sky" data-theme={details.theme} aria-hidden="true">
        {Array.from({ length: 26 }, (_, index) => (
          <span className={`world-dot world-dot-${index % 6}`} key={index} />
        ))}
        {Array.from({ length: 4 }, (_, index) => (
          <span className={`world-firefly firefly-${index}`} key={`f-${index}`} />
        ))}
        <span className="world-moon" style={{ opacity: 0.5 + (world.state.moon % 8) / 12 }} />
      </div>

      {burst && (
        <span
          key={burst.id}
          className="world-burst"
          style={{ left: burst.x, top: burst.y }}
          aria-hidden="true"
        />
      )}

      <div className={`invite-world-dock ${open ? "is-open" : ""}`}>
        <div className="invite-world-bubble" role="status" aria-live="polite">
          <strong>
            {mascots?.cat ?? "Noor"} &amp; {mascots?.squirrel ?? "Gul"}
          </strong>
          <span>
            {greeting}
            {lines[line]}
          </span>
        </div>
        <button
          type="button"
          className="invite-world-crew"
          aria-label={open ? "Hide the cat and squirrel" : "Say hello to the cat and squirrel"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {layout === "mela-maidan" && <SquirrelMascot className="crew-squirrel" />}
          <CatMascot className="crew-cat" mood={layout === "mela-maidan" ? "day" : "night"} />
          {layout === "chand-bagh" && <SquirrelMascot className="crew-squirrel" />}
        </button>
        <div
          className="invite-world-progress"
          aria-label={`${world.stars} of ${STAR_TOTAL} stars found, ${world.wonders} of ${WONDER_TOTAL} wonders done`}
        >
          <span className="world-progress-track" aria-hidden="true">
            <span
              className="world-progress-fill"
              style={{
                transform: `scaleX(${(world.stars / STAR_TOTAL) * 0.5 + (world.wonders / WONDER_TOTAL) * 0.5})`,
              }}
            />
          </span>
          <span className="world-progress-copy">
            {world.stars}/{STAR_TOTAL} stars
            <i aria-hidden="true">·</i>
            {world.wonders}/{WONDER_TOTAL} wonders
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * One collectible star, tucked into a section's corner. It travels with the
 * words instead of hovering over them, so a phone gets the same hunt without
 * anything landing on top of the RSVP form.
 */
export function WorldSparkle({ index }: { index: number }) {
  const world = useWorld();
  const id = index % STAR_TOTAL;
  const found = world.state.stars.includes(id);
  return (
    <button
      type="button"
      className={`world-sparkle sparkle-${SPARKLE_CORNERS[id]} ${found ? "is-found" : ""}`}
      aria-label={found ? `Star ${id + 1} found` : `Collect star ${id + 1} of ${STAR_TOTAL}`}
      aria-pressed={found}
      disabled={found}
      onClick={() => world.collectStar(id)}
    >
      <span aria-hidden="true">✦</span>
    </button>
  );
}

/* ─────────────────────────── the game room ─────────────────────────── */

const RIDDLES = [
  {
    question: "I light the garden and never pay rent in the sky. What am I?",
    options: ["The moon", "The gate", "The drummer"],
    answer: 0,
  },
  {
    question: "I sit on the wall, I purr at the guests, and I own the whole evening. Who am I?",
    options: ["The gatekeeper", "The cat", "The florist"],
    answer: 1,
  },
  {
    question: "Guests write me, fold me, and keep me forever — I am made of a wish. What am I?",
    options: ["A ticket", "A plate", "A letter"],
    answer: 2,
  },
];

const WONDERS = [
  { id: "stars", label: "Collect 9 stars across the card" },
  { id: "riddle", label: "Answer the cat's three riddles" },
  { id: "moon", label: "Spin the moon through all eight phases" },
  { id: "lantern", label: "Send up three lanterns (or leave a wish)" },
  { id: "treasure", label: "Open the letter the keepers left" },
] as const;

export function PlayTheCard({
  layout,
  details,
  guestName = "",
}: {
  layout: InvitationLayout;
  details: InvitationDetails;
  guestName?: string;
}) {
  const world = useWorld();
  const mascots = mascotsForTheme(details.theme);
  const [answerState, setAnswerState] = useState<"idle" | "right" | "wrong">("idle");
  const night = layout === "chand-bagh";

  return (
    <section
      id="play"
      className="invite-section invite-play px-5 py-16 sm:px-6 sm:py-24"
      aria-labelledby="play-title"
    >
      <div className="invite-play-head">
        <p className="invite-play-eyebrow">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {night ? "A little game in the garden" : "The mela games tent"}
        </p>
        <h2 id="play-title" className="invite-play-title">
          {world.done
            ? night
              ? "You are a keeper of the garden"
              : "You are a proper mela-walla"
            : night
              ? "Play with Noor & Gul"
              : "Play with Mithai & Chintu"}
        </h2>
        <p className="invite-play-copy">
          Five small wonders hide between the words. Find them and the keepers will hand you the
          letter they wrote for this wedding — and a reason to come back to the card again.
        </p>
        <div className="invite-play-progress" aria-live="polite">
          <span
            className="invite-play-ring"
            style={{ ["--done" as string]: `${(world.wonders / WONDER_TOTAL) * 360}deg` }}
            aria-hidden="true"
          >
            <b>{world.wonders}</b>
            <i>/ {WONDER_TOTAL}</i>
          </span>
          <ul className="invite-play-list">
            {WONDERS.map((wonder) => {
              const done =
                wonder.id === "stars"
                  ? world.stars >= STAR_TOTAL
                  : wonder.id === "riddle"
                    ? world.state.riddles >= 3
                    : wonder.id === "moon"
                      ? world.state.moon >= 8
                      : wonder.id === "lantern"
                        ? world.state.lanterns >= 3 || world.state.wishes > 0
                        : world.state.treasure;
              return (
                <li key={wonder.id} className={done ? "is-done" : ""}>
                  <span aria-hidden="true">{done ? "✓" : "○"}</span>
                  {wonder.label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="invite-play-grid">
        <article className="play-card play-riddle">
          <header>
            <span className="play-card-kicker">
              Riddle {Math.min(world.state.riddles + 1, 3)} of 3
            </span>
            <h3>{mascots?.cat ?? "Noor"} asks</h3>
          </header>
          {world.state.riddles >= 3 ? (
            <p className="play-done">
              Three riddles, three right answers. {mascots?.cat ?? "Noor"} blinks slowly — the
              highest compliment a cat gives.
            </p>
          ) : (
            <>
              <p className="play-question">{RIDDLES[world.state.riddles].question}</p>
              <div className="play-options">
                {RIDDLES[world.state.riddles].options.map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    className={`play-option ${answerState === "wrong" && index !== RIDDLES[world.state.riddles].answer ? "is-wrong" : ""}`}
                    onClick={() => {
                      const right = world.answerRiddle(index);
                      setAnswerState(right ? "right" : "wrong");
                      window.setTimeout(() => setAnswerState("idle"), 1200);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="play-hint" role="status">
                {answerState === "right"
                  ? "Purrfect. Another one?"
                  : answerState === "wrong"
                    ? "Not that one — follow the moonlight."
                    : "A wrong answer is forgiven. A cat has nine lives and endless patience."}
              </p>
            </>
          )}
        </article>

        <article className="play-card play-moon">
          <header>
            <span className="play-card-kicker">
              Eight phases · {Math.min(world.state.moon, 8)}/8
            </span>
            <h3>Turn the moon</h3>
          </header>
          <button
            type="button"
            className="play-moon-button"
            onClick={() => world.nextMoon()}
            aria-label="Advance the moon one phase"
          >
            <span
              className={`play-moon-disc moon-phase-${world.state.moon % 8}`}
              aria-hidden="true"
            />
            <span className="play-moon-copy">Tap the moon</span>
          </button>
          <p className="play-hint">
            {world.state.moon >= 8
              ? "Eight phases, one full circle. The night is complete."
              : "Every tap moves the night on. Wedding nights always end too soon."}
          </p>
        </article>

        <article className="play-card play-lantern">
          <header>
            <span className="play-card-kicker">{world.state.lanterns}/3 lanterns</span>
            <h3>Send a lantern up</h3>
          </header>
          <button
            type="button"
            className="play-lantern-button"
            onClick={() => world.lightLantern()}
          >
            <span aria-hidden="true">✦</span> Light a lantern
          </button>
          <div className="play-lantern-stack" aria-hidden="true">
            {Array.from({ length: Math.min(world.state.lanterns, 6) }, (_, index) => (
              <span key={index} className="play-lantern" style={{ left: `${8 + index * 15}%` }} />
            ))}
          </div>
          <p className="play-hint">
            {world.state.lanterns >= 3
              ? "The sky is full of small lights, all of them yours."
              : "Three lanterns carry a wish. Leave one in the wall below, too."}
          </p>
          <a href="#wishes" className="play-text-link">
            Leave a wish on the wall →
          </a>
        </article>

        <article className={`play-card play-treasure ${world.done ? "is-open" : ""}`}>
          <header>
            <span className="play-card-kicker">{world.done ? "Open" : "Locked"}</span>
            <h3>The keepers&rsquo; letter</h3>
          </header>
          {world.done ? (
            <div className="play-letter" role="status">
              <p>
                {guestName ? `Dear ${guestName}, ` : "Dear friend, "}
                {details.groomName} and {details.brideName} are gathering their people on{" "}
                {details.date || "a day we will never forget"}
                {details.venue ? ` at ${details.venue}` : ""}. The garden keeps a light for you.
                Come early, stay late, and bring your best story.
              </p>
              <p className="play-letter-sign">
                — {mascots?.cat ?? "Noor"} &amp; {mascots?.squirrel ?? "Gul"}, keepers
                {details.hashtag ? ` · ${details.hashtag}` : ""}
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="play-treasure-button"
                disabled={!world.done}
                aria-describedby="treasure-hint"
              >
                <span aria-hidden="true">✉</span>
              </button>
              <p className="play-hint" id="treasure-hint">
                {WONDER_TOTAL - world.wonders} wonder{WONDER_TOTAL - world.wonders === 1 ? "" : "s"}{" "}
                left before the seal breaks. Everything you finish is remembered on this device.
              </p>
            </>
          )}
        </article>
      </div>

      {world.done && (
        <p className="invite-play-finish">
          You finished the game. {mascots?.cat ?? "Noor"} approves. Bring a friend to the card and
          start again — the stars reset for every guest, the letter is yours.
        </p>
      )}
    </section>
  );
}

/* ─────────────────────── playful headings for sections ─────────────────────── */

/** A small constellation for the quiet sections, so the sky never stops. */
export function SkyPockets({ layout }: { layout: InvitationLayout }) {
  return (
    <span className={`sky-pocket sky-pocket-${layout}`} aria-hidden="true">
      <span className="sky-pocket-star">✦</span>
      <span className="sky-pocket-star">✦</span>
      <span className="sky-pocket-star">✦</span>
    </span>
  );
}
