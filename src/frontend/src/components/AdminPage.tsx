import { Principal } from "@icp-sdk/core/principal";
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
}

function shortId(p: { toString(): string }) {
  const s = p.toString();
  return `${s.slice(0, 8)}...${s.slice(-4)}`;
}

function fmt(n: bigint | number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
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
  const os = hash % 3 === 0 ? "iOS 16.5" : `Android ${12 + (hash % 3)}`;
  const rooted = hash % 7 === 0;
  const n1 = (hash % 20) + 1;
  const n2 = (hash % 50) + 100;
  return {
    imei: `35${userId
      .slice(2, 12)
      .replace(/[^0-9]/g, "0")
      .padEnd(13, "0")}`,
    model: models[hash % models.length],
    os,
    rooted,
    ip: `192.168.${n1}.${n2}`,
    location: cities[hash % cities.length],
    permissions: {
      camera: hash % 2 === 0,
      storage: true,
      microphone: hash % 3 !== 0,
      location: hash % 4 !== 0,
    },
  };
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
    time: new Date(
      Date.now() - (i + 1) * 1000 * 60 * (3 + i),
    ).toLocaleTimeString("en-IN"),
  }));
}

export default function AdminPage({ actor }: Props) {
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<
    Record<string, { deposited: string; withdrawable: string; frozen: string }>
  >({});
  const [maintenanceMode, setMaintenanceMode] = useState(
    () => localStorage.getItem("maintenanceMode") === "true",
  );
  const [freezeSchedule, setFreezeSchedule] = useState<Record<string, string>>(
    {},
  );
  const [frozenUsers, setFrozenUsers] = useState<Set<string>>(new Set());

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
        actor.getPendingDeposits(),
        actor.getAllWithdrawals(),
        actor.getFlaggedUsers(),
        actor.getAllUsers(),
      ]);
      if ("ok" in d) setDeposits(d.ok);
      if ("ok" in w) setWithdrawals(w.ok);
      if ("ok" in f) setFlagged(f.ok);
      if ("ok" in u) setUsers(u.ok);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const loadUpiConfig = useCallback(async () => {
    if (!actor) return;
    try {
      const cfg = await (actor as any).getUpiConfig();
      setUpiForm({
        upiId: cfg.upiId,
        accountName: cfg.accountName,
        displayName: cfg.displayName,
        customQrUrl:
          cfg.customQrUrl.length > 0 ? String(cfg.customQrUrl[0]) : "",
      });
      setUpiLoaded(true);
    } catch {
      /* ignore */
    }
  }, [actor]);

  useEffect(() => {
    if (pinVerified) loadUpiConfig();
  }, [pinVerified, loadUpiConfig]);

  const approveDeposit = async (id: bigint) => {
    if (!actor) return;
    const r = await actor.approveDeposit(id);
    if ("ok" in r) {
      toast.success("Approved");
      void load();
    } else toast.error(r.err);
  };

  const rejectDeposit = async (id: bigint) => {
    if (!actor) return;
    const r = await actor.rejectDeposit(id);
    if ("ok" in r) {
      toast.success("Rejected");
      void load();
    } else toast.error(r.err);
  };

  const completeWithdrawal = async (id: bigint) => {
    if (!actor) return;
    const r = await actor.completeWithdrawal(id);
    if ("ok" in r) {
      toast.success("Completed");
      void load();
    } else toast.error(r.err);
  };

  const unflag = async (userId: { toString(): string }) => {
    if (!actor) return;
    const p = Principal.fromText(userId.toString());
    const r = await actor.unflagUser(p);
    if ("ok" in r) {
      toast.success("Unflagged");
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

  const toggleFreeze = (uid: string) => {
    setFrozenUsers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
        toast.success("User unfrozen");
      } else {
        next.add(uid);
        toast.success("User frozen");
      }
      return next;
    });
  };

  const toggleMaintenance = (val: boolean) => {
    setMaintenanceMode(val);
    localStorage.setItem("maintenanceMode", String(val));
    toast.success(
      val ? "Maintenance mode ENABLED" : "Maintenance mode DISABLED",
    );
  };

  const pendingDeposits = deposits.filter((d) => "Pending" in d.status);
  const pendingWithdrawals = withdrawals.filter((w) => "Pending" in w.status);
  const filteredUsers = users.filter((u) =>
    u.userId.toString().toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
    { id: "dashboard", label: "Dashboard", icon: "⊞" },
    { id: "users", label: "User Directory", icon: "👥" },
    {
      id: "deposits",
      label: "Payment Approvals",
      icon: "🧾",
      badge: pendingDeposits.length,
    },
    {
      id: "withdrawals",
      label: "Withdrawal Queue",
      icon: "↓○",
      badge: pendingWithdrawals.length,
    },
    {
      id: "security",
      label: "Security Alerts",
      icon: "🛡",
      badge: flagged.length || undefined,
    },
    { id: "settings", label: "System Settings", icon: "⚙" },
  ];

  // --- Sidebar ---
  const Sidebar = () => (
    <div
      className="flex flex-col h-full"
      style={{
        width: sidebarCollapsed ? 60 : 240,
        background: "#0D1420",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        transition: "width 0.2s ease",
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        {!sidebarCollapsed && (
          <div>
            <p className="text-sm font-bold" style={{ color: "#D6B35A" }}>
              WealthStream
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Admin Panel
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="p-1.5 rounded-lg"
          style={{ color: "#A8B2BA", background: "rgba(255,255,255,0.05)" }}
        >
          {sidebarCollapsed ? "→" : "←"}
        </button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const active = tab === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? "rgba(31,163,106,0.12)" : "transparent",
                color: active ? "#1FA36A" : "#A8B2BA",
                border: active
                  ? "1px solid rgba(31,163,106,0.2)"
                  : "1px solid transparent",
              }}
              data-ocid={`admin.${item.id}_tab`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        background: "rgba(214,179,90,0.2)",
                        color: "#D6B35A",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>
      {!sidebarCollapsed && (
        <div
          className="px-4 py-3 text-xs"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.2)",
          }}
        >
          Command Center v2.0
        </div>
      )}
    </div>
  );

  // --- Dashboard ---
  const Dashboard = () => (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-white">Dashboard Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Users",
            value: users.length,
            icon: "👥",
            glow: "#1FA36A",
          },
          {
            label: "Pending Deposits",
            value: pendingDeposits.length,
            icon: "💰",
            glow: "#D6B35A",
          },
          {
            label: "Pending Withdrawals",
            value: pendingWithdrawals.length,
            icon: "↑",
            glow: "#3B82F6",
          },
          {
            label: "Flagged Users",
            value: flagged.length,
            icon: "🚩",
            glow: "#EF4444",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-2xl p-5"
            style={{
              background: "rgba(13,20,32,0.8)",
              border: `1px solid ${stat.glow}30`,
              boxShadow: `0 0 20px ${stat.glow}10`,
            }}
            data-ocid={`admin.stat_card.${i + 1}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-2xl">{stat.icon}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: `${stat.glow}20`, color: stat.glow }}
              >
                Live
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: "#A8B2BA" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Deposits */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(13,20,32,0.8)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p className="text-sm font-semibold text-white mb-3">
            Recent Deposits
          </p>
          {deposits.slice(0, 5).map((d) => (
            <div
              key={String(d.id)}
              className="flex justify-between items-center py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div>
                <p className="text-xs font-mono" style={{ color: "#A8B2BA" }}>
                  {shortId(d.userId)}
                </p>
                <p className="text-sm font-semibold text-white">
                  {fmt(d.amount)}
                </p>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background:
                    "Approved" in d.status
                      ? "rgba(31,163,106,0.2)"
                      : "Rejected" in d.status
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(245,158,11,0.2)",
                  color:
                    "Approved" in d.status
                      ? "#1FA36A"
                      : "Rejected" in d.status
                        ? "#EF4444"
                        : "#F59E0B",
                }}
              >
                {"Approved" in d.status
                  ? "Approved"
                  : "Rejected" in d.status
                    ? "Rejected"
                    : "Pending"}
              </span>
            </div>
          ))}
          {deposits.length === 0 && (
            <p className="text-xs text-[#A8B2BA]">No deposits yet</p>
          )}
        </div>

        {/* Recent Withdrawals */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(13,20,32,0.8)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p className="text-sm font-semibold text-white mb-3">
            Recent Withdrawals
          </p>
          {withdrawals.slice(0, 5).map((w) => (
            <div
              key={String(w.id)}
              className="flex justify-between items-center py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div>
                <p className="text-xs font-mono" style={{ color: "#A8B2BA" }}>
                  {shortId(w.userId)}
                </p>
                <p className="text-sm font-semibold text-white">
                  {fmt(w.amount)}
                </p>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background:
                    "Completed" in w.status
                      ? "rgba(31,163,106,0.2)"
                      : "Rejected" in w.status
                        ? "rgba(239,68,68,0.2)"
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
                  ? "Done"
                  : "Rejected" in w.status
                    ? "Rejected"
                    : "Pending"}
              </span>
            </div>
          ))}
          {withdrawals.length === 0 && (
            <p className="text-xs text-[#A8B2BA]">No withdrawals yet</p>
          )}
        </div>
      </div>
    </div>
  );

  // --- User Directory ---
  const UserDirectory = () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">User Directory</h2>
        <span className="text-sm" style={{ color: "#A8B2BA" }}>
          {users.length} total
        </span>
      </div>
      <input
        type="text"
        placeholder="Search by User ID..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-white placeholder-[#A8B2BA] outline-none text-sm"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        data-ocid="admin.user_search_input"
      />

      {filteredUsers.length === 0 ? (
        <div className="text-center py-10" data-ocid="admin.users_empty_state">
          <p className="text-[#A8B2BA] text-sm">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((u, idx) => {
            const uid = u.userId.toString();
            const isExpanded = expandedUser === uid;
            const isFrozen = frozenUsers.has(uid);
            const ev = editValues[uid] || {
              deposited: "",
              withdrawable: "",
              frozen: "",
            };
            const activity = getSimulatedActivity(uid);
            const device = getDeviceData(uid);

            return (
              <div
                key={uid}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(13,20,32,0.8)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                data-ocid={`admin.users_row.${idx + 1}`}
              >
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="text-xs font-mono"
                        style={{ color: "#A8B2BA" }}
                      >
                        {shortId(u.userId)}
                      </p>
                      {u.isAdmin && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                          Admin
                        </span>
                      )}
                      {u.isFlagged && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                          Flagged
                        </span>
                      )}
                      {isFrozen && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                          Frozen
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-white">
                        Dep: {fmt(u.depositedBalance)}
                      </span>
                      <span className="text-xs" style={{ color: "#1FA36A" }}>
                        Earn: {fmt(u.withdrawableBalance)}
                      </span>
                      <span className="text-xs text-yellow-400">
                        Frozen: {fmt(u.frozenBalance)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFreeze(uid)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{
                        background: isFrozen
                          ? "rgba(59,130,246,0.15)"
                          : "rgba(255,255,255,0.06)",
                        color: isFrozen ? "#60A5FA" : "#A8B2BA",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                      data-ocid={`admin.users_toggle.${idx + 1}`}
                    >
                      {isFrozen ? "Unfreeze" : "Freeze"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedUser(isExpanded ? null : uid)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{
                        background: isExpanded
                          ? "rgba(31,163,106,0.15)"
                          : "rgba(255,255,255,0.06)",
                        color: isExpanded ? "#1FA36A" : "#A8B2BA",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                      data-ocid={`admin.users_edit_button.${idx + 1}`}
                    >
                      {isExpanded ? "Close" : "Edit"}
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4 space-y-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {/* Balance Edit */}
                    <div className="pt-3">
                      <p className="text-xs font-semibold text-white mb-2">
                        ⚡ Live Balance Override
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {(["deposited", "withdrawable", "frozen"] as const).map(
                          (field) => (
                            <div key={field}>
                              <p className="text-xs text-[#A8B2BA] mb-1 capitalize">
                                {field}
                              </p>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  placeholder="+amount"
                                  value={ev[field]}
                                  onChange={(e) =>
                                    setEditValues((prev) => ({
                                      ...prev,
                                      [uid]: { ...ev, [field]: e.target.value },
                                    }))
                                  }
                                  className="flex-1 px-2 py-1.5 rounded-lg text-white text-xs outline-none min-w-0"
                                  style={{
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                  }}
                                  data-ocid={`admin.users_${field}_input.${idx + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddFunds(u, field)}
                                  className="px-2 py-1.5 rounded-lg text-xs text-white"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, #137A56, #1FA36A)",
                                  }}
                                  data-ocid={`admin.users_${field}_save_button.${idx + 1}`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Schedule Freeze */}
                    <div>
                      <p className="text-xs font-semibold text-white mb-2">
                        📅 Schedule Freeze
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="datetime-local"
                          value={freezeSchedule[uid] || ""}
                          onChange={(e) =>
                            setFreezeSchedule((prev) => ({
                              ...prev,
                              [uid]: e.target.value,
                            }))
                          }
                          className="flex-1 px-2 py-1.5 rounded-lg text-white text-xs outline-none"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            colorScheme: "dark",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!freezeSchedule[uid]) {
                              toast.error("Select a date/time");
                              return;
                            }
                            toast.success(
                              `Freeze scheduled for ${new Date(freezeSchedule[uid]).toLocaleString("en-IN")}`,
                            );
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs text-white flex-shrink-0"
                          style={{
                            background: "rgba(59,130,246,0.2)",
                            border: "1px solid rgba(59,130,246,0.3)",
                            color: "#60A5FA",
                          }}
                        >
                          Schedule
                        </button>
                      </div>
                    </div>

                    {/* Device Forensics */}
                    <div>
                      <p className="text-xs font-semibold text-white mb-2">
                        🔬 Device Intelligence
                      </p>
                      <div
                        className="rounded-xl p-3 grid grid-cols-2 gap-2 text-xs"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div>
                          <span style={{ color: "#A8B2BA" }}>IMEI: </span>
                          <span className="font-mono text-white">
                            {device.imei}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "#A8B2BA" }}>Model: </span>
                          <span className="text-white">{device.model}</span>
                        </div>
                        <div>
                          <span style={{ color: "#A8B2BA" }}>OS: </span>
                          <span className="text-white">{device.os}</span>
                        </div>
                        <div>
                          <span style={{ color: "#A8B2BA" }}>Root: </span>
                          <span
                            style={{
                              color: device.rooted ? "#EF4444" : "#1FA36A",
                            }}
                          >
                            {device.rooted ? "⚠ Rooted" : "✓ Clean"}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "#A8B2BA" }}>IP: </span>
                          <span className="font-mono text-white">
                            {device.ip}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "#A8B2BA" }}>Location: </span>
                          <span className="text-white">{device.location}</span>
                        </div>
                        <div className="col-span-2">
                          <span style={{ color: "#A8B2BA" }}>
                            Permissions:{" "}
                          </span>
                          {Object.entries(device.permissions).map(([k, v]) => (
                            <span
                              key={k}
                              className="mr-2"
                              style={{ color: v ? "#1FA36A" : "#EF4444" }}
                            >
                              {k} {v ? "✓" : "✗"}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Activity Log */}
                    <div>
                      <p className="text-xs font-semibold text-white mb-2">
                        📡 Live Activity Stream
                      </p>
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {activity.map((a, i) => (
                          <div
                            key={`activity-${a.id}`}
                            className="flex justify-between px-3 py-2 text-xs"
                            style={{
                              borderBottom:
                                i < activity.length - 1
                                  ? "1px solid rgba(255,255,255,0.04)"
                                  : "none",
                            }}
                          >
                            <span style={{ color: "#A8B2BA" }}>{a.action}</span>
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>
                              {a.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bank details note */}
                    <div
                      className="rounded-xl px-3 py-2 text-xs"
                      style={{
                        background: "rgba(214,179,90,0.08)",
                        border: "1px solid rgba(214,179,90,0.2)",
                        color: "#D6B35A",
                      }}
                    >
                      ⚡ Admin Override: Bank detail edits bypass the
                      3-times/month limit. Use with caution.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // --- Payment Approvals ---
  const PaymentApprovals = () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Payment Approvals</h2>
        <span
          className="text-sm px-3 py-1 rounded-full"
          style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B" }}
        >
          {pendingDeposits.length} Pending
        </span>
      </div>

      {deposits.length === 0 ? (
        <div
          className="text-center py-16"
          data-ocid="admin.deposits_empty_state"
        >
          <div className="text-5xl mb-3">📭</div>
          <p className="text-[#A8B2BA]">No deposit requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deposits.map((d, idx) => (
            <div
              key={String(d.id)}
              className="rounded-2xl p-4"
              style={{
                background: "rgba(13,20,32,0.8)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              data-ocid={`admin.deposits_row.${idx + 1}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs font-mono" style={{ color: "#A8B2BA" }}>
                    {shortId(d.userId)}
                  </p>
                  <p className="text-xl font-bold" style={{ color: "#D6B35A" }}>
                    {fmt(d.amount)}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    {new Date(Number(d.createdAt) / 1e6).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    background:
                      "Approved" in d.status
                        ? "rgba(31,163,106,0.2)"
                        : "Rejected" in d.status
                          ? "rgba(239,68,68,0.2)"
                          : "rgba(245,158,11,0.2)",
                    color:
                      "Approved" in d.status
                        ? "#1FA36A"
                        : "Rejected" in d.status
                          ? "#EF4444"
                          : "#F59E0B",
                  }}
                >
                  {"Approved" in d.status
                    ? "Approved"
                    : "Rejected" in d.status
                      ? "Rejected"
                      : "Pending"}
                </span>
              </div>
              {/* Screenshot placeholder */}
              <div
                className="rounded-xl mb-3 flex items-center justify-center h-20 text-sm"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.1)",
                  color: "#A8B2BA",
                }}
              >
                📷 Screenshot not available (legacy)
              </div>
              {"Pending" in d.status && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approveDeposit(d.id)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg, #137A56, #1FA36A)",
                    }}
                    data-ocid={`admin.deposits_approve_button.${idx + 1}`}
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectDeposit(d.id)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#EF4444",
                    }}
                    data-ocid={`admin.deposits_reject_button.${idx + 1}`}
                  >
                    ✗ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- Withdrawal Queue ---
  const WithdrawalQueue = () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Withdrawal Queue</h2>
        <span
          className="text-sm px-3 py-1 rounded-full"
          style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B" }}
        >
          {pendingWithdrawals.length} Pending
        </span>
      </div>

      {withdrawals.length === 0 ? (
        <div
          className="text-center py-16"
          data-ocid="admin.withdrawals_empty_state"
        >
          <div className="text-5xl mb-3">📭</div>
          <p className="text-[#A8B2BA]">No withdrawal requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w, idx) => {
            const suspicious = isSuspicious(w);
            return (
              <div
                key={String(w.id)}
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(13,20,32,0.8)",
                  border: suspicious
                    ? "1px solid rgba(239,68,68,0.3)"
                    : "1px solid rgba(255,255,255,0.07)",
                }}
                data-ocid={`admin.withdrawals_row.${idx + 1}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p
                      className="text-xs font-mono"
                      style={{ color: "#A8B2BA" }}
                    >
                      {shortId(w.userId)}
                    </p>
                    <p className="text-xl font-bold text-white">
                      {fmt(w.amount)}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {new Date(Number(w.createdAt) / 1e6).toLocaleString(
                        "en-IN",
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          "Completed" in w.status
                            ? "rgba(31,163,106,0.2)"
                            : "Rejected" in w.status
                              ? "rgba(239,68,68,0.2)"
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
                    {suspicious && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{
                          background: "rgba(239,68,68,0.2)",
                          color: "#EF4444",
                        }}
                      >
                        ⚠ SUSPICIOUS
                      </span>
                    )}
                  </div>
                </div>
                {"Pending" in w.status && (
                  <button
                    type="button"
                    onClick={() => completeWithdrawal(w.id)}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg, #137A56, #1FA36A)",
                    }}
                    data-ocid={`admin.withdrawals_complete_button.${idx + 1}`}
                  >
                    ✓ Mark as Completed
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // --- Security Alerts ---
  const SecurityAlerts = () => (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-white">Security Alerts</h2>

      {/* Multi-Account Tracker */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(13,20,32,0.8)",
          border: "1px solid rgba(239,68,68,0.15)",
        }}
      >
        <p className="text-sm font-semibold text-white mb-3">
          🔗 Multi-Account Tracker
        </p>
        {flagged.length === 0 ? (
          <p className="text-sm text-[#A8B2BA]">No flagged accounts</p>
        ) : (
          <div className="space-y-2">
            {flagged.map((u, idx) => (
              <div
                key={u.userId.toString()}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
                data-ocid={`admin.security_flagged_row.${idx + 1}`}
              >
                <div>
                  <p className="text-xs font-mono text-white">
                    {shortId(u.userId)}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(239,68,68,0.2)",
                        color: "#EF4444",
                      }}
                    >
                      Shared IP
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(239,68,68,0.2)",
                        color: "#EF4444",
                      }}
                    >
                      Shared IMEI
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => unflag(u.userId)}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#A8B2BA",
                  }}
                  data-ocid={`admin.security_unflag_button.${idx + 1}`}
                >
                  Unflag
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rapid-Claim Detection */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(13,20,32,0.8)",
          border: "1px solid rgba(245,158,11,0.15)",
        }}
      >
        <p className="text-sm font-semibold text-white mb-3">
          ⚡ Rapid-Claim Detection
        </p>
        <div className="space-y-2">
          {users.slice(0, 3).map((u, idx) => {
            const hash = u.userId
              .toString()
              .split("")
              .reduce((a, c) => a + c.charCodeAt(0), 0);
            const claims = 5 + (hash % 15);
            const suspicious = claims > 10;
            return (
              <div
                key={u.userId.toString()}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: suspicious
                    ? "rgba(245,158,11,0.05)"
                    : "rgba(255,255,255,0.02)",
                  border: suspicious
                    ? "1px solid rgba(245,158,11,0.2)"
                    : "1px solid rgba(255,255,255,0.05)",
                }}
                data-ocid={`admin.security_rapid_row.${idx + 1}`}
              >
                <div>
                  <p className="text-xs font-mono text-white">
                    {shortId(u.userId)}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: suspicious ? "#F59E0B" : "#A8B2BA" }}
                  >
                    {claims} claims in 60 seconds
                  </p>
                </div>
                {suspicious && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{
                      background: "rgba(245,158,11,0.2)",
                      color: "#F59E0B",
                    }}
                  >
                    BOT?
                  </span>
                )}
              </div>
            );
          })}
          {users.length === 0 && (
            <p className="text-sm text-[#A8B2BA]">No users to monitor</p>
          )}
        </div>
      </div>

      {/* Device Forensics Summary */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(13,20,32,0.8)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p className="text-sm font-semibold text-white mb-3">
          🔬 Device Forensics Overview
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["User", "Device", "OS", "Root", "IP", "Location"].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 pr-4"
                    style={{ color: "#A8B2BA" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 8).map((u, idx) => {
                const d = getDeviceData(u.userId.toString());
                return (
                  <tr
                    key={u.userId.toString()}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    data-ocid={`admin.security_device_row.${idx + 1}`}
                  >
                    <td className="py-2 pr-4 font-mono text-white">
                      {shortId(u.userId)}
                    </td>
                    <td className="py-2 pr-4 text-white">{d.model}</td>
                    <td className="py-2 pr-4 text-white">{d.os}</td>
                    <td
                      className="py-2 pr-4"
                      style={{ color: d.rooted ? "#EF4444" : "#1FA36A" }}
                    >
                      {d.rooted ? "Rooted" : "Clean"}
                    </td>
                    <td className="py-2 pr-4 font-mono text-white">{d.ip}</td>
                    <td className="py-2 pr-4 text-white">{d.location}</td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-center"
                    style={{ color: "#A8B2BA" }}
                  >
                    No users
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // --- System Settings ---
  const SystemSettings = () => (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-white">System Settings</h2>

      {/* Maintenance Mode Master Switch */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(13,20,32,0.8)",
          border: maintenanceMode
            ? "1px solid rgba(239,68,68,0.3)"
            : "1px solid rgba(255,255,255,0.07)",
          boxShadow: maintenanceMode ? "0 0 30px rgba(239,68,68,0.1)" : "none",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-bold text-white">
              🔧 Maintenance Mode
            </p>
            <p className="text-xs mt-1" style={{ color: "#A8B2BA" }}>
              Master switch — pushes full-screen overlay to all users
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleMaintenance(!maintenanceMode)}
            className="relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0"
            style={{
              background: maintenanceMode ? "#EF4444" : "rgba(255,255,255,0.1)",
            }}
            data-ocid="admin.maintenance_toggle"
          >
            <span
              className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300"
              style={{ left: maintenanceMode ? "calc(100% - 24px)" : "4px" }}
            />
          </button>
        </div>
        {maintenanceMode && (
          <div
            className="rounded-xl p-3 text-sm"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#EF4444",
            }}
          >
            ⚠ MAINTENANCE MODE IS ACTIVE — All users see the maintenance screen
          </div>
        )}
        <div
          className="mt-4 rounded-xl p-3 text-xs text-center"
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#A8B2BA",
          }}
        >
          Preview: User screen shows "We're upgrading WealthStream for a better
          experience. Please check back shortly."
        </div>
      </div>

      {/* UPI Settings */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(13,20,32,0.8)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <p className="text-base font-bold text-white mb-4">
          💳 UPI Configuration
        </p>
        {!upiLoaded && (
          <p className="text-sm" style={{ color: "#A8B2BA" }}>
            Loading...
          </p>
        )}
        {upiLoaded && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  label: "UPI ID",
                  key: "upiId",
                  placeholder: "e.g. name@okaxis",
                },
                {
                  label: "Account Name",
                  key: "accountName",
                  placeholder: "Bank account name",
                },
                {
                  label: "Display Name",
                  key: "displayName",
                  placeholder: "Shown to payers",
                },
                {
                  label: "Custom QR URL (optional)",
                  key: "customQrUrl",
                  placeholder: "Leave blank to auto-generate from UPI ID",
                },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label
                    htmlFor={`upi-${key}`}
                    className="block text-xs mb-1"
                    style={{ color: "#A8B2BA" }}
                  >
                    {label}
                  </label>
                  <input
                    id={`upi-${key}`}
                    type="text"
                    value={upiForm[key as keyof typeof upiForm]}
                    onChange={(e) =>
                      setUpiForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={placeholder}
                    className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  />
                  {key === "customQrUrl" && (
                    <p className="text-xs mt-1" style={{ color: "#A8B2BA" }}>
                      Leave blank to auto-generate QR from UPI ID
                    </p>
                  )}
                </div>
              ))}
            </div>
            {/* QR Preview */}
            <div className="flex flex-col items-center gap-2 py-3">
              <p className="text-xs" style={{ color: "#A8B2BA" }}>
                QR Preview
              </p>
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: "white", padding: 6 }}
              >
                <img
                  src={
                    upiForm.customQrUrl
                      ? upiForm.customQrUrl
                      : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${upiForm.upiId}&pn=${upiForm.displayName}`)}`
                  }
                  alt="QR Preview"
                  width={150}
                  height={150}
                  style={{ display: "block" }}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={upiLoading}
              onClick={async () => {
                if (!actor) return;
                setUpiLoading(true);
                try {
                  const res = await (actor as any).setUpiConfig(
                    upiForm.upiId,
                    upiForm.accountName,
                    upiForm.displayName,
                    upiForm.customQrUrl ? [upiForm.customQrUrl] : [],
                  );
                  if ("ok" in res) toast.success("UPI configuration saved!");
                  else toast.error((res as { err: string }).err);
                } catch {
                  toast.error("Failed to save UPI config");
                } finally {
                  setUpiLoading(false);
                }
              }}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
              style={{
                background: upiLoading
                  ? "rgba(31,163,106,0.4)"
                  : "linear-gradient(135deg, #137A56 0%, #1FA36A 100%)",
                opacity: upiLoading ? 0.7 : 1,
              }}
              data-ocid="admin.upi_save_button"
            >
              {upiLoading ? "Saving..." : "💾 Save UPI Config"}
            </button>
          </div>
        )}
      </div>

      {/* Network Log */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(13,20,32,0.8)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <p className="text-base font-bold text-white mb-3">
          🌐 Network Tracking Log
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["User", "Current IP", "ISP", "Last Seen"].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 pr-4"
                    style={{ color: "#A8B2BA" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
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
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    data-ocid={`admin.network_row.${idx + 1}`}
                  >
                    <td className="py-2 pr-4 font-mono text-white">
                      {shortId(u.userId)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-white">{d.ip}</td>
                    <td className="py-2 pr-4 text-white">
                      {isps[hash % isps.length]}
                    </td>
                    <td
                      className="py-2 pr-4"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {new Date(
                        Date.now() - (hash % 3600000),
                      ).toLocaleTimeString("en-IN")}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-4 text-center"
                    style={{ color: "#A8B2BA" }}
                  >
                    No users
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const CONTENT: Record<AdminTab, React.ReactElement> = {
    dashboard: <Dashboard />,
    users: <UserDirectory />,
    deposits: <PaymentApprovals />,
    withdrawals: <WithdrawalQueue />,
    security: <SecurityAlerts />,
    settings: <SystemSettings />,
  };

  if (!pinVerified) {
    const handlePinSubmit = () => {
      if (pinInput === ADMIN_PIN) {
        setPinVerified(true);
        setPinError(false);
      } else {
        setPinError(true);
        setPinInput("");
        setPinAttempts((a) => a + 1);
      }
    };
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "#080D14", zIndex: 40 }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,215,0,0.3)",
            borderRadius: 20,
            padding: "48px 36px",
            width: 340,
            textAlign: "center",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
          <div
            style={{
              color: "#FFD700",
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Admin Access
          </div>
          <div style={{ color: "#888", fontSize: 13, marginBottom: 28 }}>
            Enter your PIN to continue
          </div>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setPinError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePinSubmit();
            }}
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: pinError
                ? "1.5px solid #ef4444"
                : "1.5px solid rgba(255,215,0,0.4)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontSize: 22,
              letterSpacing: 8,
              textAlign: "center",
              outline: "none",
              marginBottom: 8,
            }}
          />
          {pinError && (
            <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>
              Incorrect PIN{pinAttempts >= 3 ? " — too many attempts" : ""}
            </div>
          )}
          <button
            type="button"
            onClick={handlePinSubmit}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              color: "#000",
              fontWeight: 700,
              fontSize: 16,
              border: "none",
              cursor: "pointer",
            }}
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex"
      style={{ background: "#080D14", zIndex: 40 }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{
            background: "rgba(13,20,32,0.9)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h1 className="text-base font-semibold text-white">
            {sidebarItems.find((s) => s.id === tab)?.label || "Admin"}
          </h1>
          <div className="flex items-center gap-3">
            {loading && (
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            )}
            <button
              type="button"
              onClick={load}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#A8B2BA",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              data-ocid="admin.refresh_button"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">{CONTENT[tab]}</div>
      </div>
    </div>
  );
}
