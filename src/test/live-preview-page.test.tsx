// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LivePreviewPage } from "@/routes/preview.$cardId";
import { sectionForInviteTap } from "@/lib/invitation-tap-map";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  update: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as Record<string, unknown>),
    useParams: () => ({ cardId: "card-1" }),
  }),
  useNavigate: () => mocks.navigate,
  useParams: () => ({ cardId: "card-1" }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "owner-1" }, loading: false }),
}));

vi.mock("@/lib/db", () => {
  // One chainable stub for every query shape the page touches.
  const chain: Record<string, unknown> = {};
  chain["select"] = () => chain;
  chain["eq"] = () => chain;
  chain["order"] = () => chain;
  chain["limit"] = () => chain;
  chain["insert"] = () => chain;
  chain["update"] = (patch: unknown) => {
    mocks.update(patch);
    return chain;
  };
  chain["delete"] = () => chain;
  chain["maybeSingle"] = mocks.maybeSingle;
  chain["single"] = mocks.maybeSingle;
  chain["then"] = (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
    resolve({ data: [], error: null });
  return { supabase: { from: () => chain, rpc: async () => ({ error: null }) } };
});

vi.mock("@/lib/offline-studio", () => ({
  isOfflineDraftId: (id: string) => id.startsWith("offline-"),
  getOfflineDraftsSync: () => [],
  loadOfflineDrafts: async () => [],
  updateOfflineDraft: vi.fn(),
}));

const card = {
  id: "card-1",
  title: "Ayaan & Zara",
  slug: "ayaan-zara",
  status: "published",
  published_at: "2026-10-01T00:00:00Z",
  content: {
    groomName: "Ayaan",
    brideName: "Zara",
    date: "26/11/2029",
    time: "4:00 PM",
    venue: "Patna Club",
    address: "Patna",
    theme: "royal-rajmahal",
    framework: "royal-folio",
    elements: {},
  },
};

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

beforeEach(() => {
  setWidth(390);
  mocks.navigate.mockClear();
  mocks.update.mockReset();
  mocks.maybeSingle.mockReset();
  mocks.maybeSingle.mockResolvedValue({ data: card, error: null });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("live preview page", () => {
  it("opens as its own page with the invitation, dock and no dialog", async () => {
    render(<LivePreviewPage />);

    const page = document.querySelector(".live-preview-page");
    expect(page).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() =>
      expect(document.querySelector(".create-page-head-copy h1")?.textContent).toBe("Ayaan & Zara"),
    );
    expect(document.querySelector(".live-preview-stage")).not.toBeNull();
    expect(screen.getByRole("toolbar", { name: "Edit invitation" })).toBeInTheDocument();
    // Phone-sized: the preview is the real invitation at 1:1, never a desktop frame.
    expect(document.querySelector('.device-frame-host[data-native="true"]')).not.toBeNull();
    expect(document.querySelector(".device-frame-screen .personal-invite")).not.toBeNull();
  });

  it("edits text, theme and elements live from the dock", async () => {
    render(<LivePreviewPage />);
    await waitFor(() =>
      expect(document.querySelector(".create-page-head-copy h1")?.textContent).toBe("Ayaan & Zara"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    const sheet = await screen.findByRole("dialog", { name: "Edit invitation" });
    fireEvent.change(screen.getByLabelText("Venue *"), { target: { value: "Garden Pavilion" } });
    expect(sheet).toBeInTheDocument();

    const shownTimes = () => document.querySelector(".device-frame-screen")?.textContent ?? "";
    await waitFor(() => expect(shownTimes()).toContain("Garden Pavilion"));

    // Theme switch from the same panel.
    fireEvent.click(screen.getByRole("button", { name: "Theme" }));
    const aladin = await screen.findByRole("button", { name: /Aladin/i });
    fireEvent.click(aladin);
    await waitFor(() => {
      const root = document.querySelector(".device-frame-screen .personal-invite");
      expect(root?.getAttribute("data-theme")).toBe("aladin");
    });
  });

  it("saves the edited card back to the database", async () => {
    render(<LivePreviewPage />);
    await waitFor(() =>
      expect(document.querySelector(".create-page-head-copy h1")?.textContent).toBe("Ayaan & Zara"),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Details" })[0]);
    fireEvent.change(screen.getByLabelText("Venue *"), { target: { value: "Garden Pavilion" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save changes" })[0]);

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const patch = mocks.update.mock.calls[0][0] as { content: { venue: string }; title: string };
    expect(patch.title).toBe("Ayaan & Zara");
    expect(patch.content.venue).toBe("Garden Pavilion");
  });

  it("maps taps inside the invitation to the matching editor section", () => {
    const build = (html: string) => {
      const host = document.createElement("div");
      host.innerHTML = html;
      return host.firstElementChild as Element;
    };
    expect(
      sectionForInviteTap(
        build('<section class="invite-suite invite-suite-story"><p>x</p></section>')!.querySelector(
          "p",
        ),
      ),
    ).toBe("details");
    expect(
      sectionForInviteTap(
        build('<div class="invite-hero-wrap"><h2>x</h2></div>')!.querySelector("h2"),
      ),
    ).toBe("essentials");
    expect(
      sectionForInviteTap(
        build(
          '<section class="invite-section invite-suite-schedule"><p>x</p></section>',
        )!.querySelector("p"),
      ),
    ).toBe("events");
    expect(
      sectionForInviteTap(build('<div class="unrelated"><p>x</p></div>')!.querySelector("p")),
    ).toBeNull();
  });
});
