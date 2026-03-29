import { useCallback, useEffect, useState } from "react";
import type {
  InvestmentSlot,
  UserProfile,
  WithdrawalRequest,
} from "../actorTypes";
import type { WealthActor } from "../actorTypes";

function fmt(n: bigint | number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

interface Props {
  profile: UserProfile | null;
  actor: WealthActor | null;
}

export default function PortfolioPage({ profile, actor }: Props) {
  const [slots, setSlots] = useState<InvestmentSlot[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const load = useCallback(async () => {
    if (!actor) return;
    try {
      const [s, w] = await Promise.all([
        actor.getMySlots(),
        actor.getMyWithdrawals(),
      ]);
      setSlots(s);
      setWithdrawals(w);
    } catch (e) {
      console.error(e);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = (s: InvestmentSlot["status"]) =>
    "Active" in s ? "Active" : "Closed";

  const wStatusLabel = (s: WithdrawalRequest["status"]) =>
    "Pending" in s ? "Pending" : "Completed" in s ? "Completed" : "Rejected";

  return (
    <div className="px-4 pt-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Portfolio</h1>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Deposited",
            value: profile?.depositedBalance || 0n,
            color: "#D6B35A",
          },
          {
            label: "Withdrawable",
            value: profile?.withdrawableBalance || 0n,
            color: "#1FA36A",
          },
          {
            label: "Frozen",
            value: profile?.frozenBalance || 0n,
            color: "#F59E0B",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl p-3 text-center"
            style={{
              background: "rgba(20,28,34,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-[10px] text-[#A8B2BA] uppercase tracking-wide">
              {c.label}
            </p>
            <p className="text-sm font-bold mt-1" style={{ color: c.color }}>
              {fmt(c.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Slots */}
      <div>
        <h2 className="text-base font-bold mb-3">Investment Slots</h2>
        {slots.length === 0 ? (
          <p className="text-[#A8B2BA] text-sm">No slots yet.</p>
        ) : (
          <div className="space-y-2">
            {slots.map((s) => {
              const claimed = s.claimWindows.filter(
                (w) => w.claimedAt.length > 0,
              ).length;
              return (
                <div
                  key={String(s.id)}
                  className="rounded-xl p-3 flex justify-between items-center"
                  style={{
                    background: "rgba(20,28,34,0.6)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold">{fmt(s.amount)}</p>
                    <p className="text-xs text-[#A8B2BA]">
                      {claimed}/10 claimed
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      background:
                        "Active" in s.status
                          ? "rgba(31,163,106,0.2)"
                          : "rgba(255,255,255,0.1)",
                      color: "Active" in s.status ? "#1FA36A" : "#A8B2BA",
                    }}
                  >
                    {statusLabel(s.status)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdrawals */}
      <div>
        <h2 className="text-base font-bold mb-3">Withdrawal History</h2>
        {withdrawals.length === 0 ? (
          <p className="text-[#A8B2BA] text-sm">No withdrawals yet.</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div
                key={String(w.id)}
                className="rounded-xl p-3 flex justify-between items-center"
                style={{
                  background: "rgba(20,28,34,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold">{fmt(w.amount)}</p>
                  <p className="text-xs text-[#A8B2BA]">
                    {new Date(Number(w.createdAt) / 1e6).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    background:
                      "Completed" in w.status
                        ? "rgba(31,163,106,0.2)"
                        : "Rejected" in w.status
                          ? "rgba(200,50,50,0.2)"
                          : "rgba(245,158,11,0.2)",
                    color:
                      "Completed" in w.status
                        ? "#1FA36A"
                        : "Rejected" in w.status
                          ? "#EF4444"
                          : "#F59E0B",
                  }}
                >
                  {wStatusLabel(w.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
