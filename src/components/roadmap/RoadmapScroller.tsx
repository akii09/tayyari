import { GlassCard } from "@/components/base/GlassCard";

type Item = { title: string; emoji: string; progress: number; eta?: string };
const milestones: Item[] = [
  { title: "Foundations", emoji: "📘", progress: 80, eta: "Week 1-2" },
  { title: "DSA Core", emoji: "🧠", progress: 60, eta: "Week 2-3" },
  { title: "System Design", emoji: "🧱", progress: 40, eta: "Week 3-4" },
  { title: "Mocks", emoji: "🎤", progress: 20, eta: "Week 5" },
];

export function RoadmapScroller() {
  return (
    <div className="overflow-x-auto py-4">
      <div className="relative h-1 bg-white/10 rounded-full mx-4">
        <div className="absolute left-0 top-0 h-full gradient-primary w-1/2"></div>
      </div>
      <div className="flex items-stretch gap-4 min-w-max pr-4 mt-4">
        {milestones.map((m) => (
          <GlassCard key={m.title} className="p-4 w-64 relative">
            <div className="flex items-center justify-between">
              <div className="text-3xl">{m.emoji}</div>
              <span className="text-xs text-[var(--text-secondary)]">{m.eta}</span>
            </div>
            <div className="mt-2 font-medium">{m.title}</div>
            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full gradient-success" style={{ width: `${m.progress}%` }} />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{m.progress}%</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}


