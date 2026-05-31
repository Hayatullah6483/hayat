import React, { useState } from "react";
import { 
  Building, 
  Stethoscope, 
  Wrench, 
  Code, 
  Briefcase, 
  GraduationCap, 
  Scale, 
  Megaphone, 
  Palette, 
  FlaskConical, 
  Compass, 
  Globe, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { AVAILABLE_PROFESSIONS, COMMONLY_USED_LANGUAGES } from "../types";
import { motion } from "motion/react";

interface OnboardingScreenProps {
  onComplete: (fields: string[], language: string) => void;
}

// Map profession to pristine custom icon styling
function getProfessionIcon(prof: string) {
  const size = "w-6 h-6";
  switch (prof) {
    case "Medical & Healthcare":
      return <Stethoscope className={`${size} text-rose-400`} />;
    case "Engineering":
      return <Wrench className={`${size} text-amber-400`} />;
    case "Computer Science & Programming":
      return <Code className={`${size} text-sky-400`} />;
    case "Business & Finance":
      return <Briefcase className={`${size} text-emerald-400`} />;
    case "Education & Teaching":
      return <GraduationCap className={`${size} text-violet-400`} />;
    case "Law":
      return <Scale className={`${size} text-indigo-400`} />;
    case "Marketing":
      return <Megaphone className={`${size} text-orange-400`} />;
    case "Design & Creative Arts":
      return <Palette className={`${size} text-fuchsia-400`} />;
    case "Research & Science":
      return <FlaskConical className={`${size} text-teal-400`} />;
    default:
      return <Building className={`${size} text-slate-400`} />;
  }
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [step, setStep] = useState<"fields" | "language">("fields");

  const handleFieldToggle = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleNext = () => {
    if (step === "fields") {
      if (selectedFields.length === 0) {
        // Automatically default if none selected
        setSelectedFields(["Computer Science & Programming"]);
      }
      setStep("language");
    } else {
      onComplete(selectedFields, selectedLanguage);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-sky-500/10 to-transparent rounded-full blur-3xl -mr-64 -mt-32" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-t from-blue-500/5 to-transparent rounded-full blur-3xl -ml-64 -mb-32" />

      {/* Header section with branding */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
            <Sparkles className="w-5 h-5 text-sky-400" />
          </div>
          <span className="font-display font-black text-xl tracking-wider uppercase bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
            Hayat AI
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Step {step === "fields" ? "1" : "2"} of 2
        </div>
      </header>

      {/* Main configuration grid */}
      <main className="relative z-10 max-w-4xl mx-auto w-full my-auto flex flex-col items-center">
        {step === "fields" ? (
          <div className="w-full smooth-fade-in flex flex-col items-center">
            <span className="text-xs font-mono text-sky-400 tracking-widest uppercase font-semibold mb-3">
              Adaptive Intelligence Strategy
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-center max-w-2xl leading-tight">
              Select Your Area of Activity / Expert Fields
            </h2>
            <p className="mt-4 text-sm md:text-base text-slate-400 text-center max-w-xl">
              Hayat AI adapts its analytical model, tone, formulas, and visual answers based on your selected fields. Choose all that apply.
            </p>

            {/* Profession Grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-10 w-full max-w-3xl">
              {AVAILABLE_PROFESSIONS.map((prof) => {
                const isSelected = selectedFields.includes(prof);
                return (
                  <button
                    key={prof}
                    onClick={() => handleFieldToggle(prof)}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl text-left border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-sky-500/10 border-sky-500 shadow-md shadow-sky-500/5"
                        : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${isSelected ? "bg-sky-500/20" : "bg-slate-950"}`}>
                      {getProfessionIcon(prof)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">
                        {prof}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {prof === "Computer Science & Programming" ? "Algorithms & code" : prof === "Medical & Healthcare" ? "Healthcare precision" : "Custom rules"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-full smooth-fade-in flex flex-col items-center">
            <span className="text-xs font-mono text-sky-400 tracking-widest uppercase font-semibold mb-3">
              Global Multi-language System
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-center max-w-2xl leading-tight">
              Select Preferred Language
            </h2>
            <p className="mt-4 text-sm md:text-base text-slate-400 text-center max-w-xl">
              Hayat AI automatically responds with semantic structure and grammatical tones aligned to your selection.
            </p>

            {/* Language Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-10 w-full max-w-3xl">
              {COMMONLY_USED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang;
                return (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`p-4 rounded-xl text-center border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-sky-500/15 border-sky-400 text-white font-semibold"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <Globe className={`w-4 h-4 mx-auto mb-2 transition-colors ${isSelected ? "text-sky-400" : "text-slate-500"}`} />
                    <span className="text-sm">{lang}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Note section */}
        <div className="mt-10 px-4 py-2.5 rounded-full bg-slate-900/80 border border-slate-800/80 text-center text-xs md:text-sm text-slate-400">
          💡 <span className="font-semibold text-slate-300">Note:</span> You can change your field and language anytime from Settings.
        </div>
      </main>

      {/* Navigation action buttons */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-900 pt-6 gap-4">
        <div className="text-xs text-slate-500">
          {step === "fields" ? "Choose one or multiple fields to proceed." : "Select your primary output language."}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {step === "language" && (
            <button
              onClick={() => setStep("fields")}
              className="w-1/2 sm:w-auto px-6 py-3 rounded-xl hover:bg-slate-900 border border-slate-800 font-medium text-sm text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 font-semibold text-sm shadow-lg shadow-sky-500/10 cursor-pointer transition-all"
          >
            {step === "fields" ? "Configure Language" : "Get Started"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
