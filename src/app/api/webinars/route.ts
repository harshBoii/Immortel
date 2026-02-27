import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createWebinarSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assetId: z.string().optional(),
  schedule: z.enum(["24x7", "scheduled"]),
  type: z.enum(["recurring", "onetime"]).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
});

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createWebinarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      assetId,
      schedule,
      type,
      daysOfWeek,
      date,
      startTime,
      endTime,
      timezone = "IST",
    } = parsed.data;

    if (schedule === "scheduled" && type === "recurring" && (!daysOfWeek?.length || !startTime || !endTime)) {
      return NextResponse.json(
        { success: false, error: "Recurring schedule requires daysOfWeek, startTime, endTime" },
        { status: 400 }
      );
    }
    if (schedule === "scheduled" && type === "onetime" && (!date || !startTime || !endTime)) {
      return NextResponse.json(
        { success: false, error: "One-time schedule requires date, startTime, endTime" },
        { status: 400 }
      );
    }

    let scheduledAt: Date | null = null;
    let isRecurring = false;
    let recurringDayOfWeek: string | null = null;
    let recurringTime: string | null = null;

    if (schedule === "24x7") {
      isRecurring = true;
    // Clamp to column sizes: recurringDayOfWeek (VarChar(20)), recurringTime (VarChar(10))
    recurringDayOfWeek = "ALL";
    recurringTime = "24x7";
    } else if (schedule === "scheduled" && type === "recurring" && daysOfWeek?.length && startTime && endTime) {
      isRecurring = true;
    const joinedDays = daysOfWeek.map((d) => DAY_NAMES[d]).join(",");
    recurringDayOfWeek = joinedDays.slice(0, 20);
    const timeRange = `${startTime}-${endTime}`;
    recurringTime = timeRange.slice(0, 10);
    } else if (schedule === "scheduled" && type === "onetime" && date && startTime) {
      scheduledAt = new Date(`${date}T${startTime}:00`);
    }

    if (assetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: assetId, companyId: session.companyId },
      });
      if (!asset) {
        return NextResponse.json(
          { success: false, error: "Asset not found" },
          { status: 404 }
        );
      }
    }

    const webinar = await prisma.webinar.create({
      data: {
        title,
        description: description ?? null,
        assetId: assetId ?? null,
        companyId: session.companyId,
        scheduledAt,
        isRecurring,
        recurringDayOfWeek,
        recurringTime,
        timeZone: timezone,
        status: schedule === "24x7" ? "SCHEDULED" : "SCHEDULED",
      },
    });

    return NextResponse.json({ success: true, data: webinar });
  } catch (error) {
    console.error("[WEBINARS POST]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
