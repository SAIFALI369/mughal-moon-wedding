import { Sparkles } from "lucide-react";

export function ConciergeAvatar() {
  return (
    <span className="concierge-avatar" aria-hidden="true">
      <Sparkles size={24} />
    </span>
  );
}

export function ConciergeThinking({ label }: { label: string }) {
  return (
    <span className="concierge-thinking" role="status">
      <span aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {label}
    </span>
  );
}

export function ConciergeMessage({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https:\/\/www\.google\.com\/maps\/[^\s]+)/g).map((part, index) =>
        part.startsWith("https://www.google.com/maps/") ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="concierge-map-link"
          >
            Open in Google Maps ↗
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

export function ConciergeControls({
  language,
  busy,
  hasMessages,
  failed,
  onRetry,
  onClear,
}: {
  language: string;
  busy: boolean;
  hasMessages: boolean;
  failed: boolean;
  onRetry: () => void;
  onClear: () => void;
}) {
  const labels =
    language === "हिन्दी"
      ? ["फिर कोशिश करें", "चैट साफ़ करें"]
      : language === "اردو"
        ? ["دوبارہ کوشش کریں", "چیٹ صاف کریں"]
        : ["Retry last question", "Clear conversation"];
  if (!hasMessages) return null;
  return (
    <div className="my-3 flex flex-wrap gap-4 text-xs">
      {failed && (
        <button
          type="button"
          className="font-semibold text-primary underline underline-offset-4 disabled:opacity-50"
          disabled={busy}
          onClick={onRetry}
        >
          {labels[0]}
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onClear}
        className="text-muted-foreground underline underline-offset-4 disabled:opacity-50"
      >
        {labels[1]}
      </button>
    </div>
  );
}
