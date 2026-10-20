import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Dashboard } from "@/routes/dashboard";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  order: vi.fn(),
  navigate: vi.fn(),
  user: { id: "current-owner" },
  rows: [] as Record<string, unknown>[],
  creditsUsed: 0,
  active: true,
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mocks.navigate,
  Link: ({
    to,
    children,
    hash: _hash,
    ...props
  }: {
    to: string;
    children: ReactNode;
    hash?: string;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: mocks.user, loading: false, signOut: vi.fn() }),
  getUsernameFromUser: () => "Ayesha",
}));
vi.mock("@/lib/db", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ error: null }),
    from: (table: string) =>
      table === "print_partners"
        ? {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    shop_name: "Patna Print House",
                    cards_purchased: 10,
                    cards_created: mocks.creditsUsed,
                    active: mocks.active,
                  },
                  error: null,
                }),
              }),
            }),
          }
        : { select: () => ({ eq: mocks.eq }) },
  },
}));
vi.mock("@/components/wedding/invitation-form", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/wedding/invitation-form")>()),
  InvitationDetailsFields: ({ value }: { value: { theme: string } }) => (
    <div data-testid="editor-theme">{value.theme}</div>
  ),
}));
vi.mock("@/components/wedding/invitation-template", () => ({
  InvitationCover: () => <div>Invitation cover</div>,
  PersonalInvitation: () => <div>Invitation preview</div>,
}));

beforeEach(() => {
  mocks.rows = [];
  mocks.creditsUsed = 0;
  mocks.active = true;
  mocks.eq.mockReturnValue({ order: mocks.order });
  mocks.order.mockImplementation(async () => ({ data: mocks.rows, error: null }));
});

describe("Personal invitation workspace", () => {
  it("loads only the current owner's cards and shows real empty counts", async () => {
    render(<Dashboard />);
    await screen.findByText("Your next customer’s story starts here.");
    expect(mocks.eq).toHaveBeenCalledWith("owner_id", "current-owner");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Welcome back, Patna Print House.",
    );
    expect(screen.getByText("0 active invitations")).toBeInTheDocument();
    expect(screen.queryByTestId("editor-theme")).not.toBeInTheDocument();
  });

  it("opens and dismisses the private draft editor", async () => {
    render(<Dashboard />);
    await screen.findByText("Your next customer’s story starts here.");
    fireEvent.click(screen.getByRole("button", { name: "Create invitation" }));
    expect(screen.getByTestId("editor-theme")).toHaveTextContent("eid");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("editor-theme")).not.toBeInTheDocument();
  });

  it("starts a draft using the selected real theme", async () => {
    render(<Dashboard />);
    await screen.findByText("Your next customer’s story starts here.");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Templates" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(screen.getByRole("button", { name: /Mughal Night/ }));
    expect(screen.getByTestId("editor-theme")).toHaveTextContent("mughal");
  });

  it("disables new invitations when ten lifetime credits have been spent", async () => {
    mocks.creditsUsed = 10;
    mocks.rows = Array.from({ length: 3 }, (_, index) => ({
      id: `card-${index}`,
      title: `Celebration ${index}`,
      slug: `celebration-${index}`,
      status: "draft",
      content: {},
      created_at: "2026-10-19",
      updated_at: "2026-10-19",
    }));
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText("3 active invitations")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Create invitation" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(3);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Templates" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByRole("button", { name: /Mughal Night/ })).toBeDisabled();
  });
  it("keeps package details and templates off the default invitation screen", async () => {
    render(<Dashboard />);
    await screen.findByText("Your next customer’s story starts here.");
    expect(screen.queryByRole("region", { name: "Partner card package" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mughal Night/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Credits & access" }));
    expect(screen.getByRole("region", { name: "Partner card package" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "My invitations" }));
    expect(screen.getByLabelText("Search invitations")).toBeInTheDocument();
  });

  it("paginates short rows and filters without appending a long page", async () => {
    mocks.rows = Array.from({ length: 8 }, (_, index) => ({
      id: `card-${index}`,
      title: `Customer ${index}`,
      slug: `customer-${index}`,
      status: "draft",
      content: {},
      created_at: "2026-10-19",
      updated_at: "2026-10-19",
    }));
    render(<Dashboard />);
    await screen.findByText("8 active invitations");
    expect(screen.getAllByRole("article")).toHaveLength(6);
    expect(screen.queryByText("Customer 6")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByText("Customer 6")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search invitations"), {
      target: { value: "Customer 7" },
    });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter invitations by status"), {
      target: { value: "published" },
    });
    expect(screen.getByText("No invitations match your search.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });
});
