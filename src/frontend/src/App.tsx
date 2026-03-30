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

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor: _actor } = useActor();
  const actor = _actor as import("./actorTypes").WealthActor | null;
  const [activeTab, setActiveTab] = useState<TabName>(
    window.location.hash.includes("admin=09186114") ? "admin" : "home",
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);

  // Auto-navigate to admin tab if URL hash contains the admin PIN
  useEffect(() => {
    if (!identity || identity.getPrincipal().isAnonymous()) return;
    const hash = window.location.hash;
    if (hash.includes("admin=09186114")) {
      setActiveTab("admin");
    }
  }, [identity]);

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
      })
      .catch(() => {
        setIsAdmin(false);
      });
    actor
      .getServerTime()
      .then((t) => {
        const offset = Number(t) / 1e6 - Date.now();
        setServerOffset(offset);
      })
      .catch(() => {});
  }, [actor, identity, refreshProfile]);

  // Auto-refresh user profile every 60s so balance/status updates from admin actions
  // appear without requiring manual navigation
  useEffect(() => {
    if (!actor || !identity) return;
    const id = setInterval(() => void refreshProfile(), 60_000);
    return () => clearInterval(id);
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
    history: <PaymentHistoryPage actor={actor} />,
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
