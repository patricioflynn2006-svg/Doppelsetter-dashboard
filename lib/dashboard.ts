import { createHash, timingSafeEqual } from "node:crypto";
import { ClientUserRole, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CHUECO_SLUG = "chueco";
const CHUECO_NAME = "Chueco Lazzari";

export const RANGE_OPTIONS = [7, 30, 90] as const;

export type RangeOption = (typeof RANGE_OPTIONS)[number];

export type DashboardKpi = {
  key:
    | "newLeads"
    | "bookedCalls"
    | "closedCalls"
    | "conversionToCall"
    | "engagementRate";
  label: string;
  value: number;
  previousValue: number;
  deltaPercentage: number;
  format: "number" | "percentage";
};

export type DashboardSeriesPoint = {
  date: string;
  leadsNew: number;
  leadsConversando: number;
  leadsLinkEnviado: number;
  leadsAgendado: number;
  leadsFrio: number;
  messagesInbound: number;
  messagesOutbound: number;
  appointmentsBooked: number;
  appointmentsClosed: number;
  contentViews: number;
  contentEngagements: number;
};

export type StageBreakdownPoint = {
  stage: string;
  count: number;
};

export type TopContentRow = {
  assetId: string;
  title: string;
  platform: string;
  views: number;
  leadsGenerated: number;
  publishedAt: string;
};

type AggregateTotals = {
  leadsNew: number;
  appointmentsBooked: number;
  appointmentsClosed: number;
  contentViews: number;
  contentEngagements: number;
};

export type DashboardData = {
  rangeDays: RangeOption;
  generatedAt: string;
  kpis: DashboardKpi[];
  series: DashboardSeriesPoint[];
  stageBreakdown: StageBreakdownPoint[];
  topContent: TopContentRow[];
};

function toDateOnly(dateInput: Date): Date {
  return new Date(
    Date.UTC(
      dateInput.getUTCFullYear(),
      dateInput.getUTCMonth(),
      dateInput.getUTCDate(),
    ),
  );
}

function addDays(dateInput: Date, days: number): Date {
  const clone = new Date(dateInput);
  clone.setUTCDate(clone.getUTCDate() + days);
  return toDateOnly(clone);
}

function toIsoDate(dateInput: Date): string {
  return dateInput.toISOString().slice(0, 10);
}

function toInt(value: unknown): number {
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? Math.round(asNumber) : 0;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

function deltaPercentage(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return round(((current - previous) / previous) * 100, 2);
}

function hashIngestionKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

async function seedChuecoMetrics(clientId: string): Promise<void> {
  const hasMetrics = await prisma.clientDailyMetric.count({
    where: { clientId },
  });

  if (hasMetrics === 0) {
    const today = toDateOnly(new Date());
    const rows: Prisma.ClientDailyMetricCreateManyInput[] = [];

    for (let offset = 89; offset >= 0; offset -= 1) {
      const date = addDays(today, -offset);
      const leadTrend = 12 + Math.sin(offset / 5) * 4 + ((offset % 6) - 3) * 0.6;
      const leadsNew = Math.max(3, Math.round(leadTrend));
      const leadsConversando = Math.max(2, Math.round(leadsNew * 0.66) + 3);
      const leadsLinkEnviado = Math.max(1, Math.round(leadsConversando * 0.54));
      const leadsAgendado = Math.max(0, Math.round(leadsLinkEnviado * 0.42));
      const leadsFrio = Math.max(
        0,
        leadsNew + leadsConversando - leadsLinkEnviado - leadsAgendado,
      );
      const appointmentsBooked = leadsAgendado;
      const appointmentsAttended = Math.max(
        0,
        appointmentsBooked - (offset % 4 === 0 ? 1 : 0),
      );
      const appointmentsClosed = Math.max(
        0,
        Math.round(appointmentsAttended * 0.47),
      );
      const messagesInbound = Math.max(
        5,
        Math.round(leadsConversando * 2.1 + (offset % 5)),
      );
      const messagesOutbound = Math.max(
        5,
        Math.round(messagesInbound * 1.28 + 3),
      );
      const contentViews = Math.max(
        150,
        Math.round(900 + Math.sin(offset / 7) * 250 + (offset % 11) * 20),
      );
      const contentEngagements = Math.max(
        20,
        Math.round(contentViews * (0.09 + (offset % 3) * 0.01)),
      );

      rows.push({
        clientId,
        date,
        leadsNew,
        leadsConversando,
        leadsLinkEnviado,
        leadsAgendado,
        leadsFrio,
        qualificationRate: round(ratio(leadsAgendado, leadsNew), 4),
        messagesInbound,
        messagesOutbound,
        appointmentsBooked,
        appointmentsAttended,
        appointmentsClosed,
        contentViews,
        contentEngagements,
        contentLeads: leadsNew,
      });
    }

    await prisma.clientDailyMetric.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  const hasAssets = await prisma.contentAssetMetric.count({
    where: { clientId },
  });

  if (hasAssets === 0) {
    const now = new Date();
    const contentSeed: Prisma.ContentAssetMetricCreateManyInput[] = [
      {
        clientId,
        assetId: "ig-reel-01",
        platform: "Instagram",
        title: "Dolor lumbar en el swing: 3 ajustes inmediatos",
        publishedAt: addDays(now, -20),
        views: 12450,
        likes: 962,
        comments: 87,
        shares: 124,
        saves: 316,
        leadsGenerated: 49,
      },
      {
        clientId,
        assetId: "ig-reel-02",
        platform: "Instagram",
        title: "Movilidad torácica para ganar distancia",
        publishedAt: addDays(now, -17),
        views: 9840,
        likes: 756,
        comments: 65,
        shares: 98,
        saves: 251,
        leadsGenerated: 36,
      },
      {
        clientId,
        assetId: "ig-reel-03",
        platform: "Instagram",
        title: "Entrenamiento express pre-ronda (7 minutos)",
        publishedAt: addDays(now, -14),
        views: 8730,
        likes: 642,
        comments: 40,
        shares: 74,
        saves: 203,
        leadsGenerated: 27,
      },
      {
        clientId,
        assetId: "ig-reel-04",
        platform: "Instagram",
        title: "Por qué el descanso no alcanza para eliminar dolor",
        publishedAt: addDays(now, -11),
        views: 10920,
        likes: 821,
        comments: 102,
        shares: 145,
        saves: 277,
        leadsGenerated: 41,
      },
      {
        clientId,
        assetId: "ig-reel-05",
        platform: "Instagram",
        title: "Caso real: de rigidez a ronda sin molestias",
        publishedAt: addDays(now, -8),
        views: 7920,
        likes: 589,
        comments: 58,
        shares: 66,
        saves: 180,
        leadsGenerated: 24,
      },
      {
        clientId,
        assetId: "ig-reel-06",
        platform: "Instagram",
        title: "Backswing limitado: error común en +40",
        publishedAt: addDays(now, -5),
        views: 11840,
        likes: 918,
        comments: 96,
        shares: 134,
        saves: 305,
        leadsGenerated: 46,
      },
    ];

    await prisma.contentAssetMetric.createMany({
      data: contentSeed,
      skipDuplicates: true,
    });
  }

  const chuecoIngestKey = process.env.CHUECO_INGEST_KEY;
  if (chuecoIngestKey) {
    const hashedKey = hashIngestionKey(chuecoIngestKey);
    const existing = await prisma.clientApiKey.findFirst({
      where: {
        clientId,
        hashedKey,
      },
    });

    if (!existing) {
      await prisma.clientApiKey.create({
        data: {
          clientId,
          label: "chueco-default-ingest-key",
          hashedKey,
          isActive: true,
        },
      });
    }
  }
}

function aggregateTotals(
  rows: Array<{
    leadsNew: number;
    appointmentsBooked: number;
    appointmentsClosed: number;
    contentViews: number;
    contentEngagements: number;
  }>,
): AggregateTotals {
  return rows.reduce<AggregateTotals>(
    (accumulator, row) => {
      accumulator.leadsNew += row.leadsNew;
      accumulator.appointmentsBooked += row.appointmentsBooked;
      accumulator.appointmentsClosed += row.appointmentsClosed;
      accumulator.contentViews += row.contentViews;
      accumulator.contentEngagements += row.contentEngagements;
      return accumulator;
    },
    {
      leadsNew: 0,
      appointmentsBooked: 0,
      appointmentsClosed: 0,
      contentViews: 0,
      contentEngagements: 0,
    },
  );
}

export async function upsertClientBySlug(input: {
  slug: string;
  name?: string;
  timezone?: string;
}) {
  return prisma.client.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name ?? undefined,
      timezone: input.timezone ?? undefined,
    },
    create: {
      slug: input.slug,
      name: input.name ?? input.slug,
      timezone: input.timezone ?? "America/Argentina/Buenos_Aires",
    },
  });
}

export async function ensureClientForUser(clerkUserId: string) {
  const client = await upsertClientBySlug({
    slug: CHUECO_SLUG,
    name: CHUECO_NAME,
    timezone: "America/Argentina/Buenos_Aires",
  });

  await seedChuecoMetrics(client.id);

  let membership = await prisma.clientUser.findFirst({
    where: {
      clerkUserId,
      clientId: client.id,
    },
  });

  if (!membership) {
    const existingUsersCount = await prisma.clientUser.count({
      where: { clientId: client.id },
    });

    membership = await prisma.clientUser.create({
      data: {
        clientId: client.id,
        clerkUserId,
        role: existingUsersCount === 0 ? ClientUserRole.OWNER : ClientUserRole.ANALYST,
      },
    });
  }

  return { client, membership };
}

export async function verifyIngestionKey(
  clientId: string,
  providedKey: string | null,
): Promise<boolean> {
  if (!providedKey) {
    return false;
  }

  const sharedKey = process.env.INGESTION_SHARED_KEY;
  if (sharedKey && safeEqual(providedKey, sharedKey)) {
    return true;
  }

  const hashedKey = hashIngestionKey(providedKey);
  const activeKeys = await prisma.clientApiKey.findMany({
    where: {
      clientId,
      isActive: true,
    },
    select: {
      hashedKey: true,
    },
  });

  return activeKeys.some((apiKey) => safeEqual(apiKey.hashedKey, hashedKey));
}

export async function getDashboardData(
  clientId: string,
  requestedRange: number,
): Promise<DashboardData> {
  const rangeDays = RANGE_OPTIONS.includes(requestedRange as RangeOption)
    ? (requestedRange as RangeOption)
    : 30;

  const today = toDateOnly(new Date());
  const currentStart = addDays(today, -(rangeDays - 1));
  const previousStart = addDays(currentStart, -rangeDays);

  const metricRows = await prisma.clientDailyMetric.findMany({
    where: {
      clientId,
      date: {
        gte: previousStart,
        lte: today,
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const currentRows = metricRows.filter((row) => row.date >= currentStart);
  const previousRows = metricRows.filter((row) => row.date < currentStart);
  const currentTotals = aggregateTotals(currentRows);
  const previousTotals = aggregateTotals(previousRows);

  const conversionCurrent = ratio(
    currentTotals.appointmentsBooked,
    currentTotals.leadsNew,
  );
  const conversionPrevious = ratio(
    previousTotals.appointmentsBooked,
    previousTotals.leadsNew,
  );
  const engagementCurrent = ratio(
    currentTotals.contentEngagements,
    currentTotals.contentViews,
  );
  const engagementPrevious = ratio(
    previousTotals.contentEngagements,
    previousTotals.contentViews,
  );

  const kpis: DashboardKpi[] = [
    {
      key: "newLeads",
      label: "Nuevos leads",
      value: currentTotals.leadsNew,
      previousValue: previousTotals.leadsNew,
      deltaPercentage: deltaPercentage(
        currentTotals.leadsNew,
        previousTotals.leadsNew,
      ),
      format: "number",
    },
    {
      key: "bookedCalls",
      label: "Llamadas agendadas",
      value: currentTotals.appointmentsBooked,
      previousValue: previousTotals.appointmentsBooked,
      deltaPercentage: deltaPercentage(
        currentTotals.appointmentsBooked,
        previousTotals.appointmentsBooked,
      ),
      format: "number",
    },
    {
      key: "closedCalls",
      label: "Llamadas cerradas",
      value: currentTotals.appointmentsClosed,
      previousValue: previousTotals.appointmentsClosed,
      deltaPercentage: deltaPercentage(
        currentTotals.appointmentsClosed,
        previousTotals.appointmentsClosed,
      ),
      format: "number",
    },
    {
      key: "conversionToCall",
      label: "Conversión lead → llamada",
      value: conversionCurrent,
      previousValue: conversionPrevious,
      deltaPercentage: deltaPercentage(conversionCurrent, conversionPrevious),
      format: "percentage",
    },
    {
      key: "engagementRate",
      label: "Engagement de contenido",
      value: engagementCurrent,
      previousValue: engagementPrevious,
      deltaPercentage: deltaPercentage(engagementCurrent, engagementPrevious),
      format: "percentage",
    },
  ];

  const series: DashboardSeriesPoint[] = currentRows.map((row) => ({
    date: toIsoDate(row.date),
    leadsNew: row.leadsNew,
    leadsConversando: row.leadsConversando,
    leadsLinkEnviado: row.leadsLinkEnviado,
    leadsAgendado: row.leadsAgendado,
    leadsFrio: row.leadsFrio,
    messagesInbound: row.messagesInbound,
    messagesOutbound: row.messagesOutbound,
    appointmentsBooked: row.appointmentsBooked,
    appointmentsClosed: row.appointmentsClosed,
    contentViews: row.contentViews,
    contentEngagements: row.contentEngagements,
  }));

  const latestRow = currentRows[currentRows.length - 1];
  const stageBreakdown: StageBreakdownPoint[] = latestRow
    ? [
        { stage: "Conversando", count: latestRow.leadsConversando },
        { stage: "Link enviado", count: latestRow.leadsLinkEnviado },
        { stage: "Agendado", count: latestRow.leadsAgendado },
        { stage: "Frío", count: latestRow.leadsFrio },
      ]
    : [];

  const topContentRecords = await prisma.contentAssetMetric.findMany({
    where: { clientId },
    orderBy: [{ leadsGenerated: "desc" }, { views: "desc" }],
    take: 8,
  });

  const topContent: TopContentRow[] = topContentRecords.map((row) => ({
    assetId: row.assetId,
    title: row.title,
    platform: row.platform,
    views: toInt(row.views),
    leadsGenerated: toInt(row.leadsGenerated),
    publishedAt: toIsoDate(row.publishedAt),
  }));

  return {
    rangeDays,
    generatedAt: new Date().toISOString(),
    kpis,
    series,
    stageBreakdown,
    topContent,
  };
}
