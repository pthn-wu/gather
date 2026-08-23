import { useEffect, useState } from "react";
import type { Community } from "../api/types";

/**
 * Live countdown to the community's cutoff. The date comes from the community
 * record the property office edits in Cycle setup — never a constant.
 */
export function useCutoff(community: Community | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const iso = community?.cutoffAt ?? community?.cutoffDate;
  if (!iso) return "Cutoff to be confirmed";

  const left = new Date(iso).getTime() - now;
  if (!Number.isFinite(left)) return "Cutoff to be confirmed";
  if (left <= 0) return "Cutoff passed — next drop";

  const d = Math.floor(left / 86400000);
  const h = Math.floor(left / 3600000) % 24;
  const m = Math.floor(left / 60000) % 60;
  const sec = Math.floor(left / 1000) % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}`;
}
