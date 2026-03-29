import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  BankDetails,
  UserProfile,
  WithdrawalRequest,
} from "../actorTypes";
import type { WealthActor } from "../actorTypes";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

function fmt(n: bigint | number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

interface Props {
  profile: UserProfile | null;
  actor: WealthActor | null;
  onRefresh: () => Promise<void>;
}

type BankFormStep = "ifsc" | "confirm" | "details" | "done";

export default function AccountPage({ profile, actor, onRefresh }: Props) {
  const { clear } = useInternetIdentity();
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankStep, setBankStep] = useState<BankFormStep>("ifsc");
  const [ifscInput, setIfscInput] = useState("");
  const [ifscInfo, setIfscInfo] = useState<{
    bankName: string;
    branchName: string;
  } | null>(null);
  const [accNo, setAccNo] = useState("");
  const [holderName, setHolderName] = useState("");
  const [phone, setPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    try {
      const [bd, ws] = await Promise.all([
        actor.getBankDetails(),
        actor.getMyWithdrawals(),
      ]);
      setBankDetails(bd.length > 0 ? (bd[0] ?? null) : null);
      setWithdrawals(ws);
    } catch (e) {
      console.error(e);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLookupIFSC = async () => {
    if (!actor || ifscInput.length < 11) return;
    setLoading(true);
    try {
      const result = await actor.lookupIFSC(ifscInput.toUpperCase());
      if ("ok" in result) {
        setIfscInfo({
          bankName: result.ok.bankName,
          branchName: result.ok.branchName,
        });
        setBankStep("confirm");
      } else {
        toast.error("IFSC not found. Please check the code.");
      }
    } catch {
      toast.error("Failed to lookup IFSC");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBank = async () => {
    if (!actor || !ifscInfo) return;
    setLoading(true);
    try {
      const result = await actor.setBankDetails(
        ifscInput.toUpperCase(),
        ifscInfo.bankName,
        ifscInfo.branchName,
        accNo,
        holderName,
        phone,
      );
      if ("ok" in result) {
        toast.success("Bank details saved");
        setShowBankForm(false);
        await load();
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error("Failed to save bank details");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!actor) return;
    const amt = Number(withdrawAmount);
    if (amt < 200) {
      toast.error("Minimum withdrawal is ₹200");
      return;
    }
    if (!bankDetails) {
      toast.error("Please set up your bank account first");
      return;
    }
    setLoading(true);
    try {
      const result = await actor.requestWithdrawal(BigInt(amt));
      if ("ok" in result) {
        toast.success("Withdrawal request submitted");
        setWithdrawAmount("");
        await onRefresh();
        await load();
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error("Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  const editsRemaining = bankDetails
    ? Math.max(0, 3 - Number(bankDetails.updateCount))
    : 3;

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Account</h1>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-[#A8B2BA] border border-white/10 px-3 py-1 rounded-lg"
        >
          Logout
        </button>
      </div>

      {/* Profile */}
      {profile && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(20,28,34,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-xs text-[#A8B2BA]">Principal ID</p>
          <p className="text-sm font-mono text-white truncate">
            {profile.userId.toString().slice(0, 20)}...
          </p>
          {profile.isFlagged && (
            <p className="text-xs text-red-400 mt-2">
              ⚠️ Account flagged. Contact support.
            </p>
          )}
        </div>
      )}

      {/* Balance */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Deposited", v: profile?.depositedBalance || 0n, c: "#D6B35A" },
          {
            l: "Earnings",
            v: profile?.withdrawableBalance || 0n,
            c: "#1FA36A",
          },
          { l: "Frozen", v: profile?.frozenBalance || 0n, c: "#F59E0B" },
        ].map((c) => (
          <div
            key={c.l}
            className="rounded-xl p-3 text-center"
            style={{
              background: "rgba(20,28,34,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-[10px] text-[#A8B2BA]">{c.l}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: c.c }}>
              {fmt(c.v)}
            </p>
          </div>
        ))}
      </div>

      {/* Bank Details */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: "rgba(20,28,34,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex justify-between items-center">
          <p className="font-semibold text-white">Bank Account</p>
          {bankDetails && (
            <span className="text-xs text-[#A8B2BA]">
              {editsRemaining} edits left this month
            </span>
          )}
        </div>

        {bankDetails && !showBankForm ? (
          <div className="space-y-1">
            <p className="text-sm text-white">
              {bankDetails.bankName} - {bankDetails.branchName}
            </p>
            <p className="text-sm text-[#A8B2BA]">
              A/C: ****{bankDetails.accountNumber.slice(-4)}
            </p>
            <p className="text-sm text-[#A8B2BA]">
              {bankDetails.holderName} • {bankDetails.phone}
            </p>
            {editsRemaining > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowBankForm(true);
                  setBankStep("ifsc");
                }}
                className="text-xs mt-2 px-3 py-1 rounded-lg border border-white/10 text-[#A8B2BA]"
              >
                Edit Bank Details
              </button>
            )}
          </div>
        ) : !showBankForm ? (
          <button
            type="button"
            onClick={() => setShowBankForm(true)}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{
              background: "rgba(31,163,106,0.15)",
              border: "1px solid rgba(31,163,106,0.3)",
              color: "#1FA36A",
            }}
          >
            + Setup Bank Account
          </button>
        ) : (
          <div className="space-y-3">
            {bankStep === "ifsc" && (
              <>
                <input
                  value={ifscInput}
                  onChange={(e) => setIfscInput(e.target.value.toUpperCase())}
                  placeholder="Enter IFSC Code (e.g. SBIN0001234)"
                  maxLength={11}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#A8B2BA] outline-none"
                />
                <button
                  type="button"
                  onClick={handleLookupIFSC}
                  disabled={ifscInput.length < 11 || loading}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, #137A56, #1FA36A)",
                  }}
                >
                  {loading ? "Verifying..." : "Verify IFSC"}
                </button>
              </>
            )}
            {bankStep === "confirm" && ifscInfo && (
              <>
                <div className="rounded-xl p-3 bg-white/5 border border-white/10">
                  <p className="text-sm font-semibold text-white">
                    {ifscInfo.bankName}
                  </p>
                  <p className="text-xs text-[#A8B2BA]">
                    {ifscInfo.branchName}
                  </p>
                  <p className="text-xs text-[#A8B2BA]">IFSC: {ifscInput}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBankStep("ifsc")}
                    className="py-2.5 rounded-xl text-sm border border-white/10 text-[#A8B2BA]"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankStep("details")}
                    className="py-2.5 rounded-xl text-sm font-medium text-white"
                    style={{
                      background: "linear-gradient(135deg, #137A56, #1FA36A)",
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}
            {bankStep === "details" && (
              <>
                <input
                  value={accNo}
                  onChange={(e) => setAccNo(e.target.value)}
                  placeholder="Account Number"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#A8B2BA] outline-none"
                />
                <input
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Account Holder Name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#A8B2BA] outline-none"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number"
                  type="tel"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#A8B2BA] outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveBank}
                  disabled={!accNo || !holderName || !phone || loading}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, #137A56, #1FA36A)",
                  }}
                >
                  {loading ? "Saving..." : "Save Bank Details"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBankForm(false)}
                  className="w-full py-2 text-xs text-[#A8B2BA]"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Withdrawal */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: "rgba(20,28,34,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p className="font-semibold text-white">Withdraw Earnings</p>
        <p className="text-xs text-[#A8B2BA]">
          Available:{" "}
          <span style={{ color: "#1FA36A" }}>
            {fmt(profile?.withdrawableBalance || 0n)}
          </span>{" "}
          • Minimum: ₹200
        </p>
        <div className="flex gap-2">
          <input
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Amount"
            type="number"
            min="200"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#A8B2BA] outline-none"
          />
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={
              !withdrawAmount || Number(withdrawAmount) < 200 || loading
            }
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #137A56, #1FA36A)" }}
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Withdrawal history */}
      {withdrawals.length > 0 && (
        <div>
          <p className="font-semibold text-white mb-2">Withdrawal History</p>
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div
                key={String(w.id)}
                className="rounded-xl p-3 flex justify-between"
                style={{
                  background: "rgba(20,28,34,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-sm">{fmt(w.amount)}</span>
                <span
                  className="text-xs px-2 py-1 rounded-full"
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
                  {"Completed" in w.status
                    ? "Completed"
                    : "Rejected" in w.status
                      ? "Rejected"
                      : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
