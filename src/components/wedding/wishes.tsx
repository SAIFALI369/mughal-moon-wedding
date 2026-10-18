import { useEffect } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle } from "./ornaments";
import { wishesQuery } from "./wishes-query";

export function Wishes() {
  const { data } = useSuspenseQuery(wishesQuery);
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: wishesQuery.queryKey });
    };
    const channel = supabase
      .channel("wedding-wishes-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wedding_wishes" },
        refresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
  return (
    <section id="wishes" className="relative px-6 py-24">
      <SectionTitle eyebrow="Du’as & love">Wishes</SectionTitle>
      <div aria-live="polite" className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {data.map((wish) => (
          <article key={wish.id} className="glass-card rounded-lg p-7">
            <Heart className="mb-4 h-5 w-5 text-gold" />
            <p className="whitespace-pre-wrap break-words font-serif text-xl leading-relaxed text-foreground">
              {wish.message || "With love and du’as for Mohsin & Simran."}
            </p>
            <p className="mt-5 break-words font-medium text-burgundy">{wish.name}</p>
            <time dateTime={wish.created_at} className="mt-1 block text-xs text-muted-foreground">
              {new Date(wish.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Kolkata",
              })}
            </time>
          </article>
        ))}
        {data.length === 0 && (
          <p className="text-center font-serif text-xl text-muted-foreground md:col-span-2">
            May this beginning be filled with love and blessings.
          </p>
        )}
      </div>
    </section>
  );
}
