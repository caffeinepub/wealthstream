import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginScreen() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col items-center justify-center px-6">
      {/* Glow effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-white">Wealth</span>
            <span style={{ color: "#D6B35A" }}>Stream</span>
          </h1>
          <p className="text-[#A8B2BA] text-sm text-center">
            Grow Your Wealth, Every Hour
          </p>
        </div>

        {/* Features */}
        <div className="w-full space-y-3">
          {[
            { icon: "📈", text: "Up to 70% returns on investments" },
            { icon: "⏰", text: "Hourly claim rewards, every 60 minutes" },
            { icon: "🔒", text: "Secure & transparent on-chain" },
          ].map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-3 backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-3"
            >
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm text-[#A8B2BA]">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Login button */}
        <button
          type="button"
          onClick={login}
          disabled={isLoggingIn}
          className="w-full py-4 rounded-2xl font-semibold text-white text-lg transition-all"
          style={{
            background: "linear-gradient(135deg, #137A56 0%, #1FA36A 100%)",
            border: "1px solid rgba(200,169,86,0.4)",
            boxShadow: "0 0 20px rgba(31,163,106,0.3)",
          }}
        >
          {isLoggingIn ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connecting...
            </span>
          ) : (
            "Login with Internet Identity"
          )}
        </button>

        <p className="text-[#A8B2BA] text-xs text-center">
          Powered by Internet Computer Protocol
        </p>
      </div>
    </div>
  );
}
