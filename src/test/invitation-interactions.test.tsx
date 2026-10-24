// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvitationDetailsFields } from "@/components/wedding/invitation-form";
import {
  emptyInvitationForm,
  isCardCoupleLocked,
  preserveLockedCoupleIdentity,
} from "@/components/wedding/invitation-form-data";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import { InvitationMusicPlayer } from "@/components/wedding/invitation-music-player";
import { PhoneViewportFrame } from "@/components/platform/invitation-preview";
import { InvitationRsvp } from "@/components/wedding/invitation-rsvp";

const { insert, from } = vi.hoisted(() => ({
  insert: vi.fn(async () => ({ error: null })),
  from: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ supabase: { from } }));

function Editor({
  compact = false,
  coupleLocked = false,
}: {
  compact?: boolean;
  coupleLocked?: boolean;
}) {
  const [value, onChange] = useState(() => ({
    ...emptyInvitationForm(),
    ...(coupleLocked ? { title: "Ayaan & Zara", groomName: "Ayaan", brideName: "Zara" } : {}),
  }));
  return (
    <InvitationDetailsFields
      compact={compact}
      coupleLocked={coupleLocked}
      value={value}
      onChange={onChange}
    />
  );
}

beforeEach(() => {
  window.localStorage.clear();
  from.mockReturnValue({ insert });
  insert.mockClear();
  from.mockClear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("invitation editor and guest reply", () => {
  it("shows one compact editor section at a time and preserves entries between sections", () => {
    render(<Editor compact />);
    fireEvent.change(screen.getByLabelText("Groom's name *"), { target: { value: "Ayaan" } });
    expect(screen.queryByRole("radio", { name: /Aladin/i })).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Design" }), { button: 0, ctrlKey: false });
    expect(screen.queryByLabelText("Groom's name *")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Aladin/i }));
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Details" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByLabelText("Groom's name *")).toHaveValue("Ayaan");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Design" }), { button: 0, ctrlKey: false });
    expect(screen.getByRole("radio", { name: /Aladin/i })).toBeChecked();
  });

  it("shows phone and desktop preview options on desktop and only phone preview on mobile in the editor", async () => {
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: 1200,
      });
      window.dispatchEvent(new Event("resize"));
    });
    render(<Editor compact />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Preview" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByRole("button", { name: "Phone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desktop" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Desktop" }));
    expect(document.querySelector('[data-preview-device="desktop"]')).not.toBeNull();

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: 390,
      });
      window.dispatchEvent(new Event("resize"));
    });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Desktop" })).not.toBeInTheDocument();
    });
    expect(document.querySelector('[data-preview-device="phone"]')).not.toBeNull();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    });
  });

  it("changes theme, framework and section visibility separately in the live cover", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("radio", { name: /Aladin/i }));
    fireEvent.click(screen.getByRole("radio", { name: /Cinematic Stage/i }));
    expect(screen.getByRole("radio", { name: /Aladin/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Cinematic Stage/i })).toBeChecked();
    expect(
      document.querySelector(
        '.personal-invite-cover[data-theme="aladin"][data-framework="cinematic-stage"]',
      ),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Guest RSVP/i }));
    expect(screen.getByRole("checkbox", { name: /Guest RSVP/i })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /Add event/i }));
    expect(screen.getByLabelText("Event name *")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Remove event/i }));
    expect(screen.queryByLabelText("Event name *")).not.toBeInTheDocument();
  });

  it("compresses an optional image before inserting its JPEG data URL into the card preview, and can remove it", async () => {
    const jpeg = "data:image/jpeg;base64,/9j/2Q==";
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 600;
        naturalHeight = 800;
        onload: null | (() => void) = null;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    vi.stubGlobal("URL", { createObjectURL: () => "blob:preview", revokeObjectURL: () => {} });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "",
      fillRect: () => {},
      drawImage: () => {},
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(jpeg);
    render(<Editor />);
    const photo = new File(["image-bytes"], "portrait.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose groom photo"), { target: { files: [photo] } });
    expect(await screen.findByAltText("Groom portrait preview")).toHaveAttribute("src", jpeg);
    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(screen.queryByAltText("Groom portrait preview")).not.toBeInTheDocument();
  });

  it("sends only the current guest's validated RSVP as an insert, never a SELECT", async () => {
    const cardId = "c0000000-0000-4000-8000-000000000001";
    render(<InvitationRsvp cardId={cardId} />);
    fireEvent.change(screen.getByLabelText("Your full name *"), {
      target: { value: "  Ayesha   Khan  " },
    });
    fireEvent.change(screen.getByLabelText("Email or phone (optional)"), {
      target: { value: "guest@example.invalid" },
    });
    fireEvent.click(screen.getByText("Regretfully declines"));
    fireEvent.click(screen.getByRole("button", { name: /Send my reply/i }));
    await waitFor(() => expect(insert).toHaveBeenCalledOnce());
    expect(from).toHaveBeenCalledWith("invitation_rsvps");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        card_id: cardId,
        name: "Ayesha Khan",
        attending: false,
        guests: 0,
        contact: "guest@example.invalid",
        dietary: "",
      }),
    );
    expect(screen.getByText(/Thank you for replying/)).toBeInTheDocument();
  });

  it("accepts only one reply per device and remembers it after a reload", async () => {
    const cardId = "c0000000-0000-4000-8000-000000000002";
    const first = render(<InvitationRsvp cardId={cardId} />);
    fireEvent.change(screen.getByLabelText("Your full name *"), {
      target: { value: "Ayesha Khan" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send my reply/i }));
    await waitFor(() => expect(insert).toHaveBeenCalledOnce());
    first.unmount();

    render(<InvitationRsvp cardId={cardId} />);
    expect(await screen.findByText(/already with the host/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Your full name *")).not.toBeInTheDocument();
    expect(insert).toHaveBeenCalledOnce();
  });

  it("locks couple names and card title after publish while keeping design and music editable", () => {
    expect(isCardCoupleLocked({ status: "draft", published_at: null })).toBe(false);
    expect(isCardCoupleLocked({ status: "published", published_at: null })).toBe(true);
    expect(isCardCoupleLocked({ status: "draft", published_at: "2026-10-24T00:00:00.000Z" })).toBe(
      true,
    );

    const preserved = preserveLockedCoupleIdentity(
      "New Couple",
      { ...emptyInvitationForm(), groomName: "Rahul", brideName: "Priya", theme: "aladin" },
      {
        status: "published",
        published_at: "2026-10-24T00:00:00.000Z",
        title: "Ayaan & Zara",
        content: { groomName: "Ayaan", brideName: "Zara" },
      },
    );
    expect(preserved.title).toBe("Ayaan & Zara");
    expect(preserved.content.groomName).toBe("Ayaan");
    expect(preserved.content.brideName).toBe("Zara");
    expect(preserved.content.theme).toBe("aladin");

    render(<Editor compact coupleLocked />);
    expect(
      screen.getByText(/Couple names and card title are locked after publishing/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Card title/i)).toBeDisabled();
    expect(screen.getByLabelText(/Groom's name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Bride's name/i)).toBeDisabled();

    // Design and Music remain editable
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Design" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("radio", { name: /Aladin/i }));
    expect(screen.getByRole("radio", { name: /Aladin/i })).toBeChecked();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Music" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("button", { name: /Add song link/i }));
    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Wedding Song" } });
    fireEvent.change(screen.getByLabelText("Song link *"), {
      target: { value: "https://youtu.be/dQw4w9WgXcQ" },
    });
    expect(screen.getByText("YouTube")).toBeInTheDocument();
  });

  it("shows the 26th November 2029 date format error on invalid dates and accepts ordinal dates", () => {
    render(<Editor compact />);
    const dateInput = screen.getByLabelText("Date *");
    fireEvent.change(dateInput, { target: { value: "invalid date" } });
    expect(
      screen.getByText("Date should be in this format: 26th November 2029"),
    ).toBeInTheDocument();

    fireEvent.change(dateInput, { target: { value: "26th November 2029" } });
    expect(
      screen.queryByText("Date should be in this format: 26th November 2029"),
    ).not.toBeInTheDocument();
  });

  it("plays YouTube and Spotify soundtrack embeds and keeps them mounted when minimized", () => {
    const details = getInvitationDetails({
      groomName: "Ayaan",
      brideName: "Zara",
      date: "26th November 2029",
      songs: [
        { title: "YouTube Qawwali", url: "https://youtu.be/dQw4w9WgXcQ" },
        {
          title: "Spotify Track",
          url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=123",
        },
      ],
    });
    render(<InvitationMusicPlayer details={details} />);
    fireEvent.click(screen.getByRole("button", { name: "Open the invitation soundtrack" }));
    expect(document.querySelector("iframe")).toBeNull();

    // Activate YouTube track
    fireEvent.click(screen.getByRole("button", { name: "Play music" }));
    const ytFrame = document.querySelector("iframe.invite-music-embed-youtube");
    expect(ytFrame).not.toBeNull();
    expect(ytFrame?.getAttribute("src")).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");

    // Closing the floating panel keeps the YouTube embed mounted so music keeps playing
    fireEvent.click(screen.getByRole("button", { name: "Close music panel" }));
    expect(document.querySelector("iframe.invite-music-embed-youtube")).not.toBeNull();

    // Reopen and switch to Spotify track
    fireEvent.click(screen.getByRole("button", { name: "Open the invitation soundtrack" }));
    fireEvent.click(screen.getByRole("button", { name: /Spotify Track/i }));
    const spFrame = document.querySelector("iframe.invite-music-embed-spotify");
    expect(spFrame).not.toBeNull();
    expect(spFrame?.getAttribute("src")).toContain(
      "open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
    );
  });

  it("renders a real same-origin mobile viewport iframe in desktop browsers", () => {
    const uaSpy = vi
      .spyOn(window.navigator, "userAgent", "get")
      .mockReturnValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36");
    render(
      <PhoneViewportFrame
        title="Ayaan & Zara"
        content={{ groomName: "Ayaan", brideName: "Zara", date: "26th November 2029" }}
      />,
    );
    const iframe = document.querySelector("iframe.preview-phone-iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toMatch(/^\/preview-frame\?key=invitingyou-preview-/);
    uaSpy.mockRestore();
  });

  it("refuses numbers, initials and placeholder names before writing anything", async () => {
    const cardId = "c0000000-0000-4000-8000-000000000003";
    render(<InvitationRsvp cardId={cardId} />);
    for (const bad of ["12345", "A", "test", "guest"]) {
      fireEvent.change(screen.getByLabelText("Your full name *"), { target: { value: bad } });
      fireEvent.click(screen.getByRole("button", { name: /Send my reply/i }));
      await waitFor(() => expect(insert).not.toHaveBeenCalled());
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    }
    expect(insert).not.toHaveBeenCalled();
  });
});
