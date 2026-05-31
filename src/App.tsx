import React, { useState, useEffect } from "react";
import SplashScreen from "./components/SplashScreen";
import OnboardingScreen from "./components/OnboardingScreen";
import AuthScreen from "./components/AuthScreen";
import MainChat from "./components/MainChat";
import { UserProfile, UserPreferences } from "./types";

export default function App() {
  const [phase, setPhase] = useState<"splash" | "onboarding" | "auth" | "chat">("splash");
  const [sessionUser, setSessionUser] = useState<UserProfile | null>(null);
  
  // Storing intermediate selections if onboarding completes before auth
  const [onboardedFields, setOnboardedFields] = useState<string[]>([]);
  const [onboardedLanguage, setOnboardedLanguage] = useState("English");
  const [syncLoading, setSyncLoading] = useState(true);

  useEffect(() => {
    // Attempt automatic session recovery if user chose 'Remember Me'
    const recoveredUserId = localStorage.getItem("hayat_user_id");
    if (recoveredUserId) {
      recoverSession(recoveredUserId);
    } else {
      setSyncLoading(false);
    }
  }, []);

  const recoverSession = async (userId: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${userId}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessionUser(data.user);
        setPhase("chat");
      } else {
        localStorage.removeItem("hayat_user_id");
      }
    } catch (err) {
      console.error("Recover session failed:", err);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSplashComplete = () => {
    // If we've successfully recovered a session during the splash screen, go straight to chat
    if (sessionUser) {
      setPhase("chat");
    } else {
      setPhase("onboarding");
    }
  };

  const handleOnboardingComplete = (fields: string[], language: string) => {
    setOnboardedFields(fields);
    setOnboardedLanguage(language);
    setPhase("auth");
  };

  const handleAuthComplete = (user: UserProfile) => {
    setSessionUser(user);
    setPhase("chat");
  };

  const handleLogout = () => {
    localStorage.removeItem("hayat_user_id");
    setSessionUser(null);
    setPhase("auth");
  };

  const handleUpdatePreferences = (updatedPref: UserPreferences) => {
    if (sessionUser) {
      setSessionUser({
        ...sessionUser,
        preferences: updatedPref
      });
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 selection:bg-sky-500/20 selection:text-sky-300">
      {phase === "splash" && <SplashScreen onComplete={handleSplashComplete} />}
      
      {phase === "onboarding" && !syncLoading && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      
      {phase === "auth" && !syncLoading && (
        <AuthScreen
          initialFields={onboardedFields.length > 0 ? onboardedFields : ["Computer Science & Programming"]}
          initialLanguage={onboardedLanguage}
          onAuthComplete={handleAuthComplete}
        />
      )}
      
      {phase === "chat" && sessionUser && (
        <MainChat
          user={sessionUser}
          onLogout={handleLogout}
          onUpdatePreferences={handleUpdatePreferences}
        />
      )}
    </div>
  );
}
