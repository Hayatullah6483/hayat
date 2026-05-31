import React, { useEffect, useState } from "react";
import { Sparkles, BrainCircuit } from "lucide-react";
import { motion } from "motion/react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    // Elegant dot animation
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 450);

    // Timeout to proceed
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white select-none overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />

      <div className="relative flex flex-col items-center max-w-sm px-6 text-center">
        {/* Core Logo Icon with Motion */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative mb-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl shadow-sky-500/5 group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 to-blue-600/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <BrainCircuit className="w-16 h-16 text-sky-400 relative z-10" />
          <div className="absolute -top-1 -right-1 p-1.5 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-500 text-slate-950 shadow">
            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: "6s" }} />
          </div>
        </motion.div>

        {/* Brand Name */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="font-display text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent"
        >
          Hayat AI
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 0.8 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-3 text-sm text-slate-400 font-medium tracking-wide leading-relaxed"
        >
          Your Personalized AI Assistant for Every Field.
        </motion.p>

        {/* Loading Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 flex flex-col items-center"
        >
          {/* Custom Sleek Progress Bar */}
          <div className="w-32 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.2, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-sky-500 to-blue-500"
            />
          </div>
          <span className="mt-3 text-xs font-mono text-slate-500 tracking-widest uppercase">
            Initializing System{dots}
          </span>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs font-mono text-slate-600 tracking-widest uppercase">
          Hayat Intelligence v3.5
        </p>
      </div>
    </div>
  );
}
