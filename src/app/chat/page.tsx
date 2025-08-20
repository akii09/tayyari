import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { RoadmapScroller } from "@/components/roadmap/RoadmapScroller";

const mockMessages = [
  { id: "m1", role: "assistant" as const, content: "Ready to tackle system design? Let's start with a classic: Design a URL shortener." },
  { id: "m2", role: "user" as const, content: "Can you give me hints about the database?" },
  { id: "m3", role: "assistant" as const, content: "Sure. We can discuss schema, indexing, and write patterns. Want a SQL sketch?" },
];

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-10">
      <section aria-label="Chat" className="space-y-4 sm:space-y-6">
        {mockMessages.map((m) => (
          <ChatMessage key={m.id} role={m.role} content={m.content} />
        ))}
      </section>
      <RoadmapScroller />
      <ChatInput />
    </div>
  );
}


