import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { InvestmentSlot, UserProfile } from "../actorTypes";
import type { WealthActor } from "../actorTypes";
import ActiveSlotCard from "./ActiveSlotCard";
import SlotCard from "./SlotCard";
import TCModal from "./TCModal";

const INVESTMENT_AMOUNTS = [100, 200, 300, 400, 500, 600, 700, 800, 1000, 3200];

function fmt(n: bigint | number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

interface Props {
  profile: UserProfile | null;
  serverOffset: number;
  actor: WealthActor | null;
  onRefresh: () => Promise<void>;
}

export default function HomePage({
  profile,
  serverOffset,
  actor,
  onRefresh,
}: Props) {
  const [slots, setSlots] = useState<InvestmentSlot[]>([]);
  const [tcOpen, setTcOpen] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadSlots = useCallback(async () => {
    if (!actor) return;
    try {
      const s = await actor.getMySlots();
      setSlots(s);
    } catch (e) {
      console.error(e);
    }
  }, [actor]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handlePurchaseClick = (amount: number) => {
    setPurchaseAmount(amount);
    setTcOpen(true);
  };

  const handlePurchaseConfirm = async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.purchaseSlot(BigInt(purchaseAmount), true);
      if ("ok" in result) {
        toast.success(
          `Deposit of ${fmt(purchaseAmount)} is pending admin approval`,
        );
        setTcOpen(false);
        await onRefresh();
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error("Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (slotId: bigint) => {
    if (!actor) return;
    try {
      const result = await actor.claimReward(slotId);
      if ("ok" in result) {
        toast.success(`Claimed ${fmt(result.ok)}!`);
        await loadSlots();
        await onRefresh();
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error("Claim failed");
    }
  };

  const activeSlots = slots.filter((s) => "Active" in s.status);

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold">
          <span className="text-white">Wealth</span>
          <span style={{ color: "#D6B35A" }}>Stream</span>
        </h1>
        <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm">
          👤
        </div>
      </div>

      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: "rgba(20,28,34,0.6)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(31,163,106,0.25)",
          boxShadow: "0 0 30px rgba(31,163,106,0.1)",
        }}
      >
        <div>
          <p className="text-[#A8B2BA] text-xs uppercase tracking-wider">
            Current Balance
          </p>
          <p className="text-3xl font-bold mt-1" style={{ color: "#D6B35A" }}>
            {profile ? fmt(profile.depositedBalance) : "₹0"}
          </p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-[#A8B2BA] text-xs">Total Earnings</p>
            <p className="text-lg font-semibold" style={{ color: "#1FA36A" }}>
              {profile ? fmt(profile.withdrawableBalance) : "₹0"}
            </p>
          </div>
          <div>
            <p className="text-[#A8B2BA] text-xs">Frozen</p>
            <p className="text-lg font-semibold text-yellow-400">
              {profile ? fmt(profile.frozenBalance) : "₹0"}
            </p>
          </div>
        </div>
      </div>

      {activeSlots.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-white mb-3">Active Slots</h2>
          <div className="space-y-3">
            {activeSlots.map((slot) => (
              <ActiveSlotCard
                key={String(slot.id)}
                slot={slot}
                serverOffset={serverOffset}
                onClaim={handleClaim}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-bold text-white mb-3">
          Investment Slots
        </h2>
        <div className="space-y-3">
          {INVESTMENT_AMOUNTS.map((amount) => (
            <SlotCard
              key={amount}
              amount={amount}
              onPurchase={handlePurchaseClick}
            />
          ))}
        </div>
      </div>

      <TCModal
        open={tcOpen}
        onClose={() => setTcOpen(false)}
        onConfirm={handlePurchaseConfirm}
        amount={purchaseAmount}
        loading={loading}
      />
    </div>
  );
}
