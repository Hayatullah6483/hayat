import React, { useState } from "react";
import { Sparkles, Mail, Lock, User, LogIn, UserPlus, Info, CheckCircle2 } from "lucide-react";
import { UserProfile, UserPreferences } from "../types";

interface AuthScreenProps {
  initialFields: string[];
  initialLanguage: string;
  onAuthComplete: (user: UserProfile) => void;
}

export default function AuthScreen({ initialFields, initialLanguage, onAuthComplete }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError("Please fill in all required credentials.");
      return;
    }

    if (!isLogin && !fullName) {
      setError("Full Name is required for registration.");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Password correlation error: passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const payload = isLogin
        ? { email, password }
        : {
            fullName,
            email,
            password,
            preferences: {
              languages: [initialLanguage],
              professions: initialFields,
              theme: "dark" as const,
              responseStyle: "balanced" as const,
              voiceResponses: false,
              notificationsEnabled: true,
              privacyMode: false,
            },
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication procedure failed.");
      }

      if (isLogin) {
        // Handle Remember Me logic by storing user ID in localStorage safely
        if (rememberMe) {
          localStorage.setItem("hayat_user_id", data.user.id);
        }
        onAuthComplete(data.user);
      } else {
        setSuccessMsg("Account successfully provisioned! Redirecting to login...");
        setTimeout(() => {
          setIsLogin(true);
          setSuccessMsg(null);
          setPassword("");
          setConfirmPassword("");
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected system transition occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleThirdPartySignIn = (provider: string) => {
    setError(`Instant ${provider} sign-in simulation executed. Setting up local session...`);
    setTimeout(() => {
      setError(null);
      // Automatically construct a localized profile for convenient sandbox authentication
      const demoUser: UserProfile = {
        id: "usr_sandbox",
        fullName: fullName || "Noble Guest",
        email: email || "guest@hayat.ai",
        preferences: {
          languages: [initialLanguage],
          professions: initialFields,
          theme: "dark",
          responseStyle: "balanced",
          voiceResponses: false,
          notificationsEnabled: true,
          privacyMode: false,
        },
        createdAt: new Date().toISOString(),
      };
      onAuthComplete(demoUser);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 smooth-fade-in">
        {/* Brand Identity / Small Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-4">
            <Sparkles className="w-7 h-7 text-sky-400" />
          </div>
          <h1 className="font-display text-4xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-2 text-xs text-slate-400 font-mono tracking-wider uppercase">
            Hayat AI • Adaptive Field Knowledge
          </p>
        </div>

        {/* Auth Panel */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex gap-2 items-start">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2 items-start">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 animate-bounce" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 z-10 text-slate-500" />
                  <input
                    id="inp-fullname"
                    type="text"
                    required
                    placeholder="e.g. Dr. Ahmad Khan Swati"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-sky-500 text-slate-200 text-sm outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 z-10 text-slate-500" />
                <input
                  id="inp-email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-sky-500 text-slate-200 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400 block">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setError("Password recovery link simulated to your inbox.")}
                    className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 z-10 text-slate-500" />
                <input
                  id="inp-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-sky-500 text-slate-200 text-sm outline-none transition-all"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 z-10 text-slate-500" />
                  <input
                    id="inp-confirm"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-sky-500 text-slate-200 text-sm outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="chk-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-800 text-sky-400 bg-slate-950 cursor-pointer accent-sky-500"
                />
                <label htmlFor="chk-remember" className="text-xs text-slate-400 select-none cursor-pointer">
                  Remember my credentials during this session
                </label>
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 font-semibold text-sm transition-all shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Profile
                </>
              )}
            </button>
          </form>

          {/* Social Logins */}
          <div className="mt-6">
            <div className="relative flex items-center justify-center mb-4">
              <div className="absolute inset-0 border-y border-slate-800 border-t" />
              <span className="relative z-10 bg-slate-900 px-3 text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                Secure Integrations
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-google-auth"
                type="button"
                onClick={() => handleThirdPartySignIn("Google")}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-950 text-xs transition-all text-slate-300 font-medium cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.17-.11-.3-.21-.35-.29z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google Sign-In
              </button>
              <button
                id="btn-apple-auth"
                type="button"
                onClick={() => handleThirdPartySignIn("Apple")}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-950 text-xs transition-all text-slate-300 font-medium cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.2 2c.5 0 1 .1 1.5.3-.2.8-.7 1.4-1.3 1.9-.6.4-1.3.6-1.9.5 0-.8.4-1.5.9-2 .5-.5 1.1-.7 1.8-.7zm2.4 3c.7.4 1.2 1 1.5 1.8-.8.5-1.3 1.1-1.5 2-.2.8-.1 1.6.4 2.2.4.6 1 1 1.8 1.1-.4 1.1-1 2-1.8 2.8-.8.8-1.6 1.2-2.4 1.2-.6 0-1.1-.1-1.6-.4-.5-.3-1-.4-1.5-.4-.5 0-1 .1-1.5.4-.5.3-1 .4-1.6.4-.8 0-1.7-.4-2.4-1.2C3.1 14 2 11.8 2 9.5c0-1.9.5-3.3 1.6-4.2C4.6 4.4 5.7 4 6.8 4c.6 0 1.2.1 1.7.4.5.3 1 .4 1.4.4s.9-.1 1.4-.4c.7-.3 1.3-.4 1.9-.4 1.1 0 2.1.4 2.9 1.1z"/>
                </svg>
                Apple Sign-In
              </button>
            </div>
          </div>
        </div>

        {/* Auth Mode Toggle */}
        <p className="mt-6 text-center text-sm text-slate-500">
          {isLogin ? "New to Hayat AI? " : "Already configured an account? "}
          <button
            id="btn-toggle-auth-mode"
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-sky-400 font-semibold hover:underline cursor-pointer"
          >
            {isLogin ? "Create Profile" : "Login Now"}
          </button>
        </p>

        {/* Footer info banner */}
        <p className="mt-8 text-center text-[11px] text-slate-600 line-clamp-2">
          Your field preferences ({initialLanguage} & {initialFields.join(", ")}) will auto-link to this profile.
        </p>
      </div>
    </div>
  );
}
