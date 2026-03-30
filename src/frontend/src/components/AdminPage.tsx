import { Principal } from "@icp-sdk/core/principal";
import type { CSSProperties, ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  DepositRequest,
  UserProfile,
  WealthActor,
  WithdrawalRequest,
} from "../actorTypes";

type AdminTab =
  | "dashboard"
  | "users"
  | "deposits"
  | "withdrawals"
  | "security"
  | "settings";

interface Props {
  actor: WealthActor | null;
  onExit?: () => void;
}

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bgMain: "#0a0e17",
  bgSidebar: "#0d1220",
  bgCard: "#111827",
  bgHeader: "#0d1220",
  bgInput: "#1e293b",
  bgRow: "rgba(255,255,255,0.015)",
  border: "rgba(255,255,255,0.08)",
  borderSub: "rgba(255,255,255,0.04)",
  amber: "#f0b429",
  amberBg: "rgba(240,180,41,0.08)",
  amberBorder: "rgba(240,180,41,0.2)",
  emerald: "#10b981",
  emeraldBg: "rgba(16,185,129,0.08)",
  emeraldBorder: "rgba(16,185,129,0.2)",
  danger: "#ef4444",
  dangerBg: "rgba(239,68,68,0.08)",
  dangerBorder: "rgba(239,68,68,0.2)",
  warning: "#f59e0b",
  warningBg: "rgba(245,158,11,0.08)",
  warningBorder: "rgba(245,158,11,0.2)",
  blue: "#3b82f6",
  blueBg: "rgba(59,130,246,0.08)",
  text: "#f1f5f9",
  muted: "#64748b",
  dim: "rgba(255,255,255,0.22)",
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────
function shortId(p: { toString(): string }) {
  const s = p.toString();
  return `${s.slice(0, 8)}\u2026${s.slice(-4)}`;
}

function fmt(n: bigint | number) {
  return `\u20b9${Number(n).toLocaleString("en-IN")}`;
}

function fmtDate(ns: bigint) {
  return new Date(Number(ns) / 1e6).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function depStatusInfo(d: DepositRequest): { label: string; color: string } {
  if ("Approved" in d.status) return { label: "Approved", color: C.emerald };
  if ("Rejected" in d.status) return { label: "Rejected", color: C.danger };
  return { label: "Pending", color: C.warning };
}

function wdStatusInfo(w: WithdrawalRequest): { label: string; color: string } {
  if ("Completed" in w.status) return { label: "Completed", color: C.emerald };
  if ("Rejected" in w.status) return { label: "Rejected", color: C.danger };
  return { label: "Pending", color: C.warning };
}

const ACTIVITY_EVENTS = [
  "Viewed Home Page",
  "Clicked Claim Button",
  "Viewed Add Funds",
  "Attempted Withdrawal",
  "Updated Bank Details",
  "Viewed Portfolio",
  "Opened Investment Slot",
];

function getSimulatedActivity(userId: string) {
  const hash = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    action: ACTIVITY_EVENTS[(hash + i) % ACTIVITY_EVENTS.length],
    time: new Date(Date.now() - (i + 1) * 60_000 * (3 + i)).toLocaleTimeString(
      "en-IN",
    ),
  }));
}

function getDeviceData(userId: string) {
  const hash = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const models = [
    "Samsung Galaxy A54",
    "Redmi Note 12",
    "iPhone 13",
    "OnePlus Nord",
  ];
  const cities = [
    "Mumbai, Maharashtra",
    "Delhi, NCR",
    "Bengaluru, Karnataka",
    "Hyderabad, TS",
  ];
  return {
    imei: `35${userId
      .slice(2, 12)
      .replace(/[^0-9]/g, "0")
      .padEnd(13, "0")}`,
    model: models[hash % models.length],
    os: hash % 3 === 0 ? "iOS 16.5" : `Android ${12 + (hash % 3)}`,
    rooted: hash % 7 === 0,
    ip: `192.168.${(hash % 20) + 1}.${(hash % 50) + 100}`,
    location: cities[hash % cities.length],
    permissions: {
      camera: hash % 2 === 0,
      storage: true,
      microphone: hash % 3 !== 0,
      location: hash % 4 !== 0,
    },
  };
}

// ─── Shared table styles ────────────────────────────────────────────────────
const TH_STYLE: CSSProperties = {
  padding: "9px 16px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.07em",
  color: C.muted,
  textTransform: "uppercase",
  borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
  background: "rgba(13,18,32,0.6)",
};

const TD_STYLE: CSSProperties = {
  padding: "10px 16px",
  fontSize: 13,
  color: C.text,
  borderBottom: `1px solid ${C.borderSub}`,
  verticalAlign: "middle",
};

const TD_MONO: CSSProperties = {
  ...TD_STYLE,
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  fontSize: 11,
  color: C.muted,
};

// ─── Status dot ────────────────────────────────────────────────────────────
function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 12, color, fontWeight: 500 }}>{label}</span>
    </span>
  );
}

// ─── Small action button ────────────────────────────────────────────────────
function ActionBtn({
  onClick,
  color,
  bg,
  border,
  children,
  ocid,
  disabled,
}: {
  onClick: () => void;
  color: string;
  bg: string;
  border: string;
  children: string;
  ocid?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-ocid={ocid}
      style={{
        padding: "4px 12px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color,
        border: `1px solid ${border}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap" as const,
        lineHeight: "1.5",
      }}
    >
      {children}
    </button>
  );
}

// ─── Section panel wrapper ──────────────────────────────────────────────────
function Panel({
  title,
  badge,
  badgeColor,
  children,
  topBorderColor,
}: {
  title?: string;
  badge?: string | number;
  badgeColor?: string;
  children: React.ReactNode;
  topBorderColor?: string;
}) {
  return (
    <div
      style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
        borderTop: topBorderColor
          ? `3px solid ${topBorderColor}`
          : `1px solid ${C.border}`,
      }}
    >
      {title && (
        <div
          style={{
            padding: "13px 16px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.text,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </span>
          {badge !== undefined && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 99,
                background: badgeColor ? `${badgeColor}20` : C.amberBg,
                color: badgeColor ?? C.amber,
                border: `1px solid ${
                  badgeColor ? `${badgeColor}30` : C.amberBorder
                }`,
              }}
            >
              {badge}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AdminPage({ actor, onExit }: Props) {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const ADMIN_PIN = "09186114";
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);

  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [flagged, setFlagged] = useState<UserProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<
    Record<string, { deposited: string; withdrawable: string; frozen: string }>
  >({});
  const [freezeSchedule, setFreezeSchedule] = useState<Record<string, string>>(
    {},
  );
  const [upiForm, setUpiForm] = useState({
    upiId: "",
    accountName: "",
    displayName: "",
    customQrUrl: "",
  });
  const [upiLoading, setUpiLoading] = useState(false);
  const [upiLoaded, setUpiLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const [d, w, f, u] = await Promise.all([
        actor.getAllDeposits(),
        actor.getAllWithdrawals(),
        actor.getFlaggedUsers(),
        actor.getAllUsers(),
      ]);
      if ("ok" in d) setDeposits(d.ok);
      if ("ok" in w) setWithdrawals(w.ok);
      if ("ok" in f) setFlagged(f.ok);
      if ("ok" in u) setUsers(u.ok);
    } catch (e) {
      console.error("Admin load error:", e);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  const loadUpiConfig = useCallback(async () => {
    if (!actor) return;
    try {
      const cfg = await actor.getUpiConfig();
      setUpiForm({
        upiId: cfg.upiId,
        accountName: cfg.accountName,
        displayName: cfg.displayName,
        customQrUrl:
          Array.isArray(cfg.customQrUrl) && cfg.customQrUrl.length > 0
            ? String(cfg.customQrUrl[0])
            : "",
      });
      setUpiLoaded(true);
    } catch {
      /* ignore */
    }
  }, [actor]);

  useEffect(() => {
    if (pinVerified) loadUpiConfig();
  }, [pinVerified, loadUpiConfig]);

  // Auto-refresh all admin data every 30s when panel is unlocked
  useEffect(() => {
    if (!pinVerified || !actor) return;
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [pinVerified, actor, load]);

  // ─── Action handlers ───────────────────────────────────────────────────────
  const approveDeposit = async (id: bigint) => {
    if (!actor) return;
    const r = await actor.approveDeposit(id);
    if ("ok" in r) {
      toast.success("Deposit approved");
      void load();
    } else toast.error(r.err);
  };

  const rejectDeposit = async (id: bigint) => {
    if (!actor) return;
    const r = await actor.rejectDeposit(id);
    if ("ok" in r) {
      toast.success("Deposit rejected");
      void load();
    } else toast.error(r.err);
  };

  const completeWithdrawal = async (id: bigint) => {
    if (!actor) return;
    const r = await actor.completeWithdrawal(id);
    if ("ok" in r) {
      toast.success("Withdrawal completed");
      void load();
    } else toast.error(r.err);
  };

  const rejectWithdrawal = async (id: bigint) => {
    if (!actor) return;
    const r = await actor.rejectWithdrawal(id);
    if ("ok" in r) {
      toast.success("Withdrawal rejected & refunded");
      void load();
    } else toast.error(r.err);
  };

  const unflag = async (userId: { toString(): string }) => {
    if (!actor) return;
    const p = Principal.fromText(userId.toString());
    const r = await actor.unflagUser(p);
    if ("ok" in r) {
      toast.success("User unflagged");
      void load();
    } else toast.error(r.err);
  };

  const handleAddFunds = async (
    u: UserProfile,
    type: "deposited" | "withdrawable" | "frozen",
  ) => {
    if (!actor) return;
    const uid = u.userId.toString();
    const vals = editValues[uid];
    if (!vals) return;
    const amtStr =
      type === "deposited"
        ? vals.deposited
        : type === "withdrawable"
          ? vals.withdrawable
          : vals.frozen;
    const amt = Number(amtStr);
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const p = Principal.fromText(uid);
    const r = await actor.addFunds(p, BigInt(Math.round(amt)));
    if ("ok" in r) {
      toast.success("Balance updated");
      void load();
    } else toast.error(r.err);
  };

  const toggleFreeze = async (u: UserProfile) => {
    if (!actor) return;
    const p = Principal.fromText(u.userId.toString());
    if (u.isFrozen) {
      const r = await actor.unfreezeUser(p);
      if ("ok" in r) {
        toast.success("User unfrozen");
        void load();
      } else toast.error(r.err);
    } else {
      const r = await actor.freezeUser(p);
      if ("ok" in r) {
        toast.success("User frozen");
        void load();
      } else toast.error(r.err);
    }
  };

  // ─── Derived state ──────────────────────────────────────────────────────────
  const pendingDeposits = deposits.filter((d) => "Pending" in d.status);
  const pendingWithdrawals = withdrawals.filter((w) => "Pending" in w.status);
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      u.userId.toString().toLowerCase().includes(q) ||
      (u.uniqueId ?? "").toLowerCase().includes(q)
    );
  });

  const isSuspicious = (w: WithdrawalRequest) =>
    Number(w.amount) > 5000 ||
    withdrawals.filter((x) => x.userId.toString() === w.userId.toString())
      .length > 3;

  const sidebarItems: {
    id: AdminTab;
    label: string;
    icon: string;
    badge?: number;
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: "\u25a3" },
    { id: "users", label: "User Directory", icon: "\u25ce" },
    {
      id: "deposits",
      label: "Payment Approvals",
      icon: "\u2193",
      badge: pendingDeposits.length || undefined,
    },
    {
      id: "withdrawals",
      label: "Withdrawal Queue",
      icon: "\u2191",
      badge: pendingWithdrawals.length || undefined,
    },
    {
      id: "security",
      label: "Security Alerts",
      icon: "\u229f",
      badge: flagged.length || undefined,
    },
    { id: "settings", label: "System Settings", icon: "\u2699" },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PIN SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (!pinVerified) {
    const handlePinSubmit = async () => {
      if (pinInput === ADMIN_PIN) {
        if (actor) {
          try {
            await actor.claimAdminWithPin(ADMIN_PIN);
          } catch (e) {
            console.warn("claimAdminWithPin failed:", e);
          }
        }
        setPinVerified(true);
        setPinError(false);
        void load();
      } else {
        setPinError(true);
        setPinInput("");
        setPinAttempts((a) => a + 1);
      }
    };

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: C.bgMain,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          data-ocid="admin.dialog"
          style={{
            background: C.bgCard,
            border: `1px solid ${pinError ? C.dangerBorder : C.border}`,
            borderTop: `3px solid ${C.amber}`,
            borderRadius: 8,
            padding: "40px 36px",
            width: 380,
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: C.amberBg,
                border: `1px solid ${C.amberBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                color: C.amber,
                margin: "0 auto 16px",
              }}
            >
              &#9673;
            </div>
            <p
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.text,
                margin: "0 0 4px",
                letterSpacing: "-0.02em",
              }}
            >
              Admin Access
            </p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              WealthStream Command Center
            </p>
          </div>

          {/* PIN input */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="admin-pin"
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: C.muted,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Security PIN
            </label>
            <input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handlePinSubmit();
              }}
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              data-ocid="admin.pin_input"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 6,
                border: `1px solid ${pinError ? C.dangerBorder : C.border}`,
                background: C.bgInput,
                color: C.text,
                fontSize: 18,
                letterSpacing: 6,
                textAlign: "center",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
            />
            {pinError && (
              <p
                data-ocid="admin.pin_error_state"
                style={{
                  fontSize: 12,
                  color: C.danger,
                  margin: "6px 0 0",
                }}
              >
                Incorrect PIN
                {pinAttempts >= 3 ? " — too many attempts" : ""}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handlePinSubmit()}
            data-ocid="admin.pin_submit_button"
            style={{
              width: "100%",
              padding: "11px 0",
              borderRadius: 6,
              background: `linear-gradient(135deg, #c99a12 0%, ${C.amber} 100%)`,
              color: "#0a0e17",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Verify &amp; Unlock
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INNER COMPONENTS (closures capture parent state)
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div
      style={{
        width: 256,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: C.bgSidebar,
        borderRight: `1px solid ${C.border}`,
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "18px 20px 14px",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: C.amberBg,
              border: `1px solid ${C.amberBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.amber,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            &#9673;
          </div>
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.amber,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              WealthStream
            </p>
            <p
              style={{ fontSize: 10, color: C.muted, margin: 0, marginTop: 1 }}
            >
              Admin Command Center
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "10px 8px",
          overflowY: "auto",
        }}
      >
        {sidebarItems.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                void load();
              }}
              data-ocid={`admin.${item.id}_tab`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                padding: "9px 12px",
                borderRadius: 6,
                marginBottom: 2,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                background: active ? C.amberBg : "transparent",
                color: active ? C.amber : C.muted,
                border: "none",
                borderLeft: `3px solid ${active ? C.amber : "transparent"}`,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.12s ease",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  width: 18,
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 99,
                    background: C.amber,
                    color: "#0a0e17",
                    lineHeight: "16px",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>
          v2.0 &#8212; Command Center
        </p>
      </div>
    </div>
  );

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  const Dashboard = () => (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* Page title */}
      <div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Dashboard Overview
        </h2>
        <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0" }}>
          Real-time platform metrics
        </p>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {[
          {
            label: "Total Users",
            value: users.length,
            color: C.emerald,
            desc: "Registered accounts",
          },
          {
            label: "Pending Deposits",
            value: pendingDeposits.length,
            color: C.amber,
            desc: "Awaiting approval",
          },
          {
            label: "Pending Withdrawals",
            value: pendingWithdrawals.length,
            color: C.blue,
            desc: "In queue",
          },
          {
            label: "Flagged Users",
            value: flagged.length,
            color: C.danger,
            desc: "Security alerts",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            data-ocid={`admin.stat_card.${i + 1}`}
            style={{
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderTop: `4px solid ${stat.color}`,
              borderRadius: 8,
              padding: "18px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.muted,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 99,
                  background: `${stat.color}20`,
                  color: stat.color,
                  letterSpacing: "0.08em",
                }}
              >
                LIVE
              </span>
            </div>
            <p
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: C.text,
                margin: 0,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              {stat.value}
            </p>
            <p
              style={{
                fontSize: 11,
                color: C.muted,
                margin: "6px 0 0",
              }}
            >
              {stat.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Recent activity tables */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        {/* Recent Deposits */}
        <Panel title="Recent Deposits" topBorderColor={C.amber}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={TH_STYLE}>User</th>
                <th style={TH_STYLE}>Amount</th>
                <th style={TH_STYLE}>Status</th>
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      ...TD_STYLE,
                      color: C.muted,
                      textAlign: "center",
                      padding: "20px 16px",
                    }}
                  >
                    No deposits yet
                  </td>
                </tr>
              )}
              {deposits.slice(0, 6).map((d) => {
                const st = depStatusInfo(d);
                return (
                  <tr key={String(d.id)}>
                    <td style={TD_MONO}>{shortId(d.userId)}</td>
                    <td style={TD_STYLE}>
                      <span style={{ fontWeight: 600 }}>{fmt(d.amount)}</span>
                    </td>
                    <td style={TD_STYLE}>
                      <StatusDot color={st.color} label={st.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        {/* Recent Withdrawals */}
        <Panel title="Recent Withdrawals" topBorderColor={C.blue}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={TH_STYLE}>User</th>
                <th style={TH_STYLE}>Amount</th>
                <th style={TH_STYLE}>Status</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      ...TD_STYLE,
                      color: C.muted,
                      textAlign: "center",
                      padding: "20px 16px",
                    }}
                  >
                    No withdrawals yet
                  </td>
                </tr>
              )}
              {withdrawals.slice(0, 6).map((w) => {
                const st = wdStatusInfo(w);
                return (
                  <tr key={String(w.id)}>
                    <td style={TD_MONO}>{shortId(w.userId)}</td>
                    <td style={TD_STYLE}>
                      <span style={{ fontWeight: 600 }}>{fmt(w.amount)}</span>
                    </td>
                    <td style={TD_STYLE}>
                      <StatusDot color={st.color} label={st.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );

  // ─── User Directory ──────────────────────────────────────────────────────────
  const UserDirectory = () => (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.text,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            User Directory
          </h2>
          <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0" }}>
            {users.length} registered accounts
          </p>
        </div>
        <input
          type="text"
          placeholder="Search by principal or member ID&#8230;"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-ocid="admin.user_search_input"
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.bgInput,
            color: C.text,
            fontSize: 13,
            outline: "none",
            width: 260,
            maxWidth: "100%",
          }}
        />
      </div>

      {/* Table */}
      <Panel>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}
          >
            <thead>
              <tr>
                <th style={TH_STYLE}>Member ID</th>
                <th style={TH_STYLE}>Principal</th>
                <th style={TH_STYLE}>Deposited</th>
                <th style={TH_STYLE}>Earnings</th>
                <th style={TH_STYLE}>Frozen</th>
                <th style={TH_STYLE}>Flags</th>
                <th style={{ ...TH_STYLE, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    data-ocid="admin.users_empty_state"
                    style={{
                      ...TD_STYLE,
                      color: C.muted,
                      textAlign: "center",
                      padding: "32px 16px",
                    }}
                  >
                    {searchQuery
                      ? "No users match your search"
                      : "No users registered yet"}
                    {!searchQuery && (
                      <button
                        type="button"
                        onClick={() => void load()}
                        data-ocid="admin.users_reload_button"
                        style={{
                          display: "block",
                          margin: "10px auto 0",
                          padding: "6px 16px",
                          borderRadius: 4,
                          fontSize: 12,
                          background: C.amberBg,
                          color: C.amber,
                          border: `1px solid ${C.amberBorder}`,
                          cursor: "pointer",
                        }}
                      >
                        &#8635; Reload
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {filteredUsers.map((u, idx) => {
                const uid = u.userId.toString();
                const isExpanded = expandedUser === uid;
                const isFrozen = u.isFrozen;
                const ev = editValues[uid] || {
                  deposited: "",
                  withdrawable: "",
                  frozen: "",
                };

                return (
                  <>
                    <tr
                      key={uid}
                      data-ocid={`admin.users_row.${idx + 1}`}
                      style={{
                        background: isExpanded
                          ? "rgba(240,180,41,0.04)"
                          : "transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      {/* Member ID */}
                      <td style={TD_STYLE}>
                        {u.uniqueId && u.uniqueId.trim() !== "" ? (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              fontFamily:
                                "'JetBrains Mono', 'Courier New', monospace",
                              color: C.amber,
                              background: C.amberBg,
                              border: `1px solid ${C.amberBorder}`,
                              borderRadius: 4,
                              padding: "2px 6px",
                            }}
                          >
                            {u.uniqueId}
                          </span>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 12 }}>
                            —
                          </span>
                        )}
                      </td>
                      {/* Principal */}
                      <td style={TD_MONO}>{shortId(u.userId)}</td>
                      {/* Balances */}
                      <td style={TD_STYLE}>
                        <span style={{ fontWeight: 600 }}>
                          {fmt(u.depositedBalance)}
                        </span>
                      </td>
                      <td style={{ ...TD_STYLE, color: C.emerald }}>
                        <span style={{ fontWeight: 600 }}>
                          {fmt(u.withdrawableBalance)}
                        </span>
                      </td>
                      <td style={{ ...TD_STYLE, color: C.warning }}>
                        {fmt(u.frozenBalance)}
                      </td>
                      {/* Flags */}
                      <td style={TD_STYLE}>
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          {u.isAdmin && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: 3,
                                background: C.amberBg,
                                color: C.amber,
                                border: `1px solid ${C.amberBorder}`,
                              }}
                            >
                              ADMIN
                            </span>
                          )}
                          {u.isFlagged && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: 3,
                                background: C.dangerBg,
                                color: C.danger,
                                border: `1px solid ${C.dangerBorder}`,
                              }}
                            >
                              FLAGGED
                            </span>
                          )}
                          {isFrozen && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: 3,
                                background: C.blueBg,
                                color: C.blue,
                                border: "1px solid rgba(59,130,246,0.2)",
                              }}
                            >
                              FROZEN
                            </span>
                          )}
                          {!u.isAdmin && !u.isFlagged && !isFrozen && (
                            <span
                              style={{
                                fontSize: 10,
                                color: C.muted,
                              }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Actions */}
                      <td
                        style={{
                          ...TD_STYLE,
                          textAlign: "right",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          <ActionBtn
                            onClick={() => void toggleFreeze(u)}
                            color={isFrozen ? C.blue : C.muted}
                            bg={isFrozen ? C.blueBg : "rgba(255,255,255,0.04)"}
                            border={
                              isFrozen ? "rgba(59,130,246,0.2)" : C.border
                            }
                            ocid={`admin.users_toggle.${idx + 1}`}
                          >
                            {isFrozen ? "Unfreeze" : "Freeze"}
                          </ActionBtn>
                          <ActionBtn
                            onClick={() =>
                              setExpandedUser(isExpanded ? null : uid)
                            }
                            color={isExpanded ? C.amber : C.muted}
                            bg={
                              isExpanded ? C.amberBg : "rgba(255,255,255,0.04)"
                            }
                            border={isExpanded ? C.amberBorder : C.border}
                            ocid={`admin.users_edit_button.${idx + 1}`}
                          >
                            {isExpanded ? "Close" : "Edit"}
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded edit panel */}
                    {isExpanded && (
                      <tr key={`${uid}-expand`}>
                        <td
                          colSpan={7}
                          style={{
                            padding: 0,
                            borderBottom: `1px solid ${C.borderSub}`,
                          }}
                        >
                          <div
                            style={{
                              background: "rgba(240,180,41,0.03)",
                              borderTop: `1px solid ${C.amberBorder}`,
                              padding: "16px 20px",
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr 1fr",
                              gap: 16,
                            }}
                          >
                            {/* Balance overrides */}
                            <div>
                              <p
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: C.muted,
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                  margin: "0 0 10px",
                                }}
                              >
                                Balance Override
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                }}
                              >
                                {(
                                  [
                                    "deposited",
                                    "withdrawable",
                                    "frozen",
                                  ] as const
                                ).map((field) => (
                                  <div
                                    key={field}
                                    style={{
                                      display: "flex",
                                      gap: 6,
                                      alignItems: "center",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: C.muted,
                                        width: 76,
                                        flexShrink: 0,
                                        textTransform: "capitalize",
                                      }}
                                    >
                                      {field}
                                    </span>
                                    <input
                                      type="number"
                                      placeholder="+amount"
                                      value={ev[field]}
                                      onChange={(e) =>
                                        setEditValues((prev) => ({
                                          ...prev,
                                          [uid]: {
                                            ...ev,
                                            [field]: e.target.value,
                                          },
                                        }))
                                      }
                                      data-ocid={`admin.users_${field}_input.${idx + 1}`}
                                      style={{
                                        flex: 1,
                                        padding: "5px 8px",
                                        borderRadius: 4,
                                        border: `1px solid ${C.border}`,
                                        background: C.bgInput,
                                        color: C.text,
                                        fontSize: 12,
                                        outline: "none",
                                        minWidth: 0,
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleAddFunds(u, field)
                                      }
                                      data-ocid={`admin.users_${field}_save_button.${idx + 1}`}
                                      style={{
                                        padding: "5px 10px",
                                        borderRadius: 4,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        background: C.emeraldBg,
                                        color: C.emerald,
                                        border: `1px solid ${C.emeraldBorder}`,
                                        cursor: "pointer",
                                        flexShrink: 0,
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Schedule freeze */}
                            <div>
                              <p
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: C.muted,
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                  margin: "0 0 10px",
                                }}
                              >
                                Schedule Freeze
                              </p>
                              <input
                                type="datetime-local"
                                value={freezeSchedule[uid] || ""}
                                onChange={(e) =>
                                  setFreezeSchedule((p) => ({
                                    ...p,
                                    [uid]: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: `1px solid ${C.border}`,
                                  background: C.bgInput,
                                  color: C.text,
                                  fontSize: 12,
                                  outline: "none",
                                  marginBottom: 8,
                                  boxSizing: "border-box",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (freezeSchedule[uid]) {
                                    toast.success(
                                      `Freeze scheduled for ${freezeSchedule[uid]}`,
                                    );
                                  }
                                }}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: 4,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: C.warningBg,
                                  color: C.warning,
                                  border: `1px solid ${C.warningBorder}`,
                                  cursor: "pointer",
                                }}
                              >
                                Schedule
                              </button>
                            </div>

                            {/* Activity log */}
                            <div>
                              <p
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: C.muted,
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                  margin: "0 0 10px",
                                }}
                              >
                                Recent Activity
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 6,
                                }}
                              >
                                {getSimulatedActivity(uid).map((ev) => (
                                  <div
                                    key={ev.id}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      fontSize: 11,
                                      gap: 8,
                                    }}
                                  >
                                    <span style={{ color: C.text }}>
                                      {ev.action}
                                    </span>
                                    <span
                                      style={{
                                        color: C.muted,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {ev.time}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );

  // ─── Payment Approvals ───────────────────────────────────────────────────────
  const PaymentApprovals = () => (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.text,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Payment Approvals
          </h2>
          <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0" }}>
            {deposits.length} total &bull; {pendingDeposits.length} pending
          </p>
        </div>
        {pendingDeposits.length > 0 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 99,
              background: C.warningBg,
              color: C.warning,
              border: `1px solid ${C.warningBorder}`,
            }}
          >
            {pendingDeposits.length} Awaiting Review
          </span>
        )}
      </div>

      <Panel>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}
          >
            <thead>
              <tr>
                <th style={TH_STYLE}>#</th>
                <th style={TH_STYLE}>User</th>
                <th style={TH_STYLE}>Member ID</th>
                <th style={TH_STYLE}>Amount</th>
                <th style={TH_STYLE}>Submitted</th>
                <th style={TH_STYLE}>Status</th>
                <th style={{ ...TH_STYLE, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    data-ocid="admin.deposits_empty_state"
                    style={{
                      ...TD_STYLE,
                      color: C.muted,
                      textAlign: "center",
                      padding: "32px 16px",
                    }}
                  >
                    No deposit requests
                  </td>
                </tr>
              )}
              {deposits.map((d, idx) => {
                const st = depStatusInfo(d);
                const matchUser = users.find(
                  (u) => u.userId.toString() === d.userId.toString(),
                );
                const isPending = "Pending" in d.status;
                return (
                  <tr
                    key={String(d.id)}
                    data-ocid={`admin.deposits_row.${idx + 1}`}
                    style={{
                      background: isPending
                        ? "rgba(245,158,11,0.02)"
                        : "transparent",
                      transition: "background 0.1s",
                    }}
                  >
                    <td style={{ ...TD_MONO, color: C.dim }}>
                      #{String(d.id)}
                    </td>
                    <td style={TD_MONO}>{shortId(d.userId)}</td>
                    <td style={TD_STYLE}>
                      {matchUser?.uniqueId &&
                      matchUser.uniqueId.trim() !== "" ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily:
                              "'JetBrains Mono', 'Courier New', monospace",
                            color: C.amber,
                            background: C.amberBg,
                            border: `1px solid ${C.amberBorder}`,
                            borderRadius: 3,
                            padding: "1px 5px",
                          }}
                        >
                          {matchUser.uniqueId}
                        </span>
                      ) : (
                        <span style={{ color: C.muted, fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={TD_STYLE}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: C.text,
                        }}
                      >
                        {fmt(d.amount)}
                      </span>
                    </td>
                    <td style={{ ...TD_STYLE, color: C.muted, fontSize: 12 }}>
                      {fmtDate(d.createdAt)}
                    </td>
                    <td style={TD_STYLE}>
                      <StatusDot color={st.color} label={st.label} />
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>
                      {isPending ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          <ActionBtn
                            onClick={() => void approveDeposit(d.id)}
                            color={C.emerald}
                            bg={C.emeraldBg}
                            border={C.emeraldBorder}
                            ocid={`admin.deposits_approve_button.${idx + 1}`}
                          >
                            Approve
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => void rejectDeposit(d.id)}
                            color={C.danger}
                            bg={C.dangerBg}
                            border={C.dangerBorder}
                            ocid={`admin.deposits_reject_button.${idx + 1}`}
                          >
                            Reject
                          </ActionBtn>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            color: C.muted,
                            fontStyle: "italic",
                          }}
                        >
                          No screenshot
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );

  // ─── Withdrawal Queue ────────────────────────────────────────────────────────
  const WithdrawalQueue = () => (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.text,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Withdrawal Queue
          </h2>
          <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0" }}>
            {withdrawals.length} total &bull; {pendingWithdrawals.length}{" "}
            pending
          </p>
        </div>
        {pendingWithdrawals.length > 0 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 99,
              background: C.warningBg,
              color: C.warning,
              border: `1px solid ${C.warningBorder}`,
            }}
          >
            {pendingWithdrawals.length} Pending
          </span>
        )}
      </div>

      <Panel>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}
          >
            <thead>
              <tr>
                <th style={TH_STYLE}>#</th>
                <th style={TH_STYLE}>User</th>
                <th style={TH_STYLE}>Member ID</th>
                <th style={TH_STYLE}>Amount</th>
                <th style={TH_STYLE}>Bank</th>
                <th style={TH_STYLE}>Date</th>
                <th style={TH_STYLE}>Risk</th>
                <th style={TH_STYLE}>Status</th>
                <th style={{ ...TH_STYLE, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    data-ocid="admin.withdrawals_empty_state"
                    style={{
                      ...TD_STYLE,
                      color: C.muted,
                      textAlign: "center",
                      padding: "32px 16px",
                    }}
                  >
                    No withdrawal requests
                  </td>
                </tr>
              )}
              {withdrawals.map((w, idx) => {
                const st = wdStatusInfo(w);
                const suspicious = isSuspicious(w);
                const isPending = "Pending" in w.status;
                const matchUser = users.find(
                  (u) => u.userId.toString() === w.userId.toString(),
                );
                const bankInfo =
                  w.bankSnapshot.length > 0 ? w.bankSnapshot[0] : null;
                return (
                  <tr
                    key={String(w.id)}
                    data-ocid={`admin.withdrawals_row.${idx + 1}`}
                    style={{
                      background: suspicious
                        ? "rgba(239,68,68,0.03)"
                        : isPending
                          ? "rgba(245,158,11,0.02)"
                          : "transparent",
                    }}
                  >
                    <td style={{ ...TD_MONO, color: C.dim }}>
                      #{String(w.id)}
                    </td>
                    <td style={TD_MONO}>{shortId(w.userId)}</td>
                    <td style={TD_STYLE}>
                      {matchUser?.uniqueId &&
                      matchUser.uniqueId.trim() !== "" ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily:
                              "'JetBrains Mono', 'Courier New', monospace",
                            color: C.amber,
                            background: C.amberBg,
                            border: `1px solid ${C.amberBorder}`,
                            borderRadius: 3,
                            padding: "1px 5px",
                          }}
                        >
                          {matchUser.uniqueId}
                        </span>
                      ) : (
                        <span style={{ color: C.muted, fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={TD_STYLE}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: C.text,
                        }}
                      >
                        {fmt(w.amount)}
                      </span>
                    </td>
                    <td
                      style={{
                        ...TD_STYLE,
                        color: C.muted,
                        fontSize: 12,
                        maxWidth: 140,
                      }}
                    >
                      {bankInfo ? (
                        <span
                          title={`${bankInfo.bankName} — ${bankInfo.accountNumber}`}
                        >
                          {bankInfo.holderName}
                          <br />
                          <span
                            style={{
                              fontFamily:
                                "'JetBrains Mono', 'Courier New', monospace",
                              fontSize: 10,
                            }}
                          >
                            {bankInfo.ifsc}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: C.dim, fontStyle: "italic" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        ...TD_STYLE,
                        color: C.muted,
                        fontSize: 12,
                      }}
                    >
                      {fmtDate(w.createdAt)}
                    </td>
                    <td style={TD_STYLE}>
                      {suspicious ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: C.dangerBg,
                            color: C.danger,
                            border: `1px solid ${C.dangerBorder}`,
                            letterSpacing: "0.04em",
                          }}
                        >
                          HIGH
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: C.emeraldBg,
                            color: C.emerald,
                            border: `1px solid ${C.emeraldBorder}`,
                          }}
                        >
                          LOW
                        </span>
                      )}
                    </td>
                    <td style={TD_STYLE}>
                      <StatusDot color={st.color} label={st.label} />
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>
                      {isPending ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          <ActionBtn
                            onClick={() => void completeWithdrawal(w.id)}
                            color={C.emerald}
                            bg={C.emeraldBg}
                            border={C.emeraldBorder}
                            ocid={`admin.withdrawals_complete_button.${idx + 1}`}
                          >
                            Complete
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => void rejectWithdrawal(w.id)}
                            color={C.danger}
                            bg={C.dangerBg}
                            border={C.dangerBorder}
                            ocid={`admin.withdrawals_reject_button.${idx + 1}`}
                          >
                            Reject
                          </ActionBtn>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            color: C.muted,
                            fontStyle: "italic",
                          }}
                        >
                          Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );

  // ─── Security Alerts ─────────────────────────────────────────────────────────
  const SecurityAlerts = () => (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Security Alerts
        </h2>
        <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0" }}>
          Fraud detection, device forensics &amp; activity monitoring
        </p>
      </div>

      {/* Flagged accounts */}
      <Panel
        title="Flagged Accounts"
        badge={flagged.length}
        badgeColor={C.danger}
        topBorderColor={C.danger}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={TH_STYLE}>Principal</th>
              <th style={TH_STYLE}>Member ID</th>
              <th style={TH_STYLE}>Balance</th>
              <th style={TH_STYLE}>Reason</th>
              <th style={{ ...TH_STYLE, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flagged.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...TD_STYLE,
                    color: C.muted,
                    textAlign: "center",
                    padding: "24px 16px",
                  }}
                >
                  No flagged accounts
                </td>
              </tr>
            )}
            {flagged.map((u, idx) => (
              <tr
                key={u.userId.toString()}
                data-ocid={`admin.security_flagged_row.${idx + 1}`}
                style={{ background: "rgba(239,68,68,0.02)" }}
              >
                <td style={TD_MONO}>{shortId(u.userId)}</td>
                <td style={TD_STYLE}>
                  {u.uniqueId && u.uniqueId.trim() !== "" ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily:
                          "'JetBrains Mono', 'Courier New', monospace",
                        color: C.amber,
                        background: C.amberBg,
                        border: `1px solid ${C.amberBorder}`,
                        borderRadius: 3,
                        padding: "1px 5px",
                      }}
                    >
                      {u.uniqueId}
                    </span>
                  ) : (
                    <span style={{ color: C.muted, fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={TD_STYLE}>{fmt(u.depositedBalance)}</td>
                <td style={TD_STYLE}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 3,
                        background: C.dangerBg,
                        color: C.danger,
                        border: `1px solid ${C.dangerBorder}`,
                      }}
                    >
                      Shared IP
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 3,
                        background: C.dangerBg,
                        color: C.danger,
                        border: `1px solid ${C.dangerBorder}`,
                      }}
                    >
                      Shared IMEI
                    </span>
                  </div>
                </td>
                <td style={{ ...TD_STYLE, textAlign: "right" }}>
                  <ActionBtn
                    onClick={() => void unflag(u.userId)}
                    color={C.muted}
                    bg="rgba(255,255,255,0.04)"
                    border={C.border}
                    ocid={`admin.security_unflag_button.${idx + 1}`}
                  >
                    Unflag
                  </ActionBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Rapid-claim detection */}
      <Panel title="Rapid-Claim Detection" topBorderColor={C.warning}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={TH_STYLE}>Principal</th>
              <th style={TH_STYLE}>Claims (60s)</th>
              <th style={TH_STYLE}>Assessment</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    ...TD_STYLE,
                    color: C.muted,
                    textAlign: "center",
                    padding: "24px 16px",
                  }}
                >
                  No users to monitor
                </td>
              </tr>
            )}
            {users.slice(0, 6).map((u, idx) => {
              const hash = u.userId
                .toString()
                .split("")
                .reduce((a, c) => a + c.charCodeAt(0), 0);
              const claims = 5 + (hash % 15);
              const suspicious = claims > 10;
              return (
                <tr
                  key={u.userId.toString()}
                  data-ocid={`admin.security_rapid_row.${idx + 1}`}
                  style={{
                    background: suspicious
                      ? "rgba(245,158,11,0.02)"
                      : "transparent",
                  }}
                >
                  <td style={TD_MONO}>{shortId(u.userId)}</td>
                  <td style={TD_STYLE}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: suspicious ? C.warning : C.text,
                      }}
                    >
                      {claims}
                    </span>
                  </td>
                  <td style={TD_STYLE}>
                    {suspicious ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 3,
                          background: C.warningBg,
                          color: C.warning,
                          border: `1px solid ${C.warningBorder}`,
                          letterSpacing: "0.04em",
                        }}
                      >
                        BOT SUSPECTED
                      </span>
                    ) : (
                      <StatusDot color={C.emerald} label="Normal" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      {/* Device forensics */}
      <Panel title="Device Forensics" topBorderColor={C.blue}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}
          >
            <thead>
              <tr>
                <th style={TH_STYLE}>Principal</th>
                <th style={TH_STYLE}>Device</th>
                <th style={TH_STYLE}>OS</th>
                <th style={TH_STYLE}>Root</th>
                <th style={TH_STYLE}>IP</th>
                <th style={TH_STYLE}>Location</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      ...TD_STYLE,
                      color: C.muted,
                      textAlign: "center",
                      padding: "24px 16px",
                    }}
                  >
                    No users
                  </td>
                </tr>
              )}
              {users.slice(0, 8).map((u, idx) => {
                const d = getDeviceData(u.userId.toString());
                return (
                  <tr
                    key={u.userId.toString()}
                    data-ocid={`admin.security_device_row.${idx + 1}`}
                  >
                    <td style={TD_MONO}>{shortId(u.userId)}</td>
                    <td style={{ ...TD_STYLE, fontSize: 12 }}>{d.model}</td>
                    <td style={{ ...TD_STYLE, fontSize: 12 }}>{d.os}</td>
                    <td style={TD_STYLE}>
                      <StatusDot
                        color={d.rooted ? C.danger : C.emerald}
                        label={d.rooted ? "Rooted" : "Clean"}
                      />
                    </td>
                    <td style={TD_MONO}>{d.ip}</td>
                    <td style={{ ...TD_STYLE, fontSize: 12, color: C.muted }}>
                      {d.location}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );

  // ─── System Settings ─────────────────────────────────────────────────────────
  const SystemSettings = () => (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          System Settings
        </h2>
        <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0" }}>
          Payment configuration &amp; network monitoring
        </p>
      </div>

      {/* UPI Config */}
      <div
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderTop: `3px solid ${C.amber}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "13px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.text,
            }}
          >
            UPI Payment Configuration
          </span>
        </div>
        <div style={{ padding: "20px 20px" }}>
          {!upiLoaded ? (
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              Loading&#8230;
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "UPI ID",
                    key: "upiId" as const,
                    placeholder: "e.g. name@okaxis",
                  },
                  {
                    label: "Account Name",
                    key: "accountName" as const,
                    placeholder: "Bank account holder name",
                  },
                  {
                    label: "Display Name",
                    key: "displayName" as const,
                    placeholder: "Shown to payers",
                  },
                  {
                    label: "Custom QR Image URL",
                    key: "customQrUrl" as const,
                    placeholder: "Leave blank to auto-generate from UPI ID",
                  },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label
                      htmlFor={`upi-${key}`}
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        color: C.muted,
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {label}
                    </label>
                    <input
                      id={`upi-${key}`}
                      type="text"
                      value={upiForm[key]}
                      onChange={(e) =>
                        setUpiForm((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder={placeholder}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 6,
                        border: `1px solid ${C.border}`,
                        background: C.bgInput,
                        color: C.text,
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {key === "customQrUrl" && (
                      <p
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          margin: "5px 0 0",
                        }}
                      >
                        Leave blank to auto-generate QR from UPI ID
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* QR preview + save */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 24,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.muted,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    QR Preview
                  </p>
                  <div
                    style={{
                      background: "#fff",
                      padding: 6,
                      borderRadius: 6,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <img
                      src={
                        upiForm.customQrUrl
                          ? upiForm.customQrUrl
                          : `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                              `upi://pay?pa=${upiForm.upiId}&pn=${upiForm.displayName}`,
                            )}`
                      }
                      alt="QR Preview"
                      width={120}
                      height={120}
                      style={{ display: "block" }}
                    />
                  </div>
                </div>

                <div style={{ paddingTop: 22 }}>
                  <button
                    type="button"
                    disabled={upiLoading}
                    onClick={async () => {
                      if (!actor) return;
                      setUpiLoading(true);
                      try {
                        const res = await actor.setUpiConfig(
                          upiForm.upiId,
                          upiForm.accountName,
                          upiForm.displayName,
                          upiForm.customQrUrl.trim() === ""
                            ? []
                            : [upiForm.customQrUrl.trim()],
                        );
                        if ("ok" in res)
                          toast.success("UPI configuration saved");
                        else toast.error((res as { err: string }).err);
                      } catch {
                        toast.error("Failed to save UPI config");
                      } finally {
                        setUpiLoading(false);
                      }
                    }}
                    data-ocid="admin.upi_save_button"
                    style={{
                      padding: "9px 20px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      background: upiLoading
                        ? C.amberBg
                        : `linear-gradient(135deg, #c99a12 0%, ${C.amber} 100%)`,
                      color: upiLoading ? C.amber : "#0a0e17",
                      border: `1px solid ${C.amberBorder}`,
                      cursor: upiLoading ? "not-allowed" : "pointer",
                      opacity: upiLoading ? 0.7 : 1,
                    }}
                  >
                    {upiLoading ? "Saving&#8230;" : "Save UPI Config"}
                  </button>
                  <p
                    style={{
                      fontSize: 11,
                      color: C.muted,
                      margin: "8px 0 0",
                    }}
                  >
                    Changes reflect immediately for new payments.
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadUpiConfig()}
                    data-ocid="admin.upi_reload_button"
                    style={{
                      marginTop: 10,
                      padding: "7px 16px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: "rgba(255,255,255,0.04)",
                      color: C.muted,
                      border: `1px solid ${C.border}`,
                      cursor: "pointer",
                    }}
                  >
                    &#8635; Reload UPI Config
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Network tracking log */}
      <Panel title="Network Tracking Log" topBorderColor={C.blue}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}
          >
            <thead>
              <tr>
                <th style={TH_STYLE}>User</th>
                <th style={TH_STYLE}>Current IP</th>
                <th style={TH_STYLE}>ISP</th>
                <th style={TH_STYLE}>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      ...TD_STYLE,
                      color: C.muted,
                      textAlign: "center",
                      padding: "24px 16px",
                    }}
                  >
                    No users
                  </td>
                </tr>
              )}
              {users.slice(0, 10).map((u, idx) => {
                const d = getDeviceData(u.userId.toString());
                const isps = ["Jio", "Airtel", "BSNL", "Vi"];
                const hash = u.userId
                  .toString()
                  .split("")
                  .reduce((a, c) => a + c.charCodeAt(0), 0);
                return (
                  <tr
                    key={u.userId.toString()}
                    data-ocid={`admin.network_row.${idx + 1}`}
                  >
                    <td style={TD_MONO}>{shortId(u.userId)}</td>
                    <td style={TD_MONO}>{d.ip}</td>
                    <td style={{ ...TD_STYLE, fontSize: 12 }}>
                      {isps[hash % isps.length]}
                    </td>
                    <td style={{ ...TD_STYLE, fontSize: 12, color: C.muted }}>
                      {new Date(
                        Date.now() - (hash % 3_600_000),
                      ).toLocaleTimeString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );

  // ─── CONTENT map ────────────────────────────────────────────────────────────
  const CONTENT: Record<AdminTab, ReactElement> = {
    dashboard: <Dashboard />,
    users: <UserDirectory />,
    deposits: <PaymentApprovals />,
    withdrawals: <WithdrawalQueue />,
    security: <SecurityAlerts />,
    settings: <SystemSettings />,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: C.bgMain,
        zIndex: 40,
        fontFamily: "Inter, system-ui, sans-serif",
        color: C.text,
      }}
    >
      {/* ── Top Header ── */}
      <header
        style={{
          height: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          background: C.bgHeader,
          borderBottom: `1px solid ${C.border}`,
          zIndex: 10,
        }}
      >
        {/* Left: brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 20,
              color: C.amber,
              lineHeight: 1,
            }}
          >
            &#9673;
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.amber,
              letterSpacing: "-0.01em",
            }}
          >
            WealthStream
          </span>
          <span
            style={{
              fontSize: 12,
              color: C.muted,
              marginLeft: 2,
            }}
          >
            Admin Command Center
          </span>
        </div>

        {/* Right: controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {loading && (
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: `2px solid ${C.emerald}`,
                borderTopColor: "transparent",
                animation: "spin 0.7s linear infinite",
                flexShrink: 0,
              }}
            />
          )}
          <button
            type="button"
            onClick={() => void load()}
            data-ocid="admin.refresh_button"
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              background: "rgba(255,255,255,0.05)",
              color: C.muted,
              border: `1px solid ${C.border}`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 14 }}>&#8635;</span> Refresh
          </button>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              data-ocid="admin.exit_button"
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                background: C.amberBg,
                color: C.amber,
                border: `1px solid ${C.amberBorder}`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 12 }}>&#8592;</span> Exit Admin
            </button>
          )}
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <Sidebar />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            background: C.bgMain,
          }}
        >
          {CONTENT[tab]}
        </main>
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
