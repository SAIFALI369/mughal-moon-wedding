// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAssistant } from "@/components/wedding/host-assistant";

const { invoke, askHostAssistantServer } = vi.hoisted(() => ({
  invoke: vi.fn(),
  askHostAssistantServer: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/components/wedding/concierge.functions", () => ({ askHostAssistantServer }));

const slug = "our-day-a1b2c3d4";

function renderAssistant() {
  return render(<HostAssistant slug={slug} name="Farah Khan" coupleLabel="Ayaan & Zara" />);
}

async function ask(question: string) {
  fireEvent.change(screen.getByLabelText("Ask Farah Khan a question"), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send question to Farah Khan" }));
}

beforeEach(() => {
  invoke.mockReset();
  askHostAssistantServer.mockReset();
  // jsdom does not implement scrolling into view.
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => cleanup());

describe("per-card AI assistant", () => {
  it("is named after the host and never presents itself as Simran", () => {
    renderAssistant();
    const launcher = screen.getByRole("button", {
      name: "Ask Farah Khan, the AI assistant for this invitation",
    });
    expect(launcher).toHaveTextContent("Ask Farah Khan");
    expect(launcher).not.toHaveTextContent(/simran/i);
    fireEvent.click(launcher);
    expect(
      screen.getByRole("complementary", { name: /AI assistant for this invitation/ }),
    ).toHaveTextContent("AI assistant for Ayaan & Zara");
    expect(document.body.textContent).not.toMatch(/Simran|Mohsin/);
  });

  it("asks the Edge Function with this card's slug, and shows the reply", async () => {
    invoke.mockResolvedValue({
      data: { reply: "The celebration starts at 4:00 PM." },
      error: null,
    });
    renderAssistant();
    fireEvent.click(screen.getByRole("button", { name: /Ask Farah Khan/ }));
    await ask("When is it?");
    expect(await screen.findByText("The celebration starts at 4:00 PM.")).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith(
      "wedding-concierge",
      expect.objectContaining({
        body: expect.objectContaining({
          card: slug,
          messages: [{ role: "user", content: "When is it?" }],
        }),
      }),
    );
    expect(askHostAssistantServer).not.toHaveBeenCalled();
  });

  it("falls back to the server function when the Edge Function is unavailable", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Function not deployed") });
    askHostAssistantServer.mockResolvedValue({ reply: "Dress code: pastel colours." });
    renderAssistant();
    fireEvent.click(screen.getByRole("button", { name: /Ask Farah Khan/ }));
    await ask("Dress code?");
    expect(await screen.findByText("Dress code: pastel colours.")).toBeInTheDocument();
    expect(askHostAssistantServer).toHaveBeenCalledWith({
      data: { slug, messages: [{ role: "user", content: "Dress code?" }] },
    });
  });

  it("offers a retry when both paths fail, and retries the same question", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Network down") });
    askHostAssistantServer.mockRejectedValueOnce(new Error("Network down"));
    renderAssistant();
    fireEvent.click(screen.getByRole("button", { name: /Ask Farah Khan/ }));
    await ask("Where is the venue?");
    expect(
      await screen.findByText(/couldn't reach Farah Khan's assistant right now/),
    ).toBeInTheDocument();

    askHostAssistantServer.mockResolvedValueOnce({ reply: "The venue is Garden Pavilion." });
    fireEvent.click(screen.getByRole("button", { name: "Retry last question" }));
    expect(await screen.findByText("The venue is Garden Pavilion.")).toBeInTheDocument();
    await waitFor(() => expect(askHostAssistantServer).toHaveBeenCalledTimes(2));
    // The failed attempt is replaced, not duplicated.
    expect(screen.queryByText(/couldn't reach/)).not.toBeInTheDocument();
  });

  it("uses the visitor-limit message from the server verbatim", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new Error("You have used all 5 messages for today with this invitation's assistant."),
    });
    renderAssistant();
    fireEvent.click(screen.getByRole("button", { name: /Ask Farah Khan/ }));
    await ask("One more?");
    expect(
      await screen.findByText(/You have used all 5 messages for today with this invitation/),
    ).toBeInTheDocument();
    expect(askHostAssistantServer).not.toHaveBeenCalled();
  });
});
