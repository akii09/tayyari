import { GlassCard } from "@/components/base/GlassCard";
import { StreamingMarkdown } from "@/components/plan/StreamingMarkdown";
import { PlanHeader } from "@/components/plan/PlanHeader";

type Props = {
  content: string;
  onBack: () => void;
  onAccept: () => void;
  onTweak: () => void;
};

const roadmapStats = [
  { label: "Total Weeks", value: "6" },
  { label: "Hours/Week", value: "10" },
  { label: "Topics Covered", value: "15+" },
  { label: "Mock Interviews", value: "4" },
];

const weeklyBreakdown = [
  { week: "Week 1-2", title: "Foundations", topics: ["Arrays & Strings", "Sorting Patterns", "Two Pointers"], color: "var(--electric-blue)" },
  { week: "Week 3-4", title: "System Design", topics: ["Caching & Sharding", "Rate Limiting", "URL Shortener"], color: "var(--neon-green)" },
  { week: "Week 5", title: "Behavioral", topics: ["STAR Stories", "Leadership Examples", "Mock Practice"], color: "var(--deep-purple)" },
  { week: "Week 6", title: "Final Sprint", topics: ["Weak Areas", "Timing Drills", "Review"], color: "var(--warning)" },
];

export function RoadmapViewer({ content, onBack, onAccept, onTweak }: Props) {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h2 className="text-3xl font-semibold mb-2">Your AI-Generated Roadmap</h2>
        <p className="text-[var(--text-secondary)]">Personalized plan crafted for your goals and timeline</p>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {roadmapStats.map((stat) => (
          <GlassCard key={stat.label} className="p-4 text-center">
            <div className="text-2xl font-semibold text-[var(--electric-blue)]">{stat.value}</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">{stat.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Weekly Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Weekly Breakdown</h3>
        <div className="space-y-3">
          {weeklyBreakdown.map((phase, idx) => (
            <GlassCard key={phase.week} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-3 h-3 rounded-full mt-1" style={{ backgroundColor: phase.color }}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{phase.title}</h4>
                    <span className="text-xs text-[var(--text-secondary)]">{phase.week}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {phase.topics.map((topic) => (
                      <span key={topic} className="px-2 py-1 text-xs bg-white/5 rounded-full">{topic}</span>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Detailed Plan */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Detailed Study Plan</h3>
          <button onClick={onTweak} className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-sm">Tweak Preferences</button>
        </div>
        <GlassCard className="p-6">
          <StreamingMarkdown content={content} />
        </GlassCard>
      </div>


    </div>
  );
}
