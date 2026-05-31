export type ThemeType = "light" | "dark" | "system";

export type ResponseStyleType = "balanced" | "concise" | "detailed" | "creative" | "academic";

export interface UserPreferences {
  languages: string[]; // Selected languages, e.g., ["English", "Urdu"]
  professions: string[]; // Selected professions, e.g., ["Medical & Healthcare", "Programming"]
  theme: ThemeType;
  responseStyle: ResponseStyleType;
  voiceResponses: boolean; // toggle speech synthesis
  notificationsEnabled: boolean;
  privacyMode: boolean; // privacy options
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  preferences: UserPreferences;
  createdAt: string;
}

export interface MessageFile {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // Base64 encoding
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  files?: MessageFile[];
  isVoice?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  pinned: boolean;
  messages: Message[];
  profession: string; // The profession context used
  language: string; // The language context used
  createdAt: string;
  updatedAt: string;
}

export const COMMONLY_USED_LANGUAGES = [
  "English",
  "Urdu",
  "Pashto",
  "Arabic",
  "Hindi",
  "Turkish",
  "French",
  "Spanish",
  "German",
  "Chinese"
];

export const AVAILABLE_PROFESSIONS = [
  "Medical & Healthcare",
  "Engineering",
  "Computer Science & Programming",
  "Business & Finance",
  "Education & Teaching",
  "Law",
  "Marketing",
  "Design & Creative Arts",
  "Research & Science",
  "Student",
  "Other"
];
