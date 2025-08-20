import Image from "next/image";

type MessageProps = {
  role: "assistant" | "user";
  content: string;
};

export function ChatMessage({ role, content }: MessageProps) {
  const isUser = role === "user";
  return (
    <article className={`glass-card p-4 sm:p-6 ${isUser ? "border-white/10" : "border-white/10"}`}>
      <div className="flex items-start gap-3">
        {isUser ? (
          <div className="h-8 w-8 rounded-full bg-white/10" />
        ) : (
          <Image src="/img/favicon.png" alt="AI" width={32} height={32} className="rounded-full" />
        )}
        <div className="space-y-2">
          <header className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            {isUser ? "You" : "TayyariAI"}
          </header>
          <p className="leading-relaxed text-[15px] whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </article>
  );
}


