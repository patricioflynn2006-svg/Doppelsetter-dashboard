import Link from "next/link";
import { redirect } from "next/navigation";
import "@/lib/env-defaults";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import {
  ensureClientForUser,
  getDashboardData,
  RANGE_OPTIONS,
  type RangeOption,
} from "@/lib/dashboard";
import { DashboardCharts } from "./_components/dashboard-charts";
import { KpiCard } from "./_components/kpi-card";

type DashboardPageProps = {
  searchParams: Promise<{ range?: string }>;
};

function parseRange(value: string | undefined): RangeOption {
  const parsed = Number(value);
  if (RANGE_OPTIONS.includes(parsed as RangeOption)) {
    return parsed as RangeOption;
  }

  return 30;
}

function rangeLabel(days: number): string {
  if (days === 7) return "7 días";
  if (days === 30) return "30 días";
  return "90 días";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const range = parseRange(resolvedSearchParams?.range);
  const { client } = await ensureClientForUser(userId);
  const data = await getDashboardData(client.id, range);

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">
              Cliente activo
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{client.name}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Última actualización:{" "}
              {new Date(data.generatedAt).toLocaleString("es-AR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Inicio
            </Link>
            <UserButton />
          </div>
        </header>

        <section className="mb-8 flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => {
            const active = option === data.rangeDays;
            return (
              <Link
                key={option}
                href={`/dashboard?range=${option}`}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  active
                    ? "bg-emerald-500 font-medium text-black"
                    : "border border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {rangeLabel(option)}
              </Link>
            );
          })}
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {data.kpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              previousValue={kpi.previousValue}
              deltaPercentage={kpi.deltaPercentage}
              format={kpi.format}
            />
          ))}
        </section>

        <section className="mb-8">
          <DashboardCharts
            series={data.series}
            stageBreakdown={data.stageBreakdown}
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-lg font-medium">Top contenidos por leads</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-900 text-left text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Contenido</th>
                  <th className="px-5 py-3 font-medium">Plataforma</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Views</th>
                  <th className="px-5 py-3 font-medium">Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.topContent.map((item) => (
                  <tr key={item.assetId} className="hover:bg-zinc-900/70">
                    <td className="px-5 py-3 text-zinc-100">{item.title}</td>
                    <td className="px-5 py-3 text-zinc-300">{item.platform}</td>
                    <td className="px-5 py-3 text-zinc-300">{item.publishedAt}</td>
                    <td className="px-5 py-3 text-zinc-300">
                      {new Intl.NumberFormat("es-AR").format(item.views)}
                    </td>
                    <td className="px-5 py-3 font-medium text-emerald-400">
                      {new Intl.NumberFormat("es-AR").format(item.leadsGenerated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
