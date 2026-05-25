type KpiCardProps = {
  label: string;
  value: number;
  previousValue: number;
  deltaPercentage: number;
  format: "number" | "percentage";
};

function formatMetric(value: number, format: "number" | "percentage"): string {
  if (format === "percentage") {
    return `${(value * 100).toFixed(1)}%`;
  }

  return new Intl.NumberFormat("es-AR").format(value);
}

function formatDelta(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

export function KpiCard({
  label,
  value,
  previousValue,
  deltaPercentage,
  format,
}: KpiCardProps) {
  const toneClass =
    deltaPercentage > 0
      ? "text-emerald-400"
      : deltaPercentage < 0
        ? "text-rose-400"
        : "text-zinc-400";

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-100">
        {formatMetric(value, format)}
      </p>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className={`text-sm font-medium ${toneClass}`}>
          {formatDelta(deltaPercentage)}
        </p>
        <p className="text-xs text-zinc-500">
          previo: {formatMetric(previousValue, format)}
        </p>
      </div>
    </article>
  );
}
