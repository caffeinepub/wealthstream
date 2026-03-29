import { useCallback, useEffect, useState } from "react";

interface PaymentEntry {
  id: number;
  amount: number;
  utr: string;
  screenshotName: string;
  submittedAt: number;
  status: "detecting" | "verifying" | "approved" | "rejected";
}

function getEffectiveStatus(
  entry: PaymentEntry,
): "detecting" | "verifying" | "approved" | "rejected" {
  if (Date.now() - entry.submittedAt < 5 * 60 * 1000) return "detecting";
  return entry.status === "detecting" ? "verifying" : entry.status;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const STATUS_CONFIG = {
  detecting: {
    label: "Detecting",
    color: "#D6B35A",
    bg: "rgba(214,179,90,0.15)",
    border: "rgba(214,179,90,0.3)",
    pulse: true,
  },
  verifying: {
    label: "Pending Approval",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.3)",
    pulse: false,
  },
  approved: {
    label: "Approved",
    color: "#1FA36A",
    bg: "rgba(31,163,106,0.15)",
    border: "rgba(31,163,106,0.3)",
    pulse: false,
  },
  rejected: {
    label: "Rejected",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.3)",
    pulse: false,
  },
};

export default function PaymentHistoryPage() {
  const [history, setHistory] = useState<PaymentEntry[]>([]);
  const [, setTick] = useState(0);

  const loadHistory = useCallback(() => {
    try {
      const raw = localStorage.getItem("wealthstream_payment_history");
      const parsed: PaymentEntry[] = JSON.parse(raw || "[]");
      setHistory(parsed.sort((a, b) => b.submittedAt - a.submittedAt));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Re-render every 10s so detecting statuses update in real time
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Payment History</h1>
        <button
          type="button"
          onClick={loadHistory}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#A8B2BA",
          }}
          data-ocid="history.refresh_button"
        >
          <span style={{ display: "inline-block" }}>↻</span>
          Refresh
        </button>
      </div>

      {/* Status Legend */}
      <div
        className="rounded-2xl p-4 flex flex-wrap gap-3"
        style={{
          background: "rgba(20,28,34,0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map(
          (key) => {
            const cfg = STATUS_CONFIG[key];
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ background: cfg.color }}
                />
                <span className="text-xs" style={{ color: "#A8B2BA" }}>
                  {cfg.label}
                </span>
              </div>
            );
          },
        )}
      </div>

      {/* Empty State */}
      {history.length === 0 && (
        <div
          className="rounded-2xl p-10 flex flex-col items-center gap-4"
          style={{
            background: "rgba(20,28,34,0.8)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          data-ocid="history.empty_state"
        >
          <span className="text-5xl">📋</span>
          <div className="text-center">
            <p className="text-white font-semibold mb-1">No Payment History</p>
            <p className="text-sm" style={{ color: "#A8B2BA" }}>
              Your deposited and pending payments will appear here.
            </p>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="space-y-3" data-ocid="history.list">
        {history.map((entry, idx) => {
          const effectiveStatus = getEffectiveStatus(entry);
          const cfg = STATUS_CONFIG[effectiveStatus];
          const markerIdx = idx + 1;
          return (
            <div
              key={entry.id}
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: "rgba(20,28,34,0.8)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
              data-ocid={`history.item.${markerIdx}`}
            >
              {/* Top row: amount + status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#A8B2BA] mb-0.5">Amount</p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "#D6B35A" }}
                  >
                    ₹{entry.amount.toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Status Badge */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    color: cfg.color,
                  }}
                >
                  {cfg.pulse && (
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{
                        background: cfg.color,
                        animation: "pulse 1.4s ease-in-out infinite",
                      }}
                    />
                  )}
                  {!cfg.pulse && (
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: cfg.color }}
                    />
                  )}
                  {cfg.label}
                </div>
              </div>

              {/* Details */}
              <div
                className="rounded-xl p-3 space-y-2"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#A8B2BA" }}>
                    UTR / Transaction ID
                  </span>
                  <span
                    className="text-xs font-mono font-medium"
                    style={{ color: "#E2E8F0" }}
                  >
                    {entry.utr || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#A8B2BA" }}>
                    Screenshot
                  </span>
                  <span
                    className="text-xs max-w-[140px] truncate"
                    style={{ color: "#E2E8F0" }}
                  >
                    {entry.screenshotName || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#A8B2BA" }}>
                    Submitted
                  </span>
                  <span className="text-xs" style={{ color: "#E2E8F0" }}>
                    {formatDate(entry.submittedAt)}
                  </span>
                </div>
              </div>

              {/* Detecting note */}
              {effectiveStatus === "detecting" && (
                <div
                  className="rounded-xl p-3 text-xs leading-relaxed"
                  style={{
                    background: "rgba(214,179,90,0.06)",
                    border: "1px solid rgba(214,179,90,0.15)",
                    color: "#D6B35A",
                  }}
                >
                  🔍 Our system is currently detecting your payment. It will
                  take up to 5 minutes. Kindly wait or check back later.
                </div>
              )}

              {effectiveStatus === "verifying" && (
                <div
                  className="rounded-xl p-3 text-xs leading-relaxed"
                  style={{
                    background: "rgba(59,130,246,0.06)",
                    border: "1px solid rgba(59,130,246,0.15)",
                    color: "#93C5FD",
                  }}
                >
                  ⏳ Payment submitted. Waiting for admin approval — usually
                  within 24 hours.
                </div>
              )}

              {effectiveStatus === "approved" && (
                <div
                  className="rounded-xl p-3 text-xs leading-relaxed"
                  style={{
                    background: "rgba(31,163,106,0.06)",
                    border: "1px solid rgba(31,163,106,0.15)",
                    color: "#6EE7B7",
                  }}
                >
                  ✅ Payment approved! Your balance has been updated.
                </div>
              )}

              {effectiveStatus === "rejected" && (
                <div
                  className="rounded-xl p-3 text-xs leading-relaxed"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    color: "#FCA5A5",
                  }}
                >
                  ❌ Payment was rejected. Please contact support or resubmit.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
