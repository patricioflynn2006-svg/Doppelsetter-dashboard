import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertClientBySlug, verifyIngestionKey } from "@/lib/dashboard";

export const runtime = "nodejs";

type IngestPayload = {
  client?: {
    slug?: string;
    name?: string;
    timezone?: string;
  };
  source?: {
    workflow?: string;
    instance?: string;
  };
  capturedAt?: string;
  idempotencyKey?: string;
  summary?: Record<string, unknown>;
  daily?: Array<Record<string, unknown>>;
  contentAssets?: Array<Record<string, unknown>>;
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

function parseDate(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || !value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed);
}

function toRate(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed > 1 && parsed <= 100) {
    return parsed / 100;
  }

  return parsed;
}

function toText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function extractMetric(data: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    if (key in data) {
      return toNumber(data[key]);
    }
  }

  return 0;
}

function extractRate(data: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (key in data) {
      return toRate(data[key]);
    }
  }

  return null;
}

function buildIdempotencyKey(
  payload: IngestPayload,
  clientSlug: string,
  capturedAt: string,
): string {
  if (payload.idempotencyKey && payload.idempotencyKey.trim().length > 0) {
    return payload.idempotencyKey.trim();
  }

  const digest = createHash("sha1")
    .update(`${clientSlug}-${capturedAt}-${JSON.stringify(payload.daily ?? [])}`)
    .digest("hex");
  return `${clientSlug}-${digest}`;
}

function mapDailyMetric(
  clientId: string,
  rawDay: Record<string, unknown>,
  fallbackDate: Date,
) {
  const dayDate = toDateOnly(parseDate(rawDay.date, fallbackDate));
  const leadsNew = extractMetric(rawDay, ["leadsNew", "leads_new", "nuevos_leads"]);
  const leadsConversando = extractMetric(rawDay, [
    "leadsConversando",
    "leads_conversando",
    "conversando",
  ]);
  const leadsLinkEnviado = extractMetric(rawDay, [
    "leadsLinkEnviado",
    "leads_link_enviado",
    "link_enviado",
  ]);
  const leadsAgendado = extractMetric(rawDay, [
    "leadsAgendado",
    "leads_agendado",
    "agendado",
  ]);
  const leadsFrio = extractMetric(rawDay, ["leadsFrio", "leads_frio", "frio"]);

  return {
    clientId,
    date: dayDate,
    leadsNew,
    leadsConversando,
    leadsLinkEnviado,
    leadsAgendado,
    leadsFrio,
    qualificationRate: extractRate(rawDay, [
      "qualificationRate",
      "qualification_rate",
    ]),
    messagesInbound: extractMetric(rawDay, [
      "messagesInbound",
      "messages_inbound",
      "inbound_messages",
    ]),
    messagesOutbound: extractMetric(rawDay, [
      "messagesOutbound",
      "messages_outbound",
      "outbound_messages",
    ]),
    appointmentsBooked: extractMetric(rawDay, [
      "appointmentsBooked",
      "appointments_booked",
      "calls_booked",
      "agendadas",
    ]),
    appointmentsAttended: extractMetric(rawDay, [
      "appointmentsAttended",
      "appointments_attended",
      "calls_attended",
      "atendidas",
    ]),
    appointmentsClosed: extractMetric(rawDay, [
      "appointmentsClosed",
      "appointments_closed",
      "calls_closed",
      "cerradas",
    ]),
    contentViews: extractMetric(rawDay, [
      "contentViews",
      "content_views",
      "views",
    ]),
    contentEngagements: extractMetric(rawDay, [
      "contentEngagements",
      "content_engagements",
      "engagements",
    ]),
    contentLeads: extractMetric(rawDay, [
      "contentLeads",
      "content_leads",
      "content_generated_leads",
    ]),
  };
}

export async function POST(request: NextRequest) {
  let payload: IngestPayload;

  try {
    payload = (await request.json()) as IngestPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON inválido" },
      { status: 400 },
    );
  }

  const clientSlugRaw =
    request.headers.get("x-client-slug") ?? payload.client?.slug ?? "";
  const clientSlug = clientSlugRaw.trim().toLowerCase();
  if (!clientSlug) {
    return NextResponse.json(
      { ok: false, error: "Falta client slug" },
      { status: 400 },
    );
  }

  const client = await upsertClientBySlug({
    slug: clientSlug,
    name: payload.client?.name,
    timezone: payload.client?.timezone,
  });

  const providedKey = request.headers.get("x-ingest-key");
  const authorized = await verifyIngestionKey(client.id, providedKey);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: "No autorizado para ingestión" },
      { status: 401 },
    );
  }

  const capturedAtDate = parseDate(payload.capturedAt, new Date());
  const capturedAt = capturedAtDate.toISOString();
  const idempotencyKey =
    request.headers.get("x-idempotency-key")?.trim() ||
    buildIdempotencyKey(payload, client.slug, capturedAt);

  try {
    const ingestionResult = await prisma.$transaction(async (transaction) => {
      await transaction.ingestionRun.create({
        data: {
          clientId: client.id,
          idempotencyKey,
          sourceWorkflow: payload.source?.workflow,
          sourceInstance: payload.source?.instance,
          capturedAt: capturedAtDate,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      let ingestedDays = 0;
      const summaryDate = toDateOnly(capturedAtDate);
      const dailyRows = Array.isArray(payload.daily) ? payload.daily : [];

      if (dailyRows.length > 0) {
        for (const rawDay of dailyRows) {
          const mapped = mapDailyMetric(client.id, rawDay, summaryDate);
          await transaction.clientDailyMetric.upsert({
            where: {
              clientId_date: {
                clientId: client.id,
                date: mapped.date,
              },
            },
            update: {
              leadsNew: mapped.leadsNew,
              leadsConversando: mapped.leadsConversando,
              leadsLinkEnviado: mapped.leadsLinkEnviado,
              leadsAgendado: mapped.leadsAgendado,
              leadsFrio: mapped.leadsFrio,
              qualificationRate: mapped.qualificationRate,
              messagesInbound: mapped.messagesInbound,
              messagesOutbound: mapped.messagesOutbound,
              appointmentsBooked: mapped.appointmentsBooked,
              appointmentsAttended: mapped.appointmentsAttended,
              appointmentsClosed: mapped.appointmentsClosed,
              contentViews: mapped.contentViews,
              contentEngagements: mapped.contentEngagements,
              contentLeads: mapped.contentLeads,
            },
            create: mapped,
          });
          ingestedDays += 1;
        }
      } else if (payload.summary) {
        const mapped = mapDailyMetric(client.id, payload.summary, summaryDate);
        await transaction.clientDailyMetric.upsert({
          where: {
            clientId_date: {
              clientId: client.id,
              date: mapped.date,
            },
          },
          update: {
            leadsNew: mapped.leadsNew,
            leadsConversando: mapped.leadsConversando,
            leadsLinkEnviado: mapped.leadsLinkEnviado,
            leadsAgendado: mapped.leadsAgendado,
            leadsFrio: mapped.leadsFrio,
            qualificationRate: mapped.qualificationRate,
            messagesInbound: mapped.messagesInbound,
            messagesOutbound: mapped.messagesOutbound,
            appointmentsBooked: mapped.appointmentsBooked,
            appointmentsAttended: mapped.appointmentsAttended,
            appointmentsClosed: mapped.appointmentsClosed,
            contentViews: mapped.contentViews,
            contentEngagements: mapped.contentEngagements,
            contentLeads: mapped.contentLeads,
          },
          create: mapped,
        });
        ingestedDays = 1;
      }

      let ingestedAssets = 0;
      const contentAssets = Array.isArray(payload.contentAssets)
        ? payload.contentAssets
        : [];

      for (const rawAsset of contentAssets) {
        const assetId = toText(
          rawAsset.assetId,
          createHash("sha1").update(JSON.stringify(rawAsset)).digest("hex").slice(0, 16),
        );

        await transaction.contentAssetMetric.upsert({
          where: {
            clientId_assetId: {
              clientId: client.id,
              assetId,
            },
          },
          update: {
            title: toText(rawAsset.title, "Contenido sin título"),
            platform: toText(rawAsset.platform, "Desconocido"),
            publishedAt: parseDate(rawAsset.publishedAt, capturedAtDate),
            views: toNumber(rawAsset.views),
            likes: toNumber(rawAsset.likes),
            comments: toNumber(rawAsset.comments),
            shares: toNumber(rawAsset.shares),
            saves: toNumber(rawAsset.saves),
            leadsGenerated: toNumber(rawAsset.leadsGenerated),
          },
          create: {
            clientId: client.id,
            assetId,
            title: toText(rawAsset.title, "Contenido sin título"),
            platform: toText(rawAsset.platform, "Desconocido"),
            publishedAt: parseDate(rawAsset.publishedAt, capturedAtDate),
            views: toNumber(rawAsset.views),
            likes: toNumber(rawAsset.likes),
            comments: toNumber(rawAsset.comments),
            shares: toNumber(rawAsset.shares),
            saves: toNumber(rawAsset.saves),
            leadsGenerated: toNumber(rawAsset.leadsGenerated),
          },
        });

        ingestedAssets += 1;
      }

      return {
        ingestedDays,
        ingestedAssets,
      };
    });

    return NextResponse.json({
      ok: true,
      duplicate: false,
      clientSlug: client.slug,
      ...ingestionResult,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        clientSlug: client.slug,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Error interno de ingestión" },
      { status: 500 },
    );
  }
}
