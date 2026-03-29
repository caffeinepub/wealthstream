interface Props {
  amount: number;
  onPurchase: (amount: number) => void;
}

const ICONS: Record<number, string> = {
  100: "💵",
  200: "💴",
  300: "💶",
  400: "💷",
  500: "🥇",
  600: "🏆",
  700: "💎",
  800: "👑",
  1000: "🚀",
  3200: "🌟",
};

export default function SlotCard({ amount, onPurchase }: Props) {
  const totalReturn = (amount * 1.7).toFixed(0);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(20,28,34,0.55)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(31,163,106,0.2)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg">
            {ICONS[amount] || "💰"}
          </div>
          <div>
            <p className="font-bold text-white text-base">
              ₹{amount.toLocaleString("en-IN")}
            </p>
            <p className="text-[#A8B2BA] text-xs">+70% return • 10 hours</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#A8B2BA]">Total Return</p>
          <p className="font-bold text-sm" style={{ color: "#1FA36A" }}>
            ₹{Number(totalReturn).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onPurchase(amount)}
        className="mt-3 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, #137A56 0%, #1FA36A 100%)",
          border: "1px solid rgba(200,169,86,0.35)",
          boxShadow: "0 0 12px rgba(31,163,106,0.25)",
        }}
      >
        Purchase
      </button>
    </div>
  );
}
