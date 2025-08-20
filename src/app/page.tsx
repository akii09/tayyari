import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 text-center space-y-6">
      <h1 className="text-3xl sm:text-5xl font-semibold">TayyariAI</h1>
      <p className="text-[var(--text-secondary)]">Smarter Prep. Faster Progress.</p>
      <div className="flex items-center justify-center gap-3">
        <Link href="/onboarding" className="gradient-primary text-white px-5 py-3 rounded-md">Start Onboarding</Link>
        <Link href="/chat" className="px-5 py-3 rounded-md border border-white/10 hover:bg-white/5">Open Chat</Link>
      </div>
    </div>
  );
}
