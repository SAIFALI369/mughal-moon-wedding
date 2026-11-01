import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Home } from "@/routes/index";
import { themeDemos } from "@/config/theme-demos";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: vi.fn(), getUsernameFromUser: () => "test-host" }));
vi.mock("@/routes/dashboard", () => ({
  Dashboard: () => <main>Your personal invitation dashboard</main>,
}));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
  });
});

describe("Creator homepage", () => {
  it("welcomes visitors to the platform, not a couple's invitation", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your shop.");
    expect(screen.getByRole("link", { name: "Partner sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.queryByText(/Mohsin|Simran/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore the experience" })).toHaveAttribute(
      "href",
      "/demo",
    );
  });

  it("provides real account routes and a collection anchor", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "My invitations" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    // One entry point to the collection — it used to be listed twice.
    expect(screen.getByRole("link", { name: /Theme demos/ })).toHaveAttribute("href", "/themes");
    expect(screen.queryByRole("link", { name: /Template collection/ })).toBeNull();
    expect(document.getElementById("collection")).toBeInTheDocument();
  });

  it("shows one complete demo card per theme, each opening its own page", () => {
    render(<Home />);
    const demos = screen.getAllByRole("link", { name: /demo invitation for/ });
    expect(demos).toHaveLength(themeDemos.length);
    for (const demo of demos) expect(demo).toHaveAttribute("href", "/theme/$themeId");
    // The old illustrative "style inspiration" cards are gone for good.
    expect(screen.queryByText("STYLE INSPIRATION")).not.toBeInTheDocument();
  });

  it("keeps a phone screen short: four featured demos and one way to the rest", () => {
    // A 390 px handset must not scroll through twenty-two full-height posters.
    const originalWidth = window.innerWidth;
    const originalMatch = window.matchMedia;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: /max-width:\s*767px/.test(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    try {
      render(<Home />);
      const demos = screen.getAllByRole("link", { name: /demo invitation for/ });
      expect(demos).toHaveLength(4);
      expect(
        screen.getByRole("link", { name: `See all ${themeDemos.length} demos` }),
      ).toHaveAttribute("href", "/themes");
      // The floating artwork chips are decoration that costs scroll on a phone.
      expect(document.querySelectorAll(".studio-art-chip")).toHaveLength(2);
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
      window.matchMedia = originalMatch;
    }
  });

  it("opens and closes the mobile navigation accessibly", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getAllByRole("button", { name: "Close navigation" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Close navigation" })[0]).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Close navigation" })[0]);
    expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("shows signed-in users their personal dashboard at the main URL", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "owner" } as never,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
    render(<Home />);
    expect(screen.getByText("Your personal invitation dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Partner sign in" })).not.toBeInTheDocument();
  });
});
