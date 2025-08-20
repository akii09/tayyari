import Link from "next/link";

export function HeaderDock() {
  return (
    <div className="fixed top-0 left-0 right-0 z-30">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        {/* Left: Logo (keep user size) */}
        <Link href="/" className="flex items-center">
          <img src="/img/logo.png" alt="TayyariAI logo" width={100} className="h-auto" />
        </Link>

        {/* Right: Progress + actions (elegant, no borders) */}
        <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-1.5 w-28 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-3/4 gradient-primary"></div>
            </div>
            <span>83% Ready</span>
          </div>
          <nav className="flex items-center gap-4">
            <button className="hover:text-white transition-colors">⌘K</button>
            <button className="hover:text-white transition-colors">Clear</button>
            <button className="hover:text-white transition-colors">Export</button>
            <button className="hover:text-white transition-colors">Settings</button>
          </nav>
        </div>
      </div>
    </div>
  );
}


