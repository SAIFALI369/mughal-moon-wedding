import { existsSync, readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Home } from "@/routes/index";
import { DownloadAppPage } from "@/routes/download";
import { OfflineStudioPage } from "@/routes/offline-studio";
import {
  addOfflineDraftPhoto,
  clearOfflineDraftsMemoryForTests,
  createOfflineDraft,
  getOfflineDraftPhotos,
  getOfflineDraftsSync,
} from "@/lib/offline-studio";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import { buildOfflineLauncherHtml, OFFLINE_APP_VERSION } from "@/lib/pwa-install";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  user: null as { id: string } | null,
  insertSingle: vi.fn(),
  updateSingle: vi.fn(),
  rpc: vi.fn(),
  insertedPayload: null as Record<string, unknown> | null,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mocks.navigate,
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mocks.user,
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
  getUsernameFromUser: () => "patna-shop",
}));

vi.mock("@/lib/db", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mocks.rpc(...args),
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        mocks.insertedPayload = payload;
        return {
          select: () => ({
            single: () => mocks.insertSingle(),
          }),
        };
      },
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => mocks.updateSingle(),
            }),
          }),
        }),
      }),
    }),
  },
}));

function setOnline(next: boolean) {
  act(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: next,
    });
    window.dispatchEvent(new Event(next ? "online" : "offline"));
  });
}

beforeEach(() => {
  if (typeof globalThis.IntersectionObserver === "undefined") {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  }
  window.localStorage.clear();
  clearOfflineDraftsMemoryForTests();
  mocks.navigate.mockReset();
  mocks.rpc.mockReset();
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.user = null;
  mocks.insertedPayload = null;
  mocks.insertSingle.mockResolvedValue({
    data: {
      id: "c0000000-0000-4000-8000-000000000099",
      owner_id: "owner-1",
      title: "Ayaan & Zara",
      slug: "ayaan-zara-abcd1234",
      status: "draft",
      content: {},
      created_at: "2026-10-25T00:00:00.000Z",
      updated_at: "2026-10-25T00:00:00.000Z",
      published_at: null,
    },
    error: null,
  });
  mocks.updateSingle.mockResolvedValue({
    data: {
      id: "c0000000-0000-4000-8000-000000000099",
      owner_id: "owner-1",
      title: "Ayaan & Zara",
      slug: "ayaan-zara-abcd1234",
      status: "published",
      content: {},
      created_at: "2026-10-25T00:00:00.000Z",
      updated_at: "2026-10-25T00:00:00.000Z",
      published_at: "2026-10-25T00:00:00.000Z",
    },
    error: null,
  });
  setOnline(true);
});

afterEach(() => {
  cleanup();
  setOnline(true);
});

describe("Downloadable offline app & online-only publishing", () => {
  it("ships a valid standalone Web App Manifest, icons, and offline Service Worker", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as {
      display: string;
      start_url: string;
      icons: Array<{ src: string }>;
    };
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toContain("/offline-studio");
    for (const icon of manifest.icons) {
      expect(existsSync(`public${icon.src}`)).toBe(true);
    }

    const sw = readFileSync("public/sw.js", "utf8");
    expect(sw).toContain("invitingyou-offline-v5");
    expect(sw).toContain('"/offline-studio"');
    expect(sw).toContain('"/preview-frame"');
    expect(sw).toContain("FORCE_UPDATE_CACHE");
    expect(sw).toContain("supabase");
  });

  it("places the Download offline app section and footer link at the bottom of the landing page", () => {
    render(<Home />);
    const bottomSection = document.getElementById("download-app");
    expect(bottomSection).not.toBeNull();
    const downloadLinks = screen.getAllByRole("link", { name: /Download offline app/i });
    expect(downloadLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of downloadLinks) {
      expect(link).toHaveAttribute("href", "/download");
    }
    expect(screen.getByRole("link", { name: /Open offline studio/i })).toHaveAttribute(
      "href",
      "/offline-studio",
    );
  });

  it("generates an updated downloadable desktop/mobile launcher and cache refresh on /download", async () => {
    const html = buildOfflineLauncherHtml("https://invitation.cashiea.app");
    expect(html).toContain(
      `https://invitation.cashiea.app/offline-studio?source=launcher&v=${OFFLINE_APP_VERSION}`,
    );

    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:launcher");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<DownloadAppPage />);
    expect(screen.getByRole("button", { name: /Update offline cache/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Download Offline App/i }));

    await waitFor(() => {
      expect(createObjectUrl).toHaveBeenCalledTimes(1);
      expect(anchorClick).toHaveBeenCalledTimes(1);
    });

    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
    anchorClick.mockRestore();
  });

  it("allows native scrolling in phone and desktop previews without touchmove scroll-lock traps", async () => {
    const prevWidth = window.innerWidth;
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: 375,
      });
      window.dispatchEvent(new Event("resize"));
    });

    try {
      createOfflineDraft({
        title: "Scrollable Phone Preview",
        content: invitationContentSchema.parse({
          groomName: "Ayaan",
          brideName: "Zara",
          date: "20/12/2026",
          time: "7:00 PM",
          venue: "Patna Club",
          address: "Patna, Bihar",
          theme: "royal-rajmahal",
          framework: "royal-folio",
        }),
      });

      render(<OfflineStudioPage />);
      fireEvent.click(screen.getByRole("button", { name: /^Preview$/i }));

      const dialog = await screen.findByRole("dialog", {
        name: /Scrollable Phone Preview/i,
      });
      expect(document.body.getAttribute("data-scroll-locked")).toBeNull();
      expect(document.body.style.overflow).toBe("hidden");

      const canvas = dialog.querySelector(".admin-preview-canvas.is-native-phone");
      expect(canvas).not.toBeNull();
      const inviteRoot = dialog.querySelector(".personal-invite");
      expect(inviteRoot?.className).toContain("overflow-x-clip");
      expect(inviteRoot?.className).not.toContain("overflow-x-hidden");

      fireEvent.click(screen.getAllByRole("button", { name: /Close/i })[0]);
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /Scrollable Phone Preview/i })).toBeNull();
      });
      expect(document.body.style.overflow).toBe("");
    } finally {
      act(() => {
        Object.defineProperty(window, "innerWidth", {
          configurable: true,
          writable: true,
          value: prevWidth,
        });
        window.dispatchEvent(new Event("resize"));
      });
    }
  });

  it("creates and saves drafts 100% offline, blocks publishing offline, and publishes once online", async () => {
    setOnline(false);

    render(<OfflineStudioPage />);
    expect(screen.getByRole("status")).toHaveTextContent(/Offline · Drafts saved on device/i);

    fireEvent.click(screen.getByRole("button", { name: /New offline draft/i }));
    fireEvent.change(screen.getByLabelText(/Card title/i), {
      target: { value: "Ayaan & Zara Wedding" },
    });
    fireEvent.change(screen.getByLabelText(/Groom's name/i), {
      target: { value: "Ayaan" },
    });
    fireEvent.change(screen.getByLabelText(/Bride's name/i), {
      target: { value: "Zara" },
    });
    fireEvent.change(screen.getByLabelText(/^Date \*/i), {
      target: { value: "18/12/2026" },
    });
    fireEvent.change(screen.getByLabelText(/^Time \*/i), {
      target: { value: "7:00 PM" },
    });
    fireEvent.change(screen.getByLabelText(/^Venue \*/i), {
      target: { value: "Maurya Palace, Patna" },
    });
    fireEvent.change(screen.getByLabelText(/^Address \/ City/i), {
      target: { value: "Patna, Bihar" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save offline/i }));

    expect(getOfflineDraftsSync()).toHaveLength(1);
    expect(await screen.findByText("Ayaan & Zara Wedding")).toBeInTheDocument();
    expect(mocks.insertSingle).not.toHaveBeenCalled();

    // Attempting to publish while offline is blocked cleanly
    fireEvent.click(screen.getByRole("button", { name: /^Publish$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Internet connection is required to publish/i,
    );
    expect(mocks.insertSingle).not.toHaveBeenCalled();
    expect(getOfflineDraftsSync()).toHaveLength(1);

    // Reconnect to internet without account -> prompts partner sign-in while keeping draft safe
    setOnline(true);
    fireEvent.click(screen.getByRole("button", { name: /^Publish$/i }));
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/sign-in",
        search: { redirect: "/offline-studio" },
      });
    });
    expect(getOfflineDraftsSync()).toHaveLength(1);
  });

  it("uploads and publishes an offline draft to the cloud when online and signed in", async () => {
    mocks.user = { id: "owner-1" };
    setOnline(true);

    const draft = createOfflineDraft({
      title: "Ayaan & Zara",
      content: invitationContentSchema.parse({
        groomName: "Ayaan",
        brideName: "Zara",
        date: "20/12/2026",
        time: "7:00 PM",
        venue: "Patna Club",
        address: "Patna, Bihar",
        theme: "royal-rajmahal",
        framework: "royal-folio",
      }),
    });
    addOfflineDraftPhoto(draft.id, "data:image/jpeg;base64,/9j/4AAQSkZJRg==", "Nikah stage");
    expect(getOfflineDraftPhotos(draft.id)).toHaveLength(1);

    render(<OfflineStudioPage />);
    expect(screen.getByText("Ayaan & Zara")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Publish$/i }));

    await waitFor(() => {
      expect(mocks.insertSingle).toHaveBeenCalledTimes(1);
      expect(mocks.rpc).toHaveBeenCalledWith("add_invitation_photo", {
        p_card_id: "c0000000-0000-4000-8000-000000000099",
        photo_data: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        photo_caption: "Nikah stage",
      });
      expect(mocks.updateSingle).toHaveBeenCalledTimes(1);
    });
    expect(getOfflineDraftsSync()).toHaveLength(0);
    expect(getOfflineDraftPhotos(draft.id)).toHaveLength(0);
    expect(await screen.findByText(/is now live/i)).toBeInTheDocument();
  });
});
