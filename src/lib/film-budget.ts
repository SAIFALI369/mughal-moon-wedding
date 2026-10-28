/**
 * A global budget for autoplaying theme films.
 *
 * Every theme tile in the app used to mount its own `<video autoplay loop>`:
 * the landing collection, the dashboard template grid, the editor's theme
 * picker, the preview dock. On a phone that was two dozen decoders fighting for
 * one chip, which is exactly what "the UX is lagging" looks like.
 *
 * So films now ask permission. Each player reports how much of itself is on
 * screen; the budget hands playback to the handful of most-visible players and
 * tells everyone else to show their still. Photos are cheap, decoders are not.
 */

type Player = {
  id: number;
  /** Lower wins: a hero (0) beats a thumbnail (1). */
  priority: number;
  /** Fraction of the element inside the viewport, 0–1. */
  ratio: number;
  active: boolean;
  notify: (active: boolean) => void;
};

const players = new Map<number, Player>();
let nextId = 1;
let scheduled = false;

/** How many films may decode at once. Phones get one; tabs-left save none. */
export function filmBudgetLimit(): number {
  if (typeof window === "undefined") return 0;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData) return 0;
    if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return 0;
    // One decoder on a phone (or any coarse pointer): the hero tile plays, the
    // rest wait their turn as the guest scrolls.
    const phone =
      window.matchMedia("(max-width: 767px)").matches ||
      window.matchMedia("(pointer: coarse)").matches;
    return phone ? 1 : 2;
  } catch {
    return 1;
  }
}

/**
 * A film that is already playing gets a small bonus, so scrolling between two
 * equally visible tiles does not tear one film down to start another — the swap
 * only happens once the playing tile is clearly the less visible one.
 */
const INCUMBENT_BONUS = 0.18;

function flush() {
  scheduled = false;
  const limit = filmBudgetLimit();
  const visible = [...players.values()].filter((player) => player.ratio > 0.01);
  const score = (player: Player) => player.ratio + (player.active ? INCUMBENT_BONUS : 0);
  visible.sort((a, b) => a.priority - b.priority || score(b) - score(a) || a.id - b.id);
  const winners = new Set(visible.slice(0, limit).map((player) => player.id));
  for (const player of players.values()) {
    const next = winners.has(player.id);
    if (next === player.active) continue;
    player.active = next;
    player.notify(next);
  }
}

/**
 * Coalesce bursts of scroll into one decision. The rAF pass keeps the change
 * visually immediate; the timer catches the position the scroll settles on.
 */
function schedule() {
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    if (scheduled) flush();
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
  setTimeout(run, 140);
}

export type FilmSlot = {
  /** Fraction of the element that is on screen. */
  setRatio: (ratio: number) => void;
  setPriority: (priority: number) => void;
  release: () => void;
};

/**
 * Ask for a film slot. `onChange` is called with `true` when this player may
 * play and `false` when it must fall back to its still.
 */
export function requestFilmSlot(onChange: (active: boolean) => void, priority = 1): FilmSlot {
  const player: Player = { id: nextId++, priority, ratio: 0, active: false, notify: onChange };
  players.set(player.id, player);
  return {
    setRatio(ratio) {
      const clamped = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
      if (Math.abs(clamped - player.ratio) < 0.02) return;
      player.ratio = clamped;
      schedule();
    },
    setPriority(next) {
      if (player.priority === next) return;
      player.priority = next;
      schedule();
    },
    release() {
      players.delete(player.id);
      // Hand the freed decoder to whoever is next in line.
      schedule();
    },
  };
}

/** Test helper: how many players are allowed to play right now. */
export function activeFilmCount(): number {
  return [...players.values()].filter((player) => player.active).length;
}

/** Test helper: forget every player (a fresh page). */
export function resetFilmBudget() {
  players.clear();
  scheduled = false;
}
