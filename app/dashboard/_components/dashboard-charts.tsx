"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardSeriesPoint, StageBreakdownPoint } from "@/lib/dashboard";

type DashboardChartsProps = {
  series: DashboardSeriesPoint[];
  stageBreakdown: StageBreakdownPoint[];
};

export function DashboardCharts({ series, stageBreakdown }: DashboardChartsProps) {
  if (series.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">
        No hay datos para mostrar en el rango seleccionado.
      </div>
    );
  }

  const compactSeries = series.map((point) => ({
    ...point,
    shortDate: point.date.slice(5),
  }));

  const pieColors = ["#10b981", "#3b82f6", "#8b5cf6", "#f97316"];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">
          Evolución de leads y llamadas
        </h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={compactSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="shortDate" stroke="#71717a" tickLine={false} />
              <YAxis stroke="#71717a" tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: 12,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="leadsNew"
                name="Nuevos leads"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="appointmentsBooked"
                name="Llamadas agendadas"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="appointmentsClosed"
                name="Llamadas cerradas"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">
          Mensajes entrantes y salientes
        </h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compactSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="shortDate" stroke="#71717a" tickLine={false} />
              <YAxis stroke="#71717a" tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: 12,
                }}
              />
              <Legend />
              <Bar
                dataKey="messagesInbound"
                name="Entrantes"
                fill="#14b8a6"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="messagesOutbound"
                name="Salientes"
                fill="#0ea5e9"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 xl:col-span-2">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">
          Distribución de etapa del funnel (último día)
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: 12,
                }}
              />
              <Legend />
              <Pie
                data={stageBreakdown}
                dataKey="count"
                nameKey="stage"
                outerRadius={110}
                label
              >
                {stageBreakdown.map((item, index) => (
                  <Cell
                    key={`${item.stage}-${item.count}`}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
