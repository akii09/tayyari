type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  isLoading?: boolean;
  disabled?: boolean;
};

export function Button({ 
  variant = "primary", 
  className = "", 
  isLoading = false,
  disabled = false,
  children,
  ...props 
}: ButtonProps) {
  const base = "inline-flex items-center justify-center text-sm font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "gradient-primary text-white px-4 py-2 rounded-md interactive"
      : "text-text-secondary hover:text-white px-3 py-2";
  
  // Filter out custom props that shouldn't go to DOM
  const { isLoading: _, ...domProps } = props;
  
  return (
    <button 
      className={`${base} ${styles} ${className}`} 
      disabled={disabled || isLoading}
      {...domProps}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
}


