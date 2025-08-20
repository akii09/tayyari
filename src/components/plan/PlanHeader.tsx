type Props = {
  title: string;
  subtitle?: string;
  onAccept?: () => void;
  onAdjust?: () => void;
};

export function PlanHeader({ title, subtitle, onAccept, onAdjust }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {onAdjust && (
          <button onClick={onAdjust} className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-sm">Tweak Preferences</button>
        )}
        {onAccept && (
          <button onClick={onAccept} className="gradient-primary text-white px-4 py-1.5 rounded-md text-sm">Accept & Start 🚀</button>
        )}
      </div>
    </div>
  );
}


