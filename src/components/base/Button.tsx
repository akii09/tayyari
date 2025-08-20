type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center text-sm font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "gradient-primary text-white px-4 py-2 rounded-md interactive"
      : "text-[var(--text-secondary)] hover:text-white px-3 py-2";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}


