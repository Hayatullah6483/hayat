import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Pin,
  Settings,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  FileText,
  Search,
  Check,
  Edit2,
  Loader2,
  Moon,
  Sun,
  User as UserIcon,
  Globe,
  Briefcase,
  AlertTriangle,
  Menu,
  X,
  MoreVertical,
  Sliders,
  Bell,
  Eye,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { UserProfile, Conversation, Message, MessageFile, ThemeType, ResponseStyleType, AVAILABLE_PROFESSIONS, COMMONLY_USED_LANGUAGES } from "../types";

// Helper sound alerts
function playBeep(type: "start" | "stop" | "success") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "start") {
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "stop") {
      osc.frequency.setValueAtTime(330, ctx.currentTime); // E4
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.frequency.setValueAtTime(554.37, ctx.currentTime); // C#5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (err) {
    // console errors are silent
  }
}

interface MainChatProps {
  user: UserProfile;
  onLogout: () => void;
  onUpdatePreferences: (pref: any) => void;
}

export default function MainChat({ user, onLogout, onUpdatePreferences }: MainChatProps) {
  // Chat History States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Active Chat states
  const [inputMessage, setInputMessage] = useState("");
  const [attachments, setAttachments] = useState<MessageFile[]>([]);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Settings State & UI Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "ai" | "notifications" | "privacy">("general");

  // User Preferences synced state
  const [prefLang, setPrefLang] = useState<string>(user.preferences.languages[0] || "English");
  const [prefProf, setPrefProf] = useState<string>(user.preferences.professions[0] || "Computer Science & Programming");
  const [prefTheme, setPrefTheme] = useState<ThemeType>(user.preferences.theme || "dark");
  const [prefResponseStyle, setPrefResponseStyle] = useState<ResponseStyleType>(user.preferences.responseStyle || "balanced");
  const [prefVoice, setPrefVoice] = useState(user.preferences.voiceResponses || false);
  const [prefNotif, setPrefNotif] = useState(user.preferences.notificationsEnabled ?? true);
  const [prefPrivacy, setPrefPrivacy] = useState(user.preferences.privacyMode ?? false);

  // Inline audio speech states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state & configure theme
  useEffect(() => {
    // Update HTML classes for the theme
    const root = document.documentElement;
    if (prefTheme === "dark" || (prefTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [prefTheme]);

  // Fetch conversations initial load
  useEffect(() => {
    fetchConversations();
    
    // Check Speech Recognition capability
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = getLangCode(prefLang);
      
      rec.onstart = () => {
        setIsListening(true);
        playBeep("start");
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        if (resultText) {
          setInputMessage((prev) => (prev ? prev + " " + resultText : resultText));
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsListening(false);
        playBeep("stop");
      };

      rec.onend = () => {
        setIsListening(false);
        playBeep("stop");
      };

      recognitionRef.current = rec;
    }

    if ("speechSynthesis" in window) {
      setSpeechSynthesisSupported(true);
    }
  }, [user.id]);

  const getLangCode = (lang: string) => {
    switch (lang) {
      case "Urdu": return "ur-PK";
      case "Pashto": return "ps-AF";
      case "Arabic": return "ar-SA";
      case "Hindi": return "hi-IN";
      case "Turkish": return "tr-TR";
      case "French": return "fr-FR";
      case "Spanish": return "es-ES";
      case "German": return "de-DE";
      case "Chinese": return "zh-CN";
      default: return "en-US";
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations", {
        headers: { "Authorization": `Bearer ${user.id}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        if (data.conversations && data.conversations.length > 0 && !activeConvId) {
          setActiveConvId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Could not fetch conversations:", err);
    }
  };

  // Auto Scroll Chat to End
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeConvId, aiStreaming]);

  // Create a brand new workspace dialogue
  const handleCreateConversation = async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({
          title: "New Dialogue",
          profession: prefProf,
          language: prefLang
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConvId(data.conversation.id);
        setSidebarOpen(false);
        playBeep("success");
      }
    } catch (err) {
      console.error("Failed creating dynamic chat dialogue:", err);
    }
  };

  // Toggle Pinned status
  const handleTogglePin = async (id: string, currentPinStatus: boolean) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({ pinned: !currentPinStatus })
      });
      if (res.ok) {
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Rename Dialogue title
  const handleRenameSubmit = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({ title: renameValue })
      });
      if (res.ok) {
        setEditingConvId(null);
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this chat?")) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.id}` }
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConvId === id) {
          const remaining = conversations.filter((c) => c.id !== id);
          setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Voice Speech Recognition toggle
  const handleVoiceInputToggle = () => {
    if (!voiceSupported) {
      alert("Speech Recognition API is not supported in this browser window.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  // Text to speech reproduction
  const speakText = (text: string) => {
    if (!speechSynthesisSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const cleanTextForSpeech = text.replace(/[*#`_\->]/g, "").slice(0, 350); // Keep reasonable length
    const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech);
    
    // Attempt parsing language code matching preference
    utterance.lang = getLangCode(prefLang);
    utterance.rate = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesisSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // File system upload parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 8 * 1024 * 1024) {
        alert("Maximum standard file capacity limit is 8MB.");
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const fileObj: MessageFile = {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result as string
        };
        setAttachments((prev) => [...prev, fileObj]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send Main Message call
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && attachments.length === 0) return;
    if (aiStreaming) return;

    let targetConvId = activeConvId;

    // Check if dialogue exists, otherwise build dynamically on first query
    if (!targetConvId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.id}`
          },
          body: JSON.stringify({
            title: inputMessage.trim().substring(0, 24) || "New Discussion",
            profession: prefProf,
            language: prefLang
          })
        });
        if (res.ok) {
          const data = await res.json();
          targetConvId = data.conversation.id;
          // Optimistically append state
          setConversations((prev) => [data.conversation, ...prev]);
          setActiveConvId(data.conversation.id);
        } else {
          alert("Unable to establish chat room connection.");
          return;
        }
      } catch (err) {
        console.error(err);
        return;
      }
    }

    const payloadText = inputMessage;
    const payloadFiles = [...attachments];

    // Clear state inputs optimistically
    setInputMessage("");
    setAttachments([]);
    setAiStreaming(true);

    try {
      const res = await fetch(`/api/conversations/${targetConvId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({
          content: payloadText,
          files: payloadFiles
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Dynamically update conversations tree
        setConversations((prev) =>
          prev.map((c) => (c.id === targetConvId ? data.conversation : c))
        );

        // Auto trigger Speech synthesis if enabled by preferences
        if (prefVoice && data.modelMessage && data.modelMessage.content) {
          speakText(data.modelMessage.content);
        }
        
        playBeep("success");
      } else {
        alert("Server returned error when generating response.");
      }
    } catch (err) {
      console.error("Communication issue post sending message:", err);
    } finally {
      setAiStreaming(false);
    }
  };

  // Saving settings and propagating back
  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/auth/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({
          languages: [prefLang],
          professions: [prefProf],
          theme: prefTheme,
          responseStyle: prefResponseStyle,
          voiceResponses: prefVoice,
          notificationsEnabled: prefNotif,
          privacyMode: prefPrivacy
        })
      });

      if (res.ok) {
        onUpdatePreferences({
          languages: [prefLang],
          professions: [prefProf],
          theme: prefTheme,
          responseStyle: prefResponseStyle,
          voiceResponses: prefVoice,
          notificationsEnabled: prefNotif,
          privacyMode: prefPrivacy
        });
        setIsSettingsOpen(false);
        
        // If there is an active session, update its visual tags dynamically as context
        if (activeConvId) {
          await fetch(`/api/conversations/${activeConvId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${user.id}`
            },
            body: JSON.stringify({
              profession: prefProf,
              language: prefLang
            })
          });
          fetchConversations();
        }

        playBeep("success");
      }
    } catch (err) {
      console.error("Failed to commit modern settings updates:", err);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 ${prefTheme}`}>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-tr from-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* --- MOBILE ACCESSIBILITY HEADER --- */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5 text-slate-300" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span className="font-display font-black text-sm tracking-wider uppercase bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
            Hayat AI
          </span>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
        >
          <Settings className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      {/* --- SIDEBAR PANEL (CHAT HISTORY) --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900/95 backdrop-blur-md border-r border-slate-800/80 p-4 shrink-0 flex flex-col transition-transform duration-300 transform md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:flex"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg">
              <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            </div>
            <div>
              <span className="font-display font-black text-base tracking-wider uppercase bg-gradient-to-r from-white to-sky-400 bg-clip-text text-transparent">
                Hayat AI
              </span>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-0.5 uppercase">
                Field Assistant
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Create Dialouge Action */}
        <button
          onClick={handleCreateConversation}
          className="flex items-center justify-center gap-2 w-full py-3 mb-4 rounded-xl border border-dashed border-slate-800 hover:border-sky-500/50 bg-slate-950 hover:bg-sky-500/[0.04] transition-all font-semibold text-xs text-sky-400 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Start New Conversation
        </button>

        {/* Dialogue Search box */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            id="chat-search"
            type="text"
            placeholder="Search dialogue list..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-3 py-2 text-slate-300 placeholder-slate-600 focus:border-sky-500 focus:outline-none transition"
          />
        </div>

        {/* Dialogue History Container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {/* Pins Section */}
          {filteredConversations.filter((c) => c.pinned).length > 0 && (
            <div>
              <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block mb-1">
                Pinned Chats
              </span>
              <div className="space-y-1">
                {filteredConversations
                  .filter((c) => c.pinned)
                  .map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setSidebarOpen(false);
                      }}
                      className={`group relative flex items-center justify-between p-2.5 rounded-xl transition text-xs cursor-pointer ${
                        activeConvId === conv.id
                          ? "bg-slate-950 border border-slate-800 text-sky-400 font-semibold"
                          : "hover:bg-slate-950/60 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <Pin className="w-3 h-3 text-sky-400 fill-sky-400 shrink-0" />
                        {editingConvId === conv.id ? (
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameSubmit(conv.id)}
                            onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit(conv.id)}
                            className="bg-transparent text-slate-200 outline-none text-xs w-full py-0.5 border-b border-sky-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate">{conv.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingConvId(conv.id);
                            setRenameValue(conv.title);
                          }}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(conv.id, true);
                          }}
                          className="p-1 hover:bg-slate-800 rounded text-sky-400"
                        >
                          <Pin className="w-2.5 h-2.5 fill-none" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* All dialogues Section */}
          <div className="pt-2">
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block mb-1">
              Conversations ({filteredConversations.length})
            </span>
            {filteredConversations.length === 0 ? (
              <div className="text-center p-6 bg-slate-950/20 border border-slate-950/40 rounded-xl">
                <p className="text-[11px] text-slate-600 font-medium">No recorded transcripts.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations
                  .filter((c) => !c.pinned)
                  .map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setSidebarOpen(false);
                      }}
                      className={`group relative flex items-center justify-between p-2.5 rounded-xl transition text-xs cursor-pointer ${
                        activeConvId === conv.id
                          ? "bg-slate-950 border border-slate-850 text-sky-400 font-semibold shadow-inner"
                          : "hover:bg-slate-950/60 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {editingConvId === conv.id ? (
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameSubmit(conv.id)}
                            onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit(conv.id)}
                            className="bg-transparent text-slate-200 outline-none text-xs w-full py-0.5 border-b border-sky-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate">{conv.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingConvId(conv.id);
                            setRenameValue(conv.title);
                          }}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(conv.id, false);
                          }}
                          className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-sky-400"
                        >
                          <Pin className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Profile Footer */}
        <div className="border-t border-slate-800/80 pt-4 mt-auto">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/60 border border-slate-800/50">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-500 text-slate-950 font-bold flex items-center justify-center text-sm">
              {user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <h4 className="text-xs font-semibold text-slate-200 truncate">{user.fullName}</h4>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-[11px] font-medium cursor-pointer transition"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-950 hover:bg-rose-950/15 border border-slate-800 hover:border-rose-900 text-slate-500 hover:text-rose-400 text-[11px] font-medium cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* --- CHAT MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col min-h-0 relative z-10 w-full">
        {/* Workspace Active Header */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 bg-slate-900/60 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <BrainBadge profession={activeConv?.profession || prefProf} />
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                {activeConv ? activeConv.title : "Hayat Adaptive Studio"}
              </h3>
              <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-sky-400/80" /> {activeConv?.profession || prefProf}
                </span>
                <span className="text-slate-700 font-bold">•</span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-sky-400/80" /> {activeConv?.language || prefLang}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Inline Speech feedback icons */}
            {speechSynthesisSupported && (
              <button
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    const lastModelMsg = activeConv?.messages.slice().reverse().find(m => m.role === "model");
                    if (lastModelMsg) speakText(lastModelMsg.content);
                  }
                }}
                className={`p-2.5 rounded-xl border transition cursor-pointer ${
                  isSpeaking
                    ? "bg-sky-500/10 border-sky-500/40 text-sky-400 animate-pulse"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
                title={isSpeaking ? "Stop speech synthesis playback" : "Read aloud last AI response"}
              >
                {isSpeaking ? (
                  <div className="flex items-center gap-1">
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <Volume2 className="w-4 h-4 ml-1" />
                  </div>
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Quick theme toggles */}
            <button
              onClick={() => {
                const toggled = prefTheme === "dark" ? "light" : "dark";
                setPrefTheme(toggled);
                onUpdatePreferences({ ...user.preferences, theme: toggled });
              }}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white cursor-pointer transition"
            >
              {prefTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Chat Message Scrolling list */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 space-y-6">
          {!activeConv || activeConv.messages.length === 0 ? (
            /* Welcome Landing Hero Grid */
            <div className="max-w-2xl mx-auto text-center py-12 md:py-16 smooth-fade-in flex flex-col items-center">
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl shadow-sky-500/5 mb-6">
                <Sparkles className="w-12 h-12 text-sky-400" />
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-black text-white tracking-tight">
                Empowering your workflow in <span className="text-sky-400">{prefProf}</span>
              </h2>
              <p className="mt-3 text-sm text-slate-400 max-w-lg leading-relaxed">
                Start dialoguing in <span className="font-semibold text-slate-300">{prefLang}</span>. Prompt for code, analytical concepts, specific documents, formulas, or general expert recommendations.
              </p>

              {/* Sample Guided prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 w-full text-left">
                {getGuidedQueries(prefProf, prefLang).map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputMessage(query)}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-950 transition text-xs text-slate-400 hover:text-white cursor-pointer group"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-300 mb-1">
                      <span>Concept Query #{idx + 1}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400 transition" />
                    </div>
                    <p className="line-clamp-2 leading-relaxed">{query}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Dialogue Loop render */
            <div className="max-w-3xl mx-auto space-y-6">
              {activeConv.messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {/* Model Icon */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 shrink-0">
                        <Sparkles className="w-4 h-4 fill-sky-400/10" />
                      </div>
                    )}

                    {/* Speech Bubble element */}
                    <div className={`max-w-[85%] rounded-2xl p-4 border shadow-sm ${
                      isUser
                        ? "bg-slate-900 border-slate-800 text-slate-100"
                        : "bg-slate-950/60 border-slate-900 text-slate-200"
                    }`}>
                      {/* Attached files logic */}
                      {msg.files && msg.files.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {msg.files.map((file, fIdx) => (
                            <div key={fIdx} className="inline-flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
                              {file.type.startsWith("image/") ? (
                                <img src={file.dataUrl} className="w-12 h-12 object-cover rounded-md" alt="preview" />
                              ) : (
                                <FileText className="w-4 h-4 text-sky-400" />
                              )}
                              <span className="max-w-24 truncate">{file.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Content Render with Simple Custom formatting */}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        <CustomMarkdown content={msg.content} />
                      </div>

                      {/* Bubble info footer */}
                      <div className="flex items-center justify-between gap-4 mt-3 pt-2.5 border-t border-slate-900 text-[10px] text-slate-500">
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!isUser && speechSynthesisSupported && (
                          <button
                            onClick={() => speakText(msg.content)}
                            className="inline-flex items-center gap-1 hover:text-sky-400 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" /> Read Aloud
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Streaming loading node */}
              {aiStreaming && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                  </div>
                  <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 max-w-[80%]">
                    <div className="flex items-center gap-2 text-xs text-sky-400 font-mono tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                      Hayat AI digesting context & field logic...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* Bottom Message Input Bar */}
        <div className="px-4 py-4 md:px-8 md:pb-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <div className="max-w-3xl mx-auto bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-2 shadow-xl">
            {/* Attachment Preview Box */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-slate-950/60 border-b border-slate-800 rounded-xl mb-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px]"
                  >
                    {file.type.startsWith("image/") ? (
                      <img src={file.dataUrl} className="w-8 h-8 object-cover rounded" alt="Preview" />
                    ) : (
                      <FileText className="w-5 h-5 text-sky-400" />
                    )}
                    <span className="max-w-28 truncate">{file.name}</span>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="p-0.5 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              {/* Media File triggers */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded-xl transition cursor-pointer"
                title="Upload Media files or Image payloads"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
                accept="image/*,application/pdf"
              />

              {/* Message Entry Area */}
              <input
                id="message-text-entry"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Ask Hayat AI for ${activeConv?.profession || prefProf} adaptation (${activeConv?.language || prefLang})...`}
                className="flex-1 bg-transparent py-2 px-1 text-sm outline-none border-none placeholder-slate-600 text-slate-200"
              />

              {/* Voice Recoger micro-indicator */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={handleVoiceInputToggle}
                  className={`p-2.5 rounded-xl transition cursor-pointer ${
                    isListening
                      ? "bg-rose-500/10 border border-rose-500/30 text-rose-400 animate-pulse"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                  title={isListening ? "Listening... click to capture input" : "Begin talking using audio input"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              {/* Submit Trigger */}
              <button
                id="btn-chat-send"
                type="submit"
                disabled={aiStreaming || (!inputMessage.trim() && attachments.length === 0)}
                className="p-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-850 rounded-xl text-slate-950 font-bold disabled:text-slate-600 transition cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          <p className="text-center text-[10px] text-slate-600 leading-snug mt-2">
            🧠 Selected Domain: **{activeConv?.profession || prefProf}** • System operates on Gemini 3.5 intelligent reasoning parameters.
          </p>
        </div>
      </main>

      {/* --- INTEGRATED SETTINGS MODAL / VIEW -- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[500px]">
            {/* Modal Menu Tabs */}
            <div className="w-full md:w-48 bg-slate-950/60 md:border-r border-slate-800 p-4 space-y-1 shrink-0">
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block mb-3 pl-2">
                System Config
              </span>
              <button
                onClick={() => setSettingsTab("general")}
                className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition ${
                  settingsTab === "general" ? "bg-sky-500/10 text-sky-400" : "text-slate-400 hover:bg-slate-900"
                }`}
              >
                <Sliders className="w-4 h-4" /> General Preferences
              </button>
              <button
                onClick={() => setSettingsTab("ai")}
                className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition ${
                  settingsTab === "ai" ? "bg-sky-500/10 text-sky-400" : "text-slate-400 hover:bg-slate-900"
                }`}
              >
                <Sparkles className="w-4 h-4" /> AI Response Style
              </button>
              <button
                onClick={() => setSettingsTab("notifications")}
                className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition ${
                  settingsTab === "notifications" ? "bg-sky-500/10 text-sky-400" : "text-slate-400 hover:bg-slate-900"
                }`}
              >
                <Bell className="w-4 h-4" /> Notifications
              </button>
              <button
                onClick={() => setSettingsTab("privacy")}
                className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition ${
                  settingsTab === "privacy" ? "bg-sky-500/10 text-sky-400" : "text-slate-400 hover:bg-slate-900"
                }`}
              >
                <Eye className="w-4 h-4" /> Privacy & Encryp.
              </button>
            </div>

            {/* Modal tab content */}
            <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
                  <h3 className="font-display font-black text-lg text-white">
                    {settingsTab === "general" && "General Customizations"}
                    {settingsTab === "ai" && "AI Response Style Engine"}
                    {settingsTab === "notifications" && "Notification Dispatches"}
                    {settingsTab === "privacy" && "Secured Space Config"}
                  </h3>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {settingsTab === "general" && (
                  <div className="space-y-4 text-xs">
                    {/* Active field select */}
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Active Expert Domain</label>
                      <select
                        id="set-field-select"
                        value={prefProf}
                        onChange={(e) => setPrefProf(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-sky-500 transition"
                      >
                        {AVAILABLE_PROFESSIONS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">
                        Determines default response vocabulary, formulas, and tailored diagrams.
                      </p>
                    </div>

                    {/* Language select */}
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Preferred Language</label>
                      <select
                        id="set-lang-select"
                        value={prefLang}
                        onChange={(e) => setPrefLang(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-sky-500 transition"
                      >
                        {COMMONLY_USED_LANGUAGES.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">
                        Language system forces all system replies to render in that exact selection automatically.
                      </p>
                    </div>

                    {/* Theme select */}
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Layout Canvas Styling</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["light", "dark", "system"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setPrefTheme(t as ThemeType)}
                            className={`py-2 px-3 rounded-lg border text-capitalize text-center cursor-pointer transition ${
                              prefTheme === t
                                ? "bg-sky-500/10 border-sky-400 text-sky-400"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "ai" && (
                  <div className="space-y-4 text-xs">
                    {/* Style selector */}
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">AI Dialogue Character Tone</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "balanced", desc: "Coherent, average-sized descriptions." },
                          { id: "concise", desc: "Terse, direct bullet outlines." },
                          { id: "detailed", desc: "Thorough, long walkthrough explanations." },
                          { id: "creative", desc: "Engaging analogies, wide suggestions." },
                          { id: "academic", desc: "Critical parameters and methodology." }
                        ].map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setPrefResponseStyle(style.id as ResponseStyleType)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col gap-1 ${
                              prefResponseStyle === style.id
                                ? "bg-sky-500/10 border-sky-400 text-sky-400"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <span className="font-semibold capitalize text-slate-200">{style.id}</span>
                            <span className="text-[10px] text-slate-500">{style.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Speech response synthesis */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 mt-4">
                      <div>
                        <h4 className="font-semibold text-slate-300">Synthesized Audio Feed</h4>
                        <p className="text-[10px] text-slate-500">
                          Automatically read back AI responses using local speech system synthesis.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrefVoice(!prefVoice)}
                        className={`w-12 h-6 rounded-full transition-all flex items-center p-1 cursor-pointer ${
                          prefVoice ? "bg-sky-500 justify-end" : "bg-slate-800 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-950 shadow-md" />
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === "notifications" && (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <h4 className="font-semibold text-slate-200">Simulate Push Dispatches</h4>
                        <p className="text-[9px] text-slate-500">Get alerts when processing completed logs.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrefNotif(!prefNotif)}
                        className={`w-11 h-6 rounded-full transition-all flex items-center p-1 cursor-pointer ${
                          prefNotif ? "bg-sky-500 justify-end" : "bg-slate-800 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-950" />
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 text-[11px] text-slate-500 leading-normal">
                      🔔 **Notifications active:** Your push systems will operate immediately in background dispatches to alert when your queries finish processing large analytical summaries.
                    </div>
                  </div>
                )}

                {settingsTab === "privacy" && (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <h4 className="font-semibold text-slate-200">Encryption Lock Mode</h4>
                        <p className="text-[9px] text-slate-500">Prevent saving dialogue histories locally.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrefPrivacy(!prefPrivacy)}
                        className={`w-11 h-6 rounded-full transition-all flex items-center p-1 cursor-pointer ${
                          prefPrivacy ? "bg-sky-500 justify-end" : "bg-slate-800 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-950" />
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 text-[11px] text-slate-500 leading-normal">
                      🛡️ **Local Sandboxing Enabled:** Your logs are guarded on the system environment container using secure memory parameters. To satisfy full-scale security compliance, toggle Encryption Lock on.
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Action Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800 mt-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-xs rounded-lg hover:bg-slate-800 border border-slate-800 text-slate-400 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-settings-save"
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2 text-xs rounded-lg bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Badge UI indicator based on profession
function BrainBadge({ profession }: { profession: string }) {
  let color = "bg-sky-500/10 border-sky-400/40 text-sky-400";
  if (profession.includes("Medical")) {
    color = "bg-rose-500/10 border-rose-400/40 text-rose-400";
  } else if (profession.includes("Business")) {
    color = "bg-emerald-500/10 border-emerald-400/40 text-emerald-400";
  } else if (profession.includes("Engineering")) {
    color = "bg-amber-500/10 border-amber-400/40 text-amber-400";
  } else if (profession.includes("Teaching")) {
    color = "bg-violet-500/10 border-violet-400/40 text-violet-400";
  } else if (profession.includes("Law")) {
    color = "bg-indigo-500/10 border-indigo-400/40 text-indigo-400";
  }

  return (
    <div className={`p-2.5 border rounded-xl shrink-0 ${color}`}>
      <Sparkles className="w-4 h-4 fill-current bg-transparent" />
    </div>
  );
}

// Markdown parser helper for clean visual feedback
function CustomMarkdown({ content }: { content: string }) {
  if (!content) return null;

  // Extremely robust clean parsing for code-blocks, bold tags, blockquotes & backticks
  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        // Detect codeblocks
        if (line.trim().startsWith("```")) {
          if (inCodeBlock) {
            inCodeBlock = false;
            const finalizedCode = codeBuffer.join("\n");
            codeBuffer = [];
            return (
              <pre key={idx} className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 font-mono text-xs text-sky-300 overflow-x-auto my-2 select-text">
                <code>{finalizedCode}</code>
              </pre>
            );
          } else {
            inCodeBlock = true;
            return null;
          }
        }

        if (inCodeBlock) {
          codeBuffer.push(line);
          return null;
        }

        // Detect bullet tags
        if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
          const text = line.replace(/^[\s*-]+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 text-xs md:text-sm pl-2">
              <span className="text-sky-400 shrink-0 mt-1.5">•</span>
              <p className="flex-1 text-slate-300">{parseInlineStyles(text)}</p>
            </div>
          );
        }

        // Detect quotes
        if (line.trim().startsWith(">")) {
          const text = line.replace(/^>\s*/, "");
          return (
            <blockquote key={idx} className="border-l-4 border-sky-500 pl-3.5 italic text-slate-400 my-2 text-xs">
              {parseInlineStyles(text)}
            </blockquote>
          );
        }

        // Detect headings
        if (line.trim().startsWith("###")) {
          return (
            <h4 key={idx} className="font-display font-bold text-sm text-sky-400 pt-2 pb-1 bg-transparent">
              {parseInlineStyles(line.replace("###", "").trim())}
            </h4>
          );
        }
        if (line.trim().startsWith("##")) {
          return (
            <h3 key={idx} className="font-display font-black text-sm md:text-base text-white pt-2.5 pb-1 bg-transparent">
              {parseInlineStyles(line.replace("##", "").trim())}
            </h3>
          );
        }

        return (
          <p key={idx} className="text-xs md:text-sm text-slate-300 leading-relaxed">
            {parseInlineStyles(line)}
          </p>
        );
      })}
    </div>
  );
}

// Convert **bold**, `code` inline
function parseInlineStyles(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-xs text-sky-300">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// Dynamic prompt helper
function getGuidedQueries(profession: string, language: string): string[] {
  const isUrdu = language === "Urdu";
  const isPashto = language === "Pashto";
  
  if (profession.includes("Computer") || profession.includes("Programming")) {
    if (isUrdu) {
      return [
        "React میں Dynamic routing اور state management کو کیسے implement کیا جاتا ہے؟ کوڈ فراہم کریں۔",
        "سافٹ ویئر انجینئرنگ میں ٹائم کمپلیکسٹی (Time Complexity) کے 5 اہم ترین الگورتھمز کی تفصیلات بتائیں۔"
      ];
    }
    return [
      "Can you explain React micro-state management using TypeScript and showcase a production boilerplate example?",
      "Help me write an elegant depth-first routing traverse algorithm with annotated comments on performance constraints."
    ];
  }

  if (profession.includes("Medical")) {
    if (isUrdu) {
      return [
        "دل کے امراض (Cardio) سے بچاؤ کے لیے 5 اہم طبی معلومات اور پرہیز فراہم کریں۔",
        "انسانی جسم کے میٹابولزم نظام پر جدید ترین سائنسی ریسرچ کی تفصیل لکھیں۔"
      ];
    }
    return [
      "Detail the medical pathway representing diabetic ketoacidosis and list relevant healthcare safety indicators in detail.",
      "Summarize the recent healthcare research papers relating to mRNA synthesis under customized patient diagnostics."
    ];
  }

  if (profession.includes("Business")) {
    return [
      "Help me formulate a SaaS startup financial balance template outlining customer acquisition cost configurations.",
      "Analyze the impact of digital marketing strategies on enterprise scaling models for consumer health."
    ];
  }

  // Fallback
  return [
    "What are the best strategic steps to speed up and streamline professional projects?",
    "Generate a structured roadmap to quickly master critical professional workflows in my chosen field."
  ];
}
