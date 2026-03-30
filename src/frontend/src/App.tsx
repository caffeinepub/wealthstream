import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Toaster } from "sonner";
import { toast } from "sonner";
import type { UserProfile } from "./actorTypes";
import AccountPage from "./components/AccountPage";
import AddFundsPage from "./components/AddFundsPage";
import AdminPage from "./components/AdminPage";
import BottomNav from "./components/BottomNav";
import HomePage from "./components/HomePage";
import LoginScreen from "./components/LoginScreen";
import PaymentHistoryPage from "./components/PaymentHistoryPage";
import PortfolioPage from "./components/PortfolioPage";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

export type TabName =
  | "home"
  | "portfolio"
  | "addfunds"
  | "history"
  | "account"
  | "admin";

function MaintenanceOverlay() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6 z-50"
      style={{ background: "#0B1220" }}
    >
      <div
        className="text-center max-w-sm"
        style={{ animation: "fadeIn 0.5s ease" }}
      >
        <div
          className="text-7xl mb-6"
          style={{ animation: "spin 4s linear infinite" }}
        >
          🔧
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Under Maintenance
        </h1>
        <p className="text-base" style={{ color: "#A8B2BA", lineHeight: 1.6 }}>
          We're upgrading WealthStream for a better experience. Please check
          back shortly.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: "#1FA36A",
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor: _actor } = useActor();
  const actor = _actor as import("./actorTypes").WealthActor | null;
  const [activeTab, setActiveTab] = useState<TabName>(
    window.location.hash.includes("admin=09186114") ? "admin" : "home",
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminChecked, setIsAdminChecked] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);

  // Auto-navigate to admin tab if URL hash contains the admin PIN
  useEffect(() => {
    if (!identity || identity.getPrincipal().isAnonymous()) return;
    const hash = window.location.hash;
    if (hash.includes("admin=09186114")) {
      setActiveTab("admin");
    }
  }, [identity]);

  const maintenanceMode = localStorage.getItem("maintenanceMode") === "true";
  // Admin can always bypass maintenance — either via URL hash or confirmed isAdmin
  const isAdminAccess =
    activeTab === "admin" ||
    window.location.hash.includes("admin=09186114") ||
    isAdmin;

  const refreshProfile = useCallback(async () => {
    if (!actor || !identity) return;
    try {
      const p = await actor.getMyProfile();
      setProfile(p);
    } catch (e) {
      console.error(e);
    }
  }, [actor, identity]);

  useEffect(() => {
    if (!actor || !identity) return;
    refreshProfile();
    actor
      .isCallerAdmin()
      .then((v) => {
        setIsAdmin(v);
        setIsAdminChecked(true);
      })
      .catch(() => {
        setIsAdmin(false);
        setIsAdminChecked(true);
      });
    actor
      .getServerTime()
      .then((t) => {
        const offset = Number(t) / 1e6 - Date.now();
        setServerOffset(offset);
      })
      .catch(() => {});
  }, [actor, identity, refreshProfile]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!identity || identity.getPrincipal().isAnonymous()) {
    return (
      <div className="min-h-screen bg-[#0B1220]">
        <LoginScreen />
        <Toaster theme="dark" richColors />
      </div>
    );
  }

  // Only show maintenance spinner/screen for non-admin users
  if (
    !isAdminAccess &&
    maintenanceMode &&
    !isAdminChecked &&
    identity &&
    !identity.getPrincipal().isAnonymous()
  ) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdminAccess && maintenanceMode && isAdminChecked && !isAdmin) {
    return (
      <>
        <MaintenanceOverlay />
        <Toaster theme="dark" richColors />
      </>
    );
  }

  const pages: Record<TabName, ReactElement> = {
    home: (
      <HomePage
        profile={profile}
        serverOffset={serverOffset}
        actor={actor}
        onRefresh={refreshProfile}
      />
    ),
    portfolio: <PortfolioPage profile={profile} actor={actor} />,
    addfunds: <AddFundsPage actor={actor} onSuccess={refreshProfile} />,
    history: <PaymentHistoryPage />,
    account: (
      <AccountPage profile={profile} actor={actor} onRefresh={refreshProfile} />
    ),
    admin: <AdminPage actor={actor} />,
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      {activeTab === "admin" ? (
        pages[activeTab]
      ) : (
        <div className="pb-16">{pages[activeTab]}</div>
      )}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
      />
      <Toaster theme="dark" richColors />
    </div>
  );
}
