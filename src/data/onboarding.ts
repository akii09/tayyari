export const roles = [
  { value: "student", label: "Student" },
  { value: "fresher", label: "Fresher" },
  { value: "working", label: "Working Professional" },
  { value: "switcher", label: "Career Switcher" },
];

export const experienceLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export type InterviewTypeKey = "dsa" | "system" | "behavioral" | "full";

export const interviewTypes: Array<{ key: InterviewTypeKey; label: string; desc: string; icon: "dsa" | "system" | "behavioral" | "full" }> = [
  { key: "dsa", label: "DSA / Problem-Solving", desc: "Coding interviews", icon: "dsa" },
  { key: "system", label: "System Design", desc: "High-level architecture", icon: "system" },
  { key: "behavioral", label: "Behavioral", desc: "Experience & culture", icon: "behavioral" },
  { key: "full", label: "Full Interview Prep", desc: "Balanced mix", icon: "system" },
];

export type PreferenceQuestion = {
  id: string;
  text: string;
  options: string[];
};

export const preferencesByType: Record<InterviewTypeKey, PreferenceQuestion[]> = {
  dsa: [
    { id: "language", text: "Preferred programming language?", options: ["Python", "Java", "C++", "JavaScript", "Go"] },
    { id: "difficulty", text: "Target difficulty?", options: ["Easy", "Medium", "Hard", "Mixed"] },
  ],
  system: [
    { id: "scale", text: "Target scale?", options: ["Startup", "Mid-scale", "Big-tech"] },
    { id: "format", text: "Practice format?", options: ["Whiteboard", "Doc + Diagrams", "Both"] },
  ],
  behavioral: [
    { id: "focus", text: "Focus areas?", options: ["Leadership", "Conflict", "Ownership", "Communication"] },
  ],
  full: [
    { id: "language", text: "Preferred programming language?", options: ["Python", "Java", "C++", "JavaScript", "Go"] },
    { id: "mocks", text: "Include mock interview sessions?", options: ["Yes", "No"] },
  ],
};

export const roadmapTemplates: Record<InterviewTypeKey, Array<{ title: string; progress: number }>> = {
  dsa: [
    { title: "Arrays & Strings", progress: 0 },
    { title: "Trees & Graphs", progress: 0 },
    { title: "DP & Greedy", progress: 0 },
  ],
  system: [
    { title: "System design fundamentals", progress: 0 },
    { title: "Caching, Sharding, Queues", progress: 0 },
    { title: "Design 3 systems", progress: 0 },
  ],
  behavioral: [
    { title: "STAR stories", progress: 0 },
    { title: "Leadership & Ownership", progress: 0 },
    { title: "Mocks & feedback", progress: 0 },
  ],
  full: [
    { title: "Balanced DSA + SD + Behavioral", progress: 0 },
    { title: "Weekly mocks", progress: 0 },
  ],
};


