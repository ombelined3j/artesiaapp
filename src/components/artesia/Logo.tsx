import logoMark from "@/assets/logo-artesy.png";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <img src={logoMark} alt="" className="h-8 w-8 rounded-md object-cover" />
      <span className="font-display text-2xl font-medium tracking-tight">
        Artesy
        <span className="text-primary">.</span>
      </span>
    </span>
  );
}
