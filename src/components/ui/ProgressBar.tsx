export function ProgressBar({
  value,
  label,
  animated = false,
}: {
  /** 0-100 */
  value: number;
  label?: string;
  animated?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-slate-600">{label}</span>
          <span className="font-medium tabular-nums text-slate-900">{clamped}%</span>
        </div>
      )}
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
      >
        <div
          className={`h-full rounded-full bg-indigo-600 transition-[width] duration-500 ease-out ${animated ? "bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.25)_50%,rgba(255,255,255,.25)_75%,transparent_75%,transparent)] animate-[progress-stripes_1s_linear_infinite]" : ""}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
