// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CreateInvitationPage } from "@/routes/create";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  user: { id: "owner-1" } as { id: string } | null,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mocks.navigate,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: mocks.user, loading: false }),
}));

vi.mock("@/lib/db", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
          eq: () => ({ maybeSingle: mocks.maybeSingle }),
        }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }),
      update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
    }),
    auth: { getSession: async () => ({ data: { session: { user: { id: "owner-1" } } } }) },
  },
}));

vi.mock("@/lib/offline-studio", () => ({
  createOfflineDraft: vi.fn(),
  updateOfflineDraft: vi.fn(),
  isOfflineDraftId: (id: string) => id.startsWith("offline-"),
  getOfflineDraftsSync: () => [],
  loadOfflineDrafts: async () => [],
}));

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

beforeEach(() => {
  mocks.navigate.mockClear();
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
  mocks.user = { id: "owner-1" };
  window.history.replaceState({}, "", "/create");
  setWidth(390);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("dedicated create-invitation page", () => {
  it("is a full page with its own header, step rail and action bar — not a dialog", async () => {
    render(<CreateInvitationPage />);

    const page = document.querySelector(".create-page");
    expect(page).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();

    expect(screen.getByRole("heading", { name: "New invitation" })).toBeInTheDocument();
    expect(document.querySelector(".create-page-head-copy")?.textContent).toContain("Step 1 of 8");
    expect(screen.getAllByRole("tab")).toHaveLength(8);

    // The form scrolls inside the page; the action bar is outside that scroll box.
    const body = document.querySelector(".create-page-body");
    const footer = document.querySelector(".create-page-foot");
    expect(body).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(body?.contains(footer)).toBe(false);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Create" }).length).toBeGreaterThan(0);
  });

  it("moves through the sections with Back and Next and keeps typed details", async () => {
    render(<CreateInvitationPage />);

    fireEvent.change(screen.getByLabelText("Groom's name *"), { target: { value: "Ayaan" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(document.querySelector(".create-page-head-copy")?.textContent).toContain(
        "Step 2 of 8",
      );
    });
    expect(screen.getByRole("radio", { name: /Aladin/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Groom's name *")).toHaveValue("Ayaan");
    });
  });

  it("renders the live phone preview at 1:1 from the Preview step", async () => {
    render(<CreateInvitationPage />);
    fireEvent.click(screen.getByRole("button", { name: /^Preview$/ }));

    await waitFor(() => {
      expect(document.querySelector(".admin-preview-canvas")?.getAttribute("data-native")).toBe(
        "true",
      );
    });
    expect(document.querySelector(".device-frame-notch")).toBeNull();
    expect(document.querySelector(".device-frame-screen .personal-invite")).not.toBeNull();
  });

  it("sends the visitor back to the studio instead of leaving an orphaned page", async () => {
    render(<CreateInvitationPage />);
    fireEvent.click(screen.getByRole("button", { name: "Back to studio" }));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/dashboard" });
  });
});
