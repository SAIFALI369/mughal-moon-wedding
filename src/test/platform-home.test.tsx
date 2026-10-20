import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Home } from "@/routes/index";

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
    expect(screen.getByRole("link", { name: /Template collection/ })).toHaveAttribute(
      "href",
      "#collection",
    );
    expect(document.getElementById("collection")).toBeInTheDocument();
    expect(screen.getAllByText("STYLE INSPIRATION")).toHaveLength(3);
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
