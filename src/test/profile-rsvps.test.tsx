import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Profile } from "@/routes/profile";

const mocks = vi.hoisted(() => ({
  user: { id: "owner-1", email: "shop@example.com" },
  cards: [] as { id: string; title: string; slug: string; status: "draft" | "published" }[],
  replies: [] as Record<string, unknown>[],
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: mocks.user, loading: false, signOut: vi.fn() }),
  getUsernameFromUser: () => "patna_print_house",
}));

vi.mock("@/lib/db", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "invitation_cards") {
        return {
          select: () => ({
            eq: () => ({ order: async () => ({ data: mocks.cards, error: null }) }),
          }),
        };
      }
      return {
        select: () => ({
          in: () => ({ order: async () => ({ data: mocks.replies, error: null }) }),
        }),
      };
    },
  },
}));

const reply = (
  card_id: string,
  name: string,
  attending: boolean,
  guests: number,
  dietary = "",
  message = "",
) => ({
  id: `${card_id}-${name}`,
  card_id,
  name,
  attending,
  guests,
  contact: "",
  dietary,
  message,
  created_at: "2026-11-01T10:00:00.000Z",
});

beforeEach(() => {
  mocks.cards = [
    { id: "card-a", title: "Ayesha & Imran", slug: "ayesha-imran", status: "published" },
    { id: "card-b", title: "Sana & Faiz", slug: "sana-faiz", status: "draft" },
  ];
  mocks.replies = [
    reply("card-a", "Uncle Ahmed", true, 3, "Vegetarian, Jain", "We are coming!"),
    reply("card-a", "Rizwan", true, 2, "vegetarian"),
    reply("card-a", "Nadeem", false, 0, "", "Sorry, travelling"),
    reply("card-b", "Sana's aunt", true, 1, "Halal"),
  ];
});

// readAsText strips the byte-order mark, so decode the raw bytes instead.
const readBlob = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(new TextDecoder("utf-8", { ignoreBOM: true }).decode(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });

const cardStats = (section: HTMLElement) => {
  const list = section.querySelector("dl");
  if (!list) throw new Error("no stats for card");
  return Object.fromEntries(
    [...list.querySelectorAll("dt")].map((term) => [
      term.textContent,
      term.nextElementSibling?.textContent,
    ]),
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Profile RSVPs", () => {
  it("summarises every reply and each card separately", async () => {
    render(<Profile />);

    // Overall: 4 responses, 3 accepting, 6 guests expected.
    await screen.findByText("Guest RSVPs");
    const overview = screen.getByRole("region", { name: "RSVP overview" });
    expect(within(overview).getByText("4")).toBeInTheDocument();
    expect(within(overview).getByText("3")).toBeInTheDocument();
    expect(within(overview).getByText("6")).toBeInTheDocument();

    const first = screen.getByRole("region", { name: "RSVPs for Ayesha & Imran" });
    expect(within(first).getByText(/3 responses/)).toBeInTheDocument();
    expect(cardStats(first)).toEqual({
      Attending: "2",
      Guests: "5",
      Declined: "1",
      "Dietary notes": "2",
    });
  });

  it("groups dietary notes across cards", async () => {
    render(<Profile />);
    const dietary = await screen.findByRole("region", { name: "Dietary summary" });
    expect(within(dietary).getByText("Vegetarian · 2")).toBeInTheDocument();
    expect(within(dietary).getByText("Jain · 1")).toBeInTheDocument();
    expect(within(dietary).getByText("Halal · 1")).toBeInTheDocument();
  });

  it("downloads that card's replies as an Excel-friendly CSV", async () => {
    const blobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((value) => {
      blobs.push(value as Blob);
      return "blob:rsvp";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<Profile />);
    const first = await screen.findByRole("region", { name: "RSVPs for Ayesha & Imran" });
    fireEvent.click(within(first).getByRole("button", { name: /CSV/ }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    await waitFor(() => expect(blobs).toHaveLength(1));
    const csv = await readBlob(blobs[0]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Guest name,Attending,Guests");
    expect(csv).toContain("Uncle Ahmed,Yes,3");
    expect(csv).toContain("Nadeem,No,0");
    expect(csv).toContain("Vegetarian, Jain");
    expect(csv).not.toContain("Sana's aunt");
  });

  it("exports every card's replies at once", async () => {
    const blobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((value) => {
      blobs.push(value as Blob);
      return "blob:all";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<Profile />);
    await screen.findByText("Guest RSVPs");
    fireEvent.click(screen.getByRole("button", { name: /Export all replies/ }));

    await waitFor(() => expect(blobs).toHaveLength(1));
    const csv = await readBlob(blobs[0]);
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(5); // header + 4 replies
    expect(csv).toContain("Sana's aunt");
  });
});
