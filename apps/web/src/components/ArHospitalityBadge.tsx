export function ArHospitalityBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink shadow-sm border border-surface-border ${className}`}
    >
      AR Hospitality Property
    </span>
  );
}
