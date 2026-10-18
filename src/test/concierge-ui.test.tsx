import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConciergeControls,
  ConciergeMessage,
  ConciergeThinking,
} from "@/components/wedding/concierge-ui";
import { validatePhoto } from "@/components/wedding/photo-utils";

afterEach(cleanup);
describe("chat and photo accessibility", () => {
  it("offers retry and clear controls and respects in-flight requests", () => {
    const retry = vi.fn(),
      clear = vi.fn();
    const { rerender } = render(
      <ConciergeControls
        language="English"
        busy={false}
        hasMessages
        failed
        onRetry={retry}
        onClear={clear}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry last question" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear conversation" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
    rerender(
      <ConciergeControls
        language="English"
        busy
        hasMessages
        failed
        onRetry={retry}
        onClear={clear}
      />,
    );
    expect(screen.getByRole("button", { name: "Retry last question" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear conversation" })).toBeDisabled();
  });
  it("does not show empty controls", () => {
    render(
      <ConciergeControls
        language="English"
        busy={false}
        hasMessages={false}
        failed={false}
        onRetry={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("announces typing and opens map links safely", () => {
    render(
      <>
        <ConciergeThinking label="Checking the invitation…" />
        <ConciergeMessage text="Directions: https://www.google.com/maps/search/?api=1&query=Delhi" />
      </>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Checking the invitation");
    expect(screen.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
  });
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (type) =>
    expect(() => validatePhoto({ type, size: 10000 })).not.toThrow(),
  );
  it("rejects empty, oversized and active-content uploads", () => {
    expect(() => validatePhoto({ type: "image/jpeg", size: 0 })).toThrow("empty");
    expect(() => validatePhoto({ type: "image/jpeg", size: 11 * 1024 * 1024 })).toThrow("10 MB");
    expect(() => validatePhoto({ type: "image/svg+xml", size: 1000 })).toThrow("JPG, PNG or WebP");
  });
});
