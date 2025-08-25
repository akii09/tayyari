import Link from "next/link";
import { AIModelSwitcher } from "./AIModelSwitcher";

export function HeaderDock() {
  return (
    <>
      {/* Logo at extreme left - elegant and minimal */}
      <div className="fixed top-0 left-0 z-30">
        <Link href="/" className="block p-4">
          <img src="/img/logo.png" alt="TayyarAI" width={85} className="h-auto" />
        </Link>
      </div>
      
      {/* AI Model Switcher at top right */}
      <AIModelSwitcher />
    </>
  );
}


