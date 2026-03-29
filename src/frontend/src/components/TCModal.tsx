import { useState } from "react";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  amount: number;
  loading: boolean;
}

export default function TCModal({
  open,
  onClose,
  onConfirm,
  amount,
  loading,
}: Props) {
  const [agreed, setAgreed] = useState(false);

  const handleClose = () => {
    setAgreed(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-[#0E1825] border border-white/10 text-white max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle style={{ color: "#D6B35A" }}>
            Confirm Investment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <p className="text-[#A8B2BA] text-sm">Investment Amount</p>
            <p className="text-2xl font-bold" style={{ color: "#D6B35A" }}>
              ₹{amount.toLocaleString("en-IN")}
            </p>
            <p className="text-[#1FA36A] text-sm mt-1">
              Total Return: ₹{(amount * 1.7).toLocaleString("en-IN")} (+70%)
            </p>
          </div>

          <div className="text-xs text-[#A8B2BA] space-y-2 max-h-32 overflow-y-auto">
            <p className="font-semibold text-white">Terms & Conditions</p>
            <p>
              By investing, you agree to the following: Your deposit will be
              locked until approved by an administrator. You can claim 10% of
              your total return per hour for 10 hours. Each claim window is open
              for 5 minutes — missed windows are forfeited. Minimum withdrawal
              is ₹200 and only earnings are withdrawable. WealthStream reserves
              the right to freeze accounts for suspicious activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="tc"
              checked={agreed}
              onCheckedChange={(c) => setAgreed(!!c)}
              className="border-white/30"
            />
            <Label
              htmlFor="tc"
              className="text-sm text-[#A8B2BA] cursor-pointer"
            >
              I have read and agree to the Terms & Conditions
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#A8B2BA] text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!agreed || loading}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-40 transition-all"
            style={{
              background: "linear-gradient(135deg, #137A56 0%, #1FA36A 100%)",
              border: "1px solid rgba(200,169,86,0.35)",
            }}
          >
            {loading ? "Processing..." : "Confirm Purchase"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
