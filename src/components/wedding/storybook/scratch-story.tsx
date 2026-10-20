import { useEffect, useRef, useState } from "react";
import { ScrollText } from "lucide-react";
import type { InvitationDetails } from "../invitation-details";
export function ScratchStory({ details }: { details: InvitationDetails }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const down = useRef(false);
  const cells = useRef(new Set<string>());
  const last = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (revealed || !window.CanvasRenderingContext2D) return;
    const element = canvas.current;
    if (!element) return;
    const paint = () => {
      const width = element.clientWidth,
        height = element.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = width * ratio;
      element.height = height * ratio;
      const ctx = element.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.fillStyle = getComputedStyle(element).getPropertyValue("--sb-accent").trim() || "#9b6e29";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#fff9ef";
      ctx.textAlign = "center";
      ctx.font = "24px Georgia";
      ctx.fillText("We just met…", width / 2, height / 2 - 16);
      ctx.font = "14px sans-serif";
      ctx.fillText("Rub here to discover our story", width / 2, height / 2 + 22);
      cells.current.clear();
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(element);
    return () => observer.disconnect();
  }, [revealed]);
  return (
    <div className="sb-scratch-wrap">
      <div className="sb-scratch">
        <div className="sb-scratch-under" aria-hidden={!revealed}>
          <div className="sb-story-photos">
            {[details.groomPhoto, details.bridePhoto].filter(Boolean).map((photo, i) => (
              <img
                key={i}
                src={photo!}
                alt={i ? details.brideName : details.groomName}
                loading="lazy"
              />
            ))}
          </div>
          <ScrollText aria-hidden="true" />
          <p>{details.story || details.message || "Our next chapter begins with you."}</p>
        </div>
        {!revealed && (
          <canvas
            ref={canvas}
            aria-label="Scratch to reveal the couple’s story"
            onPointerDown={(e) => {
              down.current = true;
              last.current = null;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={() => {
              down.current = false;
              last.current = null;
            }}
            onPointerCancel={() => {
              down.current = false;
            }}
            onPointerMove={(e) => {
              if (!down.current) return;
              const el = e.currentTarget,
                rect = el.getBoundingClientRect();
              const x = e.clientX - rect.left,
                y = e.clientY - rect.top;
              const ctx = el.getContext("2d");
              if (!ctx) return;
              ctx.globalCompositeOperation = "destination-out";
              ctx.lineWidth = 58;
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(last.current?.x ?? x, last.current?.y ?? y);
              ctx.lineTo(x, y);
              ctx.stroke();
              last.current = { x, y };
              cells.current.add(
                `${Math.floor(x / (rect.width / 10))}:${Math.floor(y / (rect.height / 10))}`,
              );
              if (cells.current.size >= 28) {
                setRevealed(true);
                down.current = false;
              }
            }}
          />
        )}
      </div>
      <button className="sb-text-button" onClick={() => setRevealed((v) => !v)}>
        {revealed ? "Cover the memory again" : "Reveal without scratching"}
      </button>
      <p className="sb-hint" role="status">
        {revealed
          ? "A memory uncovered. Keep turning the pages."
          : "Scratch with a finger, or use the reveal button."}
      </p>
    </div>
  );
}
