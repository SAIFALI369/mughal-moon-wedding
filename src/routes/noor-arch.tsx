import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import gateVideo from "@/assets/noor-arch-gate.mp4.asset.json";
import finalFrame from "@/assets/noor-arch-final.jpg.asset.json";
import coverFrame from "@/assets/noor-arch-cover.jpg.asset.json";
import { EVENTS, WEDDING_HASHTAG } from "@/components/wedding/config";
import { getSiteOrigin } from "@/lib/site-origin";
import { buildSiteSocialMeta, themeOgImage } from "@/lib/social-preview";

export const Route = createFileRoute("/noor-arch")({
  loader: async () => ({ siteOrigin: await getSiteOrigin() }),
  head: ({ loaderData }) => ({
    meta: buildSiteSocialMeta({
      title: "Noor Archway — Mohsin & Simran's Invitation",
      description:
        "Open the sealed invitation and step through the lantern-lit archway to Mohsin & Simran's Nikah, Barat and Walima.",
      origin: loaderData?.siteOrigin,
      path: "/noor-arch",
      imagePath: themeOgImage("eid", loaderData?.siteOrigin).url,
    }),
  }),
  component: NoorArch,
});

type Phase = "closed" | "playing" | "done";

const scenes = [
  {
    kicker: "بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    title: "Mohsin & Simran",
    body: "With the blessings of Allah, we invite you to celebrate our union.",
  },
  ...EVENTS.map((e) => ({
    kicker: e.date,
    title: e.title,
    body: `${e.time} · ${e.venue}, ${e.address} · Dress: ${e.dress}`,
  })),
];

function NoorArch() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("closed");

  const open = () => {
    const v = videoRef.current;
    if (!v || phase !== "closed") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setPhase("done");
    setPhase("playing");
    v.play().catch(() => setPhase("done"));
  };

  const revealed = phase === "done";

  return (
    <main className="relative min-h-svh bg-background text-foreground">
      {/* Fixed background: the video, which freezes on its last frame */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src={finalFrame.url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <video
          ref={videoRef}
          src={gateVideo.url}
          poster={coverFrame.url}
          muted
          playsInline
          preload="auto"
          onEnded={(e) => {
            e.currentTarget.pause();
            setPhase("done");
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${revealed ? "opacity-0" : "opacity-100"}`}
        />
      </div>

      {phase === "closed" && (
        <button
          onClick={open}
          className="fixed inset-0 z-20 flex items-end justify-center pb-[12svh]"
          aria-label="Open the invitation"
        >
          <span className="animate-pulse rounded-full border border-[color:var(--gold)] bg-background/80 px-7 py-3 font-serif text-lg tracking-wide text-primary shadow-lg backdrop-blur">
            Tap to open the invitation
          </span>
        </button>
      )}

      {revealed && (
        <div className="relative z-10">
          {scenes.map((s, i) => (
            <section
              key={i}
              className="flex min-h-svh items-center justify-center px-10 pb-16 pt-[30svh]"
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.6 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="max-w-xs text-center"
              >
                <p className="mb-3 font-serif text-base text-[color:var(--gold)]">{s.kicker}</p>
                <h2 className="font-serif text-4xl leading-tight text-primary sm:text-5xl">
                  {s.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-foreground/80">{s.body}</p>
              </motion.div>
            </section>
          ))}
          <section className="flex min-h-svh flex-col items-center justify-center gap-5 px-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.6 }}
              transition={{ duration: 0.9 }}
            >
              <h2 className="font-serif text-4xl text-primary">Will you join us?</h2>
              <Link
                to="/"
                hash="rsvp"
                className="mt-6 inline-block rounded-full bg-primary px-7 py-3 text-primary-foreground shadow-lg"
              >
                RSVP now
              </Link>
              <p className="mt-6 text-sm text-[color:var(--gold)]">{WEDDING_HASHTAG}</p>
            </motion.div>
          </section>
        </div>
      )}
    </main>
  );
}
