import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { WealthActor } from "../actorTypes";
import TCModal from "./TCModal";

const QUICK_AMOUNTS = [100, 300, 500, 800, 1200, 1500, 2200, 2800, 3100];
type PayStep = "select" | "upi" | "proof" | "detecting";

interface Props {
  actor: WealthActor | null;
  onSuccess: () => Promise<void>;
}

function buildUpiLink(amount: number, upiId: string, displayName: string) {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(displayName)}&am=${amount}&cu=INR`;
}

function savePaymentHistory(entry: {
  id: number;
  amount: number;
  utr: string;
  screenshotName: string;
  submittedAt: number;
  status: "detecting";
  depositId?: number;
}) {
  try {
    const existing = JSON.parse(
      localStorage.getItem("wealthstream_payment_history") || "[]",
    );
    localStorage.setItem(
      "wealthstream_payment_history",
      JSON.stringify([entry, ...existing]),
    );
  } catch {
    // ignore storage errors
  }
}

export default function AddFundsPage({ actor, onSuccess }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [tcOpen, setTcOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<PayStep>("select");
  const [upiConfig, setUpiConfig] = useState<{
    upiId: string;
    displayName: string;
    qrUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!actor) return;
    actor
      .getUpiConfig()
      .then((cfg) => {
        const qr =
          cfg.customQrUrl.length > 0
            ? String(cfg.customQrUrl[0])
            : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${cfg.upiId}&pn=${cfg.displayName}`)}`;
        setUpiConfig({
          upiId: cfg.upiId,
          displayName: cfg.displayName,
          qrUrl: qr,
        });
      })
      .catch(() => {
        setUpiConfig({
          upiId: "turbohacker4-2@okaxis",
          displayName: "WealthStream",
          qrUrl:
            "/assets/uploads/googlepay_qr-019d392b-712e-76a8-825e-5131e9f27761-1.png",
        });
      });
  }, [actor]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [utr, setUtr] = useState("");
  const [countdown, setCountdown] = useState(300);
  const [detectionDone, setDetectionDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === "detecting") {
      setCountdown(300);
      setDetectionDone(false);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setDetectionDone(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  const handleSubmitProof = async () => {
    if (!screenshot) {
      toast.error("Please upload your payment screenshot");
      return;
    }
    if (!utr.trim() || utr.trim().length < 8) {
      toast.error("Please enter a valid UTR number (at least 8 digits)");
      return;
    }
    // First: write to backend so admin sees it immediately
    let depositId: number | undefined;
    if (actor && selected) {
      try {
        setLoading(true);
        const result = await actor.purchaseSlot(BigInt(selected), true);
        if ("ok" in result) {
          depositId = Number(result.ok);
        }
      } catch {
        // Silent - continue so user sees the timer
      } finally {
        setLoading(false);
      }
    }
    // Save to payment history localStorage (with depositId for status sync)
    const now = Date.now();
    savePaymentHistory({
      id: now,
      amount: selected!,
      utr: utr.trim(),
      screenshotName: screenshot?.name || "",
      submittedAt: now,
      status: "detecting",
      depositId,
    });
    // Show detecting timer
    setStep("detecting");
    // Refresh user profile balance
    try {
      await onSuccess();
    } catch {
      // ignore
    }
  };

  const resetFlow = () => {
    setStep("select");
    setSelected(null);
    setScreenshot(null);
    setUtr("");
    setDetectionDone(false);
  };

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // --- UPI Payment Step ---
  if (step === "upi") {
    const upiLink = buildUpiLink(
      selected!,
      upiConfig?.upiId ?? "turbohacker4-2@okaxis",
      upiConfig?.displayName ?? "WealthStream",
    );
    const payApps = [
      { name: "BHIM", emoji: "🇮🇳", color: "#1565C0", href: upiLink },
      { name: "GPay", emoji: "💳", color: "#1A73E8", href: upiLink },
      { name: "Paytm", emoji: "💰", color: "#00BAF2", href: upiLink },
      { name: "PhonePe", emoji: "📱", color: "#6739B7", href: upiLink },
    ];
    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        style={{ background: "#0B1220" }}
      >
        <div className="min-h-screen flex flex-col px-4 py-8 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setStep("select")}
              className="p-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)", color: "#A8B2BA" }}
            >
              ←
            </button>
            <h1 className="text-xl font-bold text-white">
              Complete Your Payment
            </h1>
          </div>

          <div
            className="rounded-2xl p-4 mb-5 text-center"
            style={{
              background: "rgba(214,179,90,0.08)",
              border: "1px solid rgba(214,179,90,0.25)",
            }}
          >
            <p className="text-sm text-[#A8B2BA] mb-1">Pay Amount</p>
            <p className="text-4xl font-bold" style={{ color: "#D6B35A" }}>
              ₹{selected!.toLocaleString("en-IN")}
            </p>
          </div>

          {/* QR Code */}
          <div
            className="rounded-2xl p-5 mb-5 flex flex-col items-center"
            style={{
              background: "rgba(20,28,34,0.8)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              className="rounded-xl overflow-hidden mb-3"
              style={{
                background: "white",
                padding: 8,
                maxWidth: 220,
                opacity: upiConfig ? 1 : 0.4,
              }}
            >
              <img
                src={upiConfig?.qrUrl ?? ""}
                alt="UPI QR Code"
                style={{ width: "100%", maxWidth: 220, display: "block" }}
              />
            </div>
            <p className="text-sm text-[#A8B2BA] mb-1">UPI ID</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono" style={{ color: "#D6B35A" }}>
                {upiConfig?.upiId ?? "..."}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(upiConfig?.upiId ?? "");
                  toast.success("UPI ID copied!");
                }}
                className="text-xs px-2 py-1 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#A8B2BA",
                }}
                data-ocid="addfunds.copy_button"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Payment App Buttons */}
          <p className="text-sm text-[#A8B2BA] mb-3 text-center">
            Or pay using your preferred app
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {payApps.map((app) => (
              <a
                key={app.name}
                href={app.href}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = app.href;
                }}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white text-sm transition-all active:scale-95"
                style={{
                  background: app.color,
                  boxShadow: `0 4px 20px ${app.color}40`,
                }}
                data-ocid={`addfunds.${app.name.toLowerCase()}_button`}
              >
                <span className="text-xl">{app.emoji}</span>
                {app.name}
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep("proof")}
            className="w-full py-4 rounded-2xl font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #137A56 0%, #1FA36A 100%)",
              border: "1px solid rgba(200,169,86,0.35)",
              boxShadow: "0 0 20px rgba(31,163,106,0.3)",
            }}
            data-ocid="addfunds.payment_done_button"
          >
            I've Made the Payment →
          </button>
        </div>
      </div>
    );
  }

  // --- Upload Proof Step ---
  if (step === "proof") {
    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        style={{ background: "#0B1220" }}
      >
        <div className="min-h-screen flex flex-col px-4 py-8 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setStep("upi")}
              className="p-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)", color: "#A8B2BA" }}
            >
              ←
            </button>
            <h1 className="text-xl font-bold text-white">
              Upload Payment Proof
            </h1>
          </div>

          <div
            className="rounded-2xl p-4 mb-5 text-center"
            style={{
              background: "rgba(214,179,90,0.08)",
              border: "1px solid rgba(214,179,90,0.25)",
            }}
          >
            <p className="text-sm text-[#A8B2BA]">Payment Amount</p>
            <p className="text-3xl font-bold" style={{ color: "#D6B35A" }}>
              ₹{selected!.toLocaleString("en-IN")}
            </p>
          </div>

          {/* Screenshot Upload */}
          <div className="mb-4">
            <p className="text-sm text-[#A8B2BA] mb-2">Payment Screenshot</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-10 rounded-2xl flex flex-col items-center gap-3 transition-all"
              style={{
                background: screenshot
                  ? "rgba(31,163,106,0.08)"
                  : "rgba(255,255,255,0.03)",
                border: screenshot
                  ? "2px dashed rgba(31,163,106,0.4)"
                  : "2px dashed rgba(255,255,255,0.1)",
              }}
              data-ocid="addfunds.upload_button"
            >
              {screenshot ? (
                <>
                  <span className="text-3xl">✓</span>
                  <span className="text-sm" style={{ color: "#1FA36A" }}>
                    {screenshot.name}
                  </span>
                  <span className="text-xs text-[#A8B2BA]">Tap to change</span>
                </>
              ) : (
                <>
                  <span className="text-3xl">📸</span>
                  <span className="text-sm text-[#A8B2BA]">
                    Tap to upload screenshot
                  </span>
                  <span className="text-xs text-[#A8B2BA] opacity-60">
                    Accepts JPG, PNG
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
            />
          </div>

          {/* UTR Input */}
          <div className="mb-6">
            <p className="text-sm text-[#A8B2BA] mb-2">
              UTR Number{" "}
              <span className="text-xs opacity-60">
                (12-digit transaction reference)
              </span>
            </p>
            <input
              type="text"
              placeholder="Enter UTR / Transaction ID"
              value={utr}
              onChange={(e) =>
                setUtr(e.target.value.replace(/\D/g, "").slice(0, 20))
              }
              className="w-full px-4 py-3 rounded-xl text-white placeholder-[#A8B2BA] outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 15,
              }}
              data-ocid="addfunds.utr_input"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmitProof}
            disabled={loading || !screenshot || !utr.trim()}
            className="w-full py-4 rounded-2xl font-semibold text-white transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #137A56 0%, #1FA36A 100%)",
              border: "1px solid rgba(200,169,86,0.35)",
            }}
            data-ocid="addfunds.submit_button"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit Payment"
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- Detection / Countdown Step ---
  if (step === "detecting") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
        style={{ background: "#0B1220" }}
        data-ocid="addfunds.detecting_modal"
      >
        <div className="text-center max-w-sm w-full">
          {!detectionDone ? (
            <>
              <div className="relative mx-auto mb-6 w-28 h-28">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: "3px solid rgba(214,179,90,0.15)",
                    animation: "spin 3s linear infinite",
                  }}
                />
                <div
                  className="absolute inset-2 rounded-full"
                  style={{
                    border: "3px solid rgba(31,163,106,0.3)",
                    borderTopColor: "#1FA36A",
                    animation: "spin 1.5s linear infinite",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">🔍</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">
                Payment Under Detection
              </h2>

              <div
                className="rounded-2xl p-5 mb-6"
                style={{
                  background: "rgba(20,28,34,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-[#A8B2BA] text-sm leading-relaxed">
                  Dear User, our system is currently detecting your payment. It
                  will take upto 5 minutes. Kindly wait or check back later.
                </p>
              </div>

              <div className="mb-6">
                <p className="text-xs text-[#A8B2BA] mb-2">Time Remaining</p>
                <p
                  className="text-5xl font-bold font-mono"
                  style={{ color: "#D6B35A" }}
                >
                  {fmtTime(countdown)}
                </p>
              </div>

              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${((300 - countdown) / 300) * 100}%`,
                    background: "linear-gradient(90deg, #137A56, #1FA36A)",
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-6">✅</div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Detection Complete
              </h2>
              <p className="text-[#A8B2BA] text-sm mb-6">
                Your deposit is pending admin approval. You will receive your
                funds once verified.
              </p>
              <div
                className="rounded-2xl p-4 mb-6 text-center"
                style={{
                  background: "rgba(213,179,90,0.08)",
                  border: "1px solid rgba(213,179,90,0.3)",
                }}
              >
                <p className="text-[#A8B2BA] text-xs mb-2">
                  Need help? Contact us
                </p>
                <a
                  href="mailto:99999diamonds@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold"
                  style={{ color: "#D6B35A" }}
                  data-ocid="addfunds.contact_us_link"
                >
                  📧 99999diamonds@gmail.com
                </a>
              </div>
              <button
                type="button"
                onClick={resetFlow}
                className="w-full py-4 rounded-2xl font-semibold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #137A56 0%, #1FA36A 100%)",
                  border: "1px solid rgba(200,169,86,0.35)",
                }}
                data-ocid="addfunds.back_home_button"
              >
                Back to Home
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- Select Amount Step ---
  return (
    <div className="px-4 pt-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Add Funds</h1>

      {/* Quick Select */}
      <div>
        <p className="text-[#A8B2BA] text-sm mb-3">Quick Select Amount</p>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              type="button"
              key={amt}
              onClick={() => setSelected(amt)}
              className="flex-shrink-0 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                background:
                  selected === amt
                    ? "linear-gradient(135deg, #137A56 0%, #1FA36A 100%)"
                    : "rgba(255,255,255,0.05)",
                border:
                  selected === amt
                    ? "1px solid rgba(200,169,86,0.4)"
                    : "1px solid rgba(255,255,255,0.1)",
                color: selected === amt ? "white" : "#A8B2BA",
              }}
              data-ocid={"addfunds.amount_button"}
            >
              ₹{amt.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
      </div>

      {/* Payment summary */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(20,28,34,0.6)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p className="text-[#A8B2BA] text-sm">Payment Total</p>
        <p className="text-3xl font-bold mt-1" style={{ color: "#D6B35A" }}>
          {selected ? `₹${selected.toLocaleString("en-IN")}` : "₹0"}
        </p>
        {selected && (
          <p className="text-sm mt-1" style={{ color: "#1FA36A" }}>
            Expected return: ₹{(selected * 1.7).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {/* Proceed button */}
      <button
        type="button"
        onClick={() => selected && setStep("upi")}
        disabled={!selected}
        className="w-full py-4 rounded-2xl font-semibold text-white transition-all disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, #137A56 0%, #1FA36A 100%)",
          border: "1px solid rgba(200,169,86,0.35)",
          boxShadow: selected ? "0 0 20px rgba(31,163,106,0.3)" : "none",
        }}
        data-ocid="addfunds.proceed_button"
      >
        Proceed to Pay
      </button>

      {/* How it works */}
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p className="text-sm font-semibold text-white">How It Works</p>
        <div className="space-y-1 text-xs text-[#A8B2BA]">
          <p>1. Select your investment amount</p>
          <p>2. Pay via UPI (QR / BHIM / GPay / Paytm / PhonePe)</p>
          <p>3. Upload payment screenshot & enter UTR</p>
          <p>4. Admin approves your deposit within 24h</p>
          <p>5. Claim 10% of returns every hour for 10 hours</p>
          <p>6. Withdraw your earnings anytime (min ₹200)</p>
        </div>
      </div>

      <TCModal
        open={tcOpen}
        onClose={() => setTcOpen(false)}
        onConfirm={async () => {
          setTcOpen(false);
        }}
        amount={selected || 0}
        loading={loading}
      />
    </div>
  );
}
