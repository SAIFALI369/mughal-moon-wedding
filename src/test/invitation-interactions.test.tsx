// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvitationDetailsFields } from "@/components/wedding/invitation-form";
import { emptyInvitationForm } from "@/components/wedding/invitation-form-data";
import { InvitationRsvp } from "@/components/wedding/invitation-rsvp";

const { insert, from } = vi.hoisted(() => ({
  insert: vi.fn(async () => ({ error: null })),
  from: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ supabase: { from } }));

function Editor({ compact = false }: { compact?: boolean }) {
  const [value, onChange] = useState(emptyInvitationForm);
  return <InvitationDetailsFields compact={compact} value={value} onChange={onChange} />;
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
