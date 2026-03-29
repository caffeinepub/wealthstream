import type { TabName } from "../App";

interface Props {
  activeTab: TabName;
  setActiveTab: (t: TabName) => void;
  isAdmin: boolean;
}

const TABS: {
  id: TabName;
  label: string;
  icon: string;
  adminOnly?: boolean;
}[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "portfolio", label: "Portfolio", icon: "📊" },
  { id: "addfunds", label: "Add Funds", icon: "➕" },
  { id: "history", label: "History", icon: "🕐" },
  { id: "account", label: "Account", icon: "👤" },
  { id: "admin", label: "Admin", icon: "⚙️", adminOnly: true },
];

export default function BottomNav({ activeTab, setActiveTab, isAdmin }: Props) {
  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
      style={{
        height: 64,
        background: "rgba(10,15,30,0.85)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
            style={active ? { color: "#1FA36A" } : { color: "#A8B2BA" }}
            data-ocid={`nav.${tab.id}_link`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
