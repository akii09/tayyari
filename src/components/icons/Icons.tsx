type IconProps = { size?: number; className?: string };

export function DsaIcon({ size = 28, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="grad-dsa" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--electric-blue)" />
          <stop offset="100%" stopColor="var(--deep-purple)" />
        </linearGradient>
      </defs>
      <g stroke="url(#grad-dsa)" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="6" height="6" rx="1.5" />
        <rect x="15" y="3" width="6" height="6" rx="1.5" />
        <rect x="3" y="15" width="6" height="6" rx="1.5" />
        <rect x="15" y="15" width="6" height="6" rx="1.5" />
        <path d="M9 6h6M6 9v6M15 12h6M12 15v6" />
      </g>
    </svg>
  );
}

export function SystemDesignIcon({ size = 28, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="grad-sd" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--electric-blue)" />
          <stop offset="100%" stopColor="var(--neon-green)" />
        </linearGradient>
      </defs>
      <g stroke="url(#grad-sd)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="4" rx="1.5" />
        <rect x="3" y="10" width="10" height="4" rx="1.5" />
        <rect x="3" y="16" width="18" height="4" rx="1.5" />
        <path d="M13 12h3m2 0h3" />
      </g>
    </svg>
  );
}

export function BehavioralIcon({ size = 28, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="grad-beh" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--neon-green)" />
          <stop offset="100%" stopColor="var(--deep-purple)" />
        </linearGradient>
      </defs>
      <g stroke="url(#grad-beh)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H9l-5 4V8a2 2 0 0 1 2-2Z" />
        <path d="M10 11h6M10 8h8" />
      </g>
    </svg>
  );
}


