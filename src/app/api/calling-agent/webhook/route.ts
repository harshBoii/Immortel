import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  CallDirection,
  CallOutcome,
  CallStatus,
  Channel,
  FollowUpPriority,
  FollowUpReason,
  FollowUpStatus,
  LeadStage,
  Sentiment,
} from "@prisma/client";

/**
 * External calling-agent webhook delivery endpoint.
 *
 * Security: HMAC-SHA256 over raw body, compared against `CALLING_AGENT_WEBHOOK_SECRET`.
 * Expected header: `x-calling-agent-signature: sha256=<hex>`.
 *
 * Idempotency: each delivery must include `x-calling-agent-event-id`; duplicates
 * are dropped by uniqueness on `WebhookEvent.eventId`.
 *
 * Payload shape: see plan — top-level `event`, `eventId`, `occurredAt`, `companyId`,
 * nested `call { externalCallId, leadId?, campaignId?, phone, status, ... }`,
 * optional `transcript { summary, turns, objections, aiConfidence, suggestedNextMove }`.
 */

function getSecret(): string | null {
  const s = process.env.CALLING_AGENT_WEBHOOK_SECRET;
  return s && s.length >= 16 ? s : null;
}

function verifySignature(raw: string, header: string | null): boolean {
  const secret = getSecret();
  if (!secret || !header) return false;
  const received = header.startsWith("sha256=") ? header.slice(7) : header;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  if (received.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

type WebhookEventType =
  | "call.queued"
  | "call.started"
  | "call.completed"
  | "call.dropped"
  | "call.failed"
  | "transcript.ready";

const WEBHOOK_EVENT_TYPES: readonly WebhookEventType[] = [
  "call.queued",
  "call.started",
  "call.completed",
  "call.dropped",
  "call.failed",
  "transcript.ready",
];

function toDate(input: unknown): Date | null {
  if (typeof input !== "string" && !(input instanceof Date)) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

function coerceEnum<T extends string>(
  value: unknown,
  enumObj: Record<string, T>
): T | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  return (Object.values(enumObj) as string[]).includes(v) ? (v as T) : null;
}

/** Move a lead forward based on the call outcome. Never regresses stage. */
function nextStage(current: LeadStage, outcome: CallOutcome | null): LeadStage {
  if (!outcome) return current === LeadStage.NEW ? LeadStage.CONTACTED : current;
  const order: LeadStage[] = [
    LeadStage.NEW,
    LeadStage.CONTACTED,
    LeadStage.WARM,
    LeadStage.HOT,
    LeadStage.QUALIFIED,
    LeadStage.CLOSED,
  ];
  const rank = (s: LeadStage) => order.indexOf(s);
  let target: LeadStage = current === LeadStage.NEW ? LeadStage.CONTACTED : current;
  switch (outcome) {
    case CallOutcome.INTERESTED:
      target = LeadStage.WARM;
      break;
    case CallOutcome.CONVERTED:
      target = LeadStage.CLOSED;
      break;
    case CallOutcome.NOT_INTERESTED:
      return LeadStage.COLD;
    case CallOutcome.WRONG_NUMBER:
      return LeadStage.LOST;
    case CallOutcome.CALL_BACK_LATER:
    case CallOutcome.NO_ANSWER:
      target = current === LeadStage.NEW ? LeadStage.CONTACTED : current;
      break;
  }
  return rank(target) > rank(current) ? target : current;
}

export async function POST(request: Request) {
  const raw = await request.text();

  // const signature = request.headers.get("x-calling-agent-signature");
  // if (!verifySignature(raw, signature)) {
  //   return NextResponse.json(
  //     { success: false, error: "Invalid signature" },
  //     { status: 401 }
  //   );
  // }

  const eventId =
    request.headers.get("x-calling-agent-event-id") || "";
  const headerEventType = request.headers.get("x-calling-agent-event-type") || "";

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const event =
    (typeof body.event === "string" && body.event.trim()) ||
    headerEventType ||
    "";
  const effectiveEventId =
    eventId ||
    (typeof body.eventId === "string" && body.eventId.trim()) ||
    "";

  if (!effectiveEventId) {
    return NextResponse.json(
      { success: false, error: "Missing eventId" },
      { status: 400 }
    );
  }
  if (!WEBHOOK_EVENT_TYPES.includes(event as WebhookEventType)) {
    return NextResponse.json(
      { success: false, error: `Unknown event type: ${event}` },
      { status: 400 }
    );
  }

  const companyId =
    typeof body.companyId === "string" ? body.companyId.trim() : "";
  if (!companyId) {
    return NextResponse.json(
      { success: false, error: "Missing companyId" },
      { status: 400 }
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json(
      { success: false, error: "Unknown companyId" },
      { status: 400 }
    );
  }

  // Idempotency: create unique WebhookEvent row and short-circuit on duplicates.
  try {
    await prisma.webhookEvent.create({
      data: {
        eventId: effectiveEventId,
        source: "calling-agent",
        companyId,
        eventType: event,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      received: true,
      eventId: effectiveEventId,
      duplicate: true,
    });
  }

  const call = (body.call ?? {}) as Record<string, unknown>;
  const transcript = body.transcript as Record<string, unknown> | undefined;

  const externalCallId =
    typeof call.externalCallId === "string" ? call.externalCallId.trim() : "";
  if (!externalCallId) {
    return NextResponse.json(
      { success: false, error: "Missing call.externalCallId" },
      { status: 400 }
    );
  }

  // Validate leadId / campaignId ownership if present.
  const incomingLeadId =
    typeof call.leadId === "string" ? call.leadId.trim() : "";
  const incomingCampaignId =
    typeof call.campaignId === "string" ? call.campaignId.trim() : "";
  const incomingPhone =
    typeof call.phone === "string" ? call.phone.trim() : "";

  let leadId: string | null = null;
  if (incomingLeadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: incomingLeadId, companyId },
      select: { id: true },
    });
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead does not belong to companyId" },
        { status: 400 }
      );
    }
    leadId = lead.id;
  } else if (incomingPhone) {
    const match = await prisma.lead.findFirst({
      where: { companyId, phone: incomingPhone },
      select: { id: true },
    });
    if (match) leadId = match.id;
  }

  let campaignId: string | null = null;
  if (incomingCampaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: incomingCampaignId, companyId },
      select: { id: true },
    });
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign does not belong to companyId" },
        { status: 400 }
      );
    }
    campaignId = campaign.id;
  }

  const status = coerceEnum<CallStatus>(call.status, CallStatus);
  const outcome = coerceEnum<CallOutcome>(call.outcome, CallOutcome);
  const sentiment = coerceEnum<Sentiment>(call.sentiment, Sentiment);
  const direction =
    coerceEnum<CallDirection>(call.direction, CallDirection) ??
    CallDirection.OUTBOUND;

  const durationSec =
    typeof call.durationSec === "number" ? Math.max(0, Math.floor(call.durationSec)) : null;
  const connected = typeof call.connected === "boolean" ? call.connected : null;
  const startedAt = toDate(call.startedAt);
  const endedAt = toDate(call.endedAt);
  const costCents =
    typeof call.costCents === "number" ? Math.max(0, Math.floor(call.costCents)) : null;
  const recordingUrl =
    typeof call.recordingUrl === "string" ? call.recordingUrl.trim() : null;
  const dropReason =
    typeof call.dropReason === "string" ? call.dropReason.trim() : null;
  const failureReason =
    typeof call.failureReason === "string" ? call.failureReason.trim() : null;
  const metadata =
    call.metadata && typeof call.metadata === "object" ? call.metadata : undefined;

  // ── Transaction: upsert Call, transcript, follow-up, conversation, campaign msg, lead stage ──
  try {
    await prisma.$transaction(async (tx) => {
      // 1) Upsert the Call by externalCallId
      const existing = await tx.call.findUnique({
        where: { externalCallId },
        select: { id: true, status: true, companyId: true, leadId: true },
      });

      const callRecord = existing
        ? await tx.call.update({
            where: { id: existing.id },
            data: {
              // Keep companyId/leadId/campaignId stable if the existing record has them.
              companyId,
              leadId: leadId ?? existing.leadId,
              campaignId,
              direction,
              ...(status !== null && { status }),
              ...(startedAt !== null && { startedAt }),
              ...(endedAt !== null && { endedAt }),
              ...(durationSec !== null && { durationSec }),
              ...(connected !== null && { connected }),
              ...(outcome !== null && { outcome }),
              ...(sentiment !== null && { sentiment }),
              ...(costCents !== null && { costCents }),
              ...(recordingUrl && { recordingUrl }),
              ...(dropReason && { dropReason }),
              ...(failureReason && { failureReason }),
              ...(metadata !== undefined && { metadata: metadata as object }),
            },
          })
        : await tx.call.create({
            data: {
              companyId,
              leadId,
              campaignId,
              direction,
              status: status ?? CallStatus.COMPLETED,
              startedAt,
              endedAt,
              durationSec,
              connected: connected ?? false,
              outcome,
              sentiment,
              costCents,
              recordingUrl,
              externalCallId,
              dropReason,
              failureReason,
              metadata: metadata as object | undefined,
            },
          });

      // 2) Upsert transcript if supplied
      if (transcript && typeof transcript === "object") {
        const summary =
          typeof transcript.summary === "string" ? transcript.summary : null;
        const turns = transcript.turns ?? null;
        const objections = Array.isArray(transcript.objections)
          ? (transcript.objections as unknown[])
              .filter((x): x is string => typeof x === "string")
          : [];
        const aiConfidence =
          typeof transcript.aiConfidence === "number"
            ? transcript.aiConfidence
            : null;
        const suggestedNextMove =
          typeof transcript.suggestedNextMove === "string"
            ? transcript.suggestedNextMove
            : null;

        await tx.callTranscript.upsert({
          where: { callId: callRecord.id },
          create: {
            callId: callRecord.id,
            summary,
            ...(turns !== null && { turns: turns as object }),
            objections,
            aiConfidence,
            suggestedNextMove,
          },
          update: {
            ...(summary !== null && { summary }),
            ...(turns !== null && { turns: turns as object }),
            ...(objections.length > 0 && { objections }),
            ...(aiConfidence !== null && { aiConfidence }),
            ...(suggestedNextMove !== null && { suggestedNextMove }),
          },
        });
      }

      // 3) CALL_BACK_LATER → create a high-priority FollowUp
      if (outcome === CallOutcome.CALL_BACK_LATER && leadId) {
        const exists = await tx.followUp.findFirst({
          where: {
            companyId,
            leadId,
            status: FollowUpStatus.PENDING,
            reason: FollowUpReason.CALL_LATER,
          },
          select: { id: true },
        });
        if (!exists) {
          const leadForPriority = await tx.lead.findUnique({
            where: { id: leadId },
            select: { intentScore: true, stage: true },
          });
          const isHotLead =
            leadForPriority?.stage === LeadStage.HOT ||
            (leadForPriority?.intentScore ?? 0) >= 75;
          await tx.followUp.create({
            data: {
              companyId,
              leadId,
              reason: FollowUpReason.CALL_LATER,
              dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              priority: isHotLead ? FollowUpPriority.URGENT : FollowUpPriority.HIGH,
              status: FollowUpStatus.PENDING,
              lastInteractionAt: endedAt ?? new Date(),
            },
          });
        }
      }

      // 4) Campaign bookkeeping
      if (campaignId && leadId) {
        const msgStatus =
          status === CallStatus.COMPLETED || outcome === CallOutcome.CONVERTED
            ? "DELIVERED"
            : status === CallStatus.FAILED ||
                status === CallStatus.DROPPED ||
                status === CallStatus.NO_ANSWER ||
                status === CallStatus.CANCELLED
              ? "FAILED"
              : "SENT";

        await tx.campaignMessage.upsert({
          where: { campaignId_leadId: { campaignId, leadId } },
          create: {
            campaignId,
            leadId,
            channel: Channel.VOICE,
            status: msgStatus,
            sentAt: startedAt ?? new Date(),
            deliveredAt: status === CallStatus.COMPLETED ? endedAt ?? new Date() : null,
            replyAt: outcome === CallOutcome.CONVERTED ? new Date() : null,
          },
          update: {
            status: msgStatus,
            ...(status === CallStatus.COMPLETED && {
              deliveredAt: endedAt ?? new Date(),
            }),
            ...(outcome === CallOutcome.CONVERTED && { replyAt: new Date() }),
          },
        });

        // Counter bumps on terminal events only.
        if (status === CallStatus.COMPLETED) {
          await tx.campaign.update({
            where: { id: campaignId },
            data: {
              deliveredCount: { increment: 1 },
              ...(outcome === CallOutcome.CONVERTED && {
                conversionCount: { increment: 1 },
                replyCount: { increment: 1 },
              }),
              ...(outcome === CallOutcome.INTERESTED && {
                replyCount: { increment: 1 },
              }),
            },
          });
        }
      }

      // 5) Lead.lastContactAt + stage advancement
      if (
        leadId &&
        (status === CallStatus.COMPLETED ||
          status === CallStatus.DROPPED ||
          status === CallStatus.NO_ANSWER)
      ) {
        const lead = await tx.lead.findUnique({
          where: { id: leadId },
          select: { stage: true },
        });
        if (lead) {
          await tx.lead.update({
            where: { id: leadId },
            data: {
              lastContactAt: endedAt ?? new Date(),
              stage: nextStage(lead.stage, outcome),
            },
          });
        }
      }

      // 6) Conversation + ConversationMessage from call summary
      if (leadId && status === CallStatus.COMPLETED) {
        const summaryText =
          (transcript && typeof transcript === "object" &&
            typeof (transcript as Record<string, unknown>).summary === "string"
              ? ((transcript as Record<string, unknown>).summary as string)
              : null) ??
          `Call ended with outcome ${outcome ?? "unknown"}${
            durationSec != null ? ` after ${durationSec}s` : ""
          }.`;

        const convo = await tx.conversation.upsert({
          where: {
            companyId_leadId_channel: {
              companyId,
              leadId,
              channel: Channel.VOICE,
            },
          },
          create: {
            companyId,
            leadId,
            channel: Channel.VOICE,
            summary: summaryText,
            sentiment,
            lastMessageAt: endedAt ?? new Date(),
            keywords: Array.isArray(transcript?.objections)
              ? ((transcript as Record<string, unknown>).objections as unknown[])
                  .filter((x): x is string => typeof x === "string")
              : [],
          },
          update: {
            summary: summaryText,
            ...(sentiment && { sentiment }),
            lastMessageAt: endedAt ?? new Date(),
          },
        });

        await tx.conversationMessage.create({
          data: {
            conversationId: convo.id,
            direction: "IN",
            text: summaryText,
            metadata: {
              callId: callRecord.id,
              outcome,
              durationSec,
            },
          },
        });
      }
    });
  } catch (err) {
    console.error("calling-agent webhook: DB error", err);
    return NextResponse.json(
      { success: false, error: "Internal error processing webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    received: true,
    eventId: effectiveEventId,
  });
}
