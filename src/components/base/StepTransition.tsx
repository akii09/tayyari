"use client";

import { useEffect, useState } from "react";

export function StepTransition({ step, children }: { step: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 0);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div className={`transition-all duration-300 ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-5"}`}>{children}</div>
  );
}


