import { useEffect, useState } from "react";
import type { InvestmentSlot } from "../actorTypes";

interface Props {
  slot: InvestmentSlot;
  serverOffset: number;
  onClaim: (slotId: bigint) => Promise<void>;
}

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const h = ms / 3600000;
  const m = (ms % 3600000) / 60000;
  const s = (ms % 60000) / 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function ActiveSlotCard({ slot, serverOffset, onClaim }: Props) {
  const [now, setNow] = useState(() => Date.now() + serverOffset);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now() + serverOffset);
    }, 1000);
    return () => clearInterval(id);
  }, [serverOffset]);

  const claimedCount = slot.claimWindows.filter(
    (w) => w.claimedAt.length > 0,
  ).length;
  const expiredCount = slot.claimWindows.filter((w) => w.expired).length;
  const totalReturn = Number(slot.totalReturn);

  let claimState: "waiting" | "open" | "done" = "done";
  let nextWindowMs = 0;

  for (const w of slot.claimWindows) {
    if (w.claimedAt.length > 0) continue;
    if (w.expired) continue;
    const openMs = Number(w.windowOpenTime) / 1e6;
    const closeMs = openMs + 300000;
    if (now >= openMs && now <= closeMs) {
      claimState = "open";
      break;
    }
    if (now < openMs) {
      claimState = "waiting";
      nextWindowMs = openMs;
      break;
    }
  }

  const handleClaim = async () => {
    setClaiming(true);
    await onClaim(slot.id);
    setClaiming(false);
  };

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "rgba(20,28,34,0.7)",
        backdropFilter: "blur(12px)",
        border:
          claimState === "open"
            ? "1px solid rgba(31,163,106,0.6)"
            : "1px solid rgba(31,163,106,0.15)",
        boxShadow:
          claimState === "open" ? "0 0 20px rgba(31,163,106,0.2)" : "none",
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-white">
            ₹{Number(slot.amount).toLocaleString("en-IN")} Slot
          </p>
          <p className="text-xs text-[#A8B2BA]">
            Return: ₹{totalReturn.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#A8B2BA]">Progress</p>
          <p className="text-sm font-bold" style={{ color: "#D6B35A" }}>
            {claimedCount}/10 claimed
          </p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(claimedCount / 10) * 100}%`,
            background: "linear-gradient(90deg, #137A56, #1FA36A)",
          }}
        />
      </div>

      <div className="flex gap-1">
        {slot.claimWindows.map((w, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable window order
            key={i}
            className="flex-1 h-2 rounded-sm"
            style={{
              background:
                w.claimedAt.length > 0
                  ? "#1FA36A"
                  : w.expired
                    ? "#4A1A1A"
                    : i < claimedCount + expiredCount
                      ? "#4A1A1A"
                      : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>

      {claimState === "open" ? (
        <button
          type="button"
          onClick={handleClaim}
          disabled={claiming}
          className="w-full py-3 rounded-xl font-bold text-white transition-all claim-pulse"
          style={{
            background: "linear-gradient(135deg, #0F6844 0%, #1FA36A 100%)",
            border: "1px solid rgba(200,169,86,0.5)",
          }}
        >
          {claiming ? "Claiming..." : "🎁 CLAIM NOW"}
        </button>
      ) : claimState === "waiting" && nextWindowMs > 0 ? (
        <div className="text-center">
          <p className="text-[#A8B2BA] text-xs">Next claim in</p>
          <p className="font-mono font-bold" style={{ color: "#D6B35A" }}>
            {formatCountdown(nextWindowMs - now)}
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-[#A8B2BA] text-xs">All windows processed</p>
        </div>
      )}
    </div>
  );
}
