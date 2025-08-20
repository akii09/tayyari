"use client";

import { useState } from "react";

export function ChatInput() {
  const [message, setMessage] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    // Placeholder submit handler
    setMessage("");
  };

  return (
    <form onSubmit={onSubmit} className="sticky bottom-4 mt-6 sm:mt-10">
      <div className="glass-card px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your request…"
            rows={1}
            className="min-h-[44px] max-h-40 w-full resize-none bg-transparent outline-none placeholder:text-[var(--text-muted)] text-[15px]"
          />
          <div className="flex items-center gap-1 sm:gap-2">
            <button type="button" title="Attach" className="interactive glass-card px-2 py-2 rounded-md text-sm">
              📎
            </button>
            <button type="button" title="Quick Action" className="interactive glass-card px-2 py-2 rounded-md text-sm">
              ⚡
            </button>
            <button type="button" title="Code" className="interactive glass-card px-2 py-2 rounded-md text-sm">
              {"{ }"}
            </button>
            <button
              type="submit"
              className="interactive rounded-md px-3 py-2 text-sm font-medium text-white gradient-primary"
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}


