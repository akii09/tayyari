import Link from "next/link";

export function HeaderDock() {
  return (
    <div className="fixed top-0 left-0 z-30">
      {/* Logo at extreme left - elegant and minimal */}
      <Link href="/" className="block p-4">
        <img src="/img/logo.png" alt="TayyarAI" width={85} className="h-auto" />
      </Link>
    </div>
  );
}


