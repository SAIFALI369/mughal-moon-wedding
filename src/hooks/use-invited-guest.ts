import { useEffect, useState } from "react";

export function useInvitedGuestName() {
  const [guestName, setGuestName] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("guest") || params.get("to") || "").trim();
    if (raw) setGuestName(raw.slice(0, 80));
  }, []);
  return guestName;
}
