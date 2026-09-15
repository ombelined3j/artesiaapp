export function Logo({ className }: { className?: string }) {
  return (
    <span className={`font-display text-2xl font-medium tracking-tight ${className ?? ""}`}>
      Artesia
      <span className="text-primary">.</span>
    </span>
  );
}
