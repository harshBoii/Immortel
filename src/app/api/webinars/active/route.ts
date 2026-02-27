import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ActiveWebinarState = "LIVE" | "UPCOMING" | "NONE";

function parseRecurringWindow(recurringTime: string | null): { startMinutes: number; endMinutes: number } | null {
  if (!recurringTime) return null;

  // Handle special 24x7 case
  if (recurringTime === "24x7") {
    return { startMinutes: 0, endMinutes: 24 * 60 };
  }

  const [startRaw, endRaw] = recurringTime.split("-");
  if (!startRaw || !endRaw) return null;

  const [sh, sm] = startRaw.split(":").map(Number);
  const [eh, em] = endRaw.split(":").map(Number);
  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  ) {
    return null;
  }

  return { startMinutes: sh * 60 + sm, endMinutes: eh * 60 + em };
}

function getMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function computeOffsetSeconds(
  now: Date,
  start: Date | null,
  durationSeconds: number | null
): number {
  if (!start || !durationSeconds || durationSeconds <= 0) return 0;
  const diffMs = now.getTime() - start.getTime();
  const rawSeconds = Math.floor(diffMs / 1000);
  if (rawSeconds <= 0) return 0;
  if (rawSeconds >= durationSeconds) {
    return Math.max(0, durationSeconds - 5);
  }
  return rawSeconds;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    // Optional preview mode for testing without auth
    const url = new URL(request.url);
    const isPreview = url.searchParams.get("preview") === "1";

    if (!session?.companyId && !isPreview) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const companyId = session?.companyId ?? undefined;

    const webinars = await prisma.webinar.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        status: { in: ["SCHEDULED", "LIVE"] },
      },
      include: {
        asset: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!webinars.length) {
      return NextResponse.json({
        success: true,
        data: {
          state: "NONE" as ActiveWebinarState,
          webinar: null,
          offsetSeconds: 0,
        },
      });
    }

    const now = new Date();
    const nowMinutes = getMinutesSinceMidnight(now);

    type Candidate = {
      webinar: (typeof webinars)[number];
      state: ActiveWebinarState;
      offsetSeconds: number;
      startsAt: Date | null;
    };

    const candidates: Candidate[] = webinars.map((webinar) => {
      const assetDuration = webinar.asset?.duration ?? null;

      let startsAt: Date | null = null;
      let state: ActiveWebinarState = "NONE";
      let offsetSeconds = 0;

      if (webinar.isRecurring) {
        if (webinar.recurringDayOfWeek === "ALL" && webinar.recurringTime === "24x7") {
          // 24x7 streams are always live. Start from a random timestamp to vary the experience.
          const effectiveDuration = assetDuration && assetDuration > 0 ? assetDuration : 3600;
          offsetSeconds = Math.floor(Math.random() * effectiveDuration);
          state = "LIVE";
          startsAt = new Date(now);
        } else {
          const window = parseRecurringWindow(webinar.recurringTime);
          const dayNames = webinar.recurringDayOfWeek?.split(",") ?? [];
          const todayName = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][now.getDay()];

          if (window && dayNames.includes(todayName)) {
            const isWithin =
              nowMinutes >= window.startMinutes && nowMinutes <= window.endMinutes;

            const startToday = new Date(now);
            startToday.setHours(Math.floor(window.startMinutes / 60), window.startMinutes % 60, 0, 0);
            startsAt = startToday;

            if (isWithin) {
              state = "LIVE";
              offsetSeconds = computeOffsetSeconds(now, startToday, assetDuration);
            } else if (nowMinutes < window.startMinutes) {
              state = "UPCOMING";
              offsetSeconds = 0;
            } else {
              // Today's window passed; treat as none for the rest of the day
              state = "NONE";
            }
          }
        }
      } else if (webinar.scheduledAt) {
        const startDate = webinar.scheduledAt;
        const endsAt = assetDuration
          ? new Date(startDate.getTime() + assetDuration * 1000)
          : null;

        startsAt = startDate;

        if (now < startDate) {
          state = "UPCOMING";
          offsetSeconds = 0;
        } else if (!endsAt || now <= endsAt) {
          state = "LIVE";
          offsetSeconds = computeOffsetSeconds(now, startDate, assetDuration);
        } else {
          state = "NONE";
        }
      }

      return {
        webinar,
        state,
        offsetSeconds,
        startsAt,
      };
    });

    // Prefer LIVE webinars, then UPCOMING nearest in time
    const liveCandidates = candidates.filter((c) => c.state === "LIVE");
    let chosen: Candidate | null = null;

    if (liveCandidates.length) {
      liveCandidates.sort((a, b) => {
        const aStart = a.startsAt?.getTime() ?? 0;
        const bStart = b.startsAt?.getTime() ?? 0;
        return bStart - aStart;
      });
      chosen = liveCandidates[0];
    } else {
      const upcomingCandidates = candidates.filter(
        (c) => c.state === "UPCOMING" && c.startsAt && c.startsAt > now
      );
      upcomingCandidates.sort((a, b) => {
        const aDiff = (a.startsAt?.getTime() ?? 0) - now.getTime();
        const bDiff = (b.startsAt?.getTime() ?? 0) - now.getTime();
        return aDiff - bDiff;
      });
      chosen = upcomingCandidates[0] ?? null;
    }

    if (!chosen) {
      return NextResponse.json({
        success: true,
        data: {
          state: "NONE" as ActiveWebinarState,
          webinar: null,
          offsetSeconds: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        state: chosen.state,
        webinar: {
          id: chosen.webinar.id,
          title: chosen.webinar.title,
          description: chosen.webinar.description,
          status: chosen.webinar.status,
          scheduledAt: chosen.webinar.scheduledAt,
          isRecurring: chosen.webinar.isRecurring,
          recurringDayOfWeek: chosen.webinar.recurringDayOfWeek,
          recurringTime: chosen.webinar.recurringTime,
          timeZone: chosen.webinar.timeZone,
          assetId: chosen.webinar.assetId,
        },
        offsetSeconds: chosen.offsetSeconds,
      },
    });
  } catch (error) {
    console.error("[WEBINARS ACTIVE GET]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

