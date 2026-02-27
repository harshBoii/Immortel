import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const defaultChatScript = {
  messages: [
    {
      id: "m1",
      author: "Andrea (Immortel)",
      role: "attendee" as const,
      text: "Hi Alex, excited to be here!",
      atSecond: 10,
    },
    {
      id: "m2",
      author: "Alex (Immortel)",
      role: "host" as const,
      text: "Hey Andrea! Welcome to the webinar, great to have you here! Feel free to ask any questions as we go along.",
      atSecond: 25,
    },
    {
      id: "m3",
      author: "Michael",
      role: "attendee" as const,
      text: "Hi everyone! Looking forward to this.",
      atSecond: 45,
    },
    {
      id: "m4",
      author: "Alex (Immortel)",
      role: "host" as const,
      text: "Hi Michael! Welcome board. Glad to have you here!",
      atSecond: 70,
    },
    {
      id: "m5",
      author: "David",
      role: "attendee" as const,
      text: "Great presentation so far!",
      atSecond: 120,
    },
    {
      id: "m6",
      author: "Katie",
      role: "attendee" as const,
      text: "Love the new features being showcased.",
      atSecond: 180,
    },
    {
      id: "m7",
      author: "Alex (Immortel)",
      role: "host" as const,
      text: "Thanks everyone for the kind words! Let's dive deeper.",
      atSecond: 210,
    },
    {
      id: "m8",
      author: "TB",
      role: "attendee" as const,
      text: "Can you show the integration demo?",
      atSecond: 280,
    },
    {
      id: "m9",
      author: "SH",
      role: "attendee" as const,
      text: "Impressive product lineup!",
      atSecond: 350,
    },
    {
      id: "m10",
      author: "Alex (Immortel)",
      role: "host" as const,
      text: "Sure TB! Coming up next. Stay tuned everyone.",
      atSecond: 400,
    },
  ],
};

const defaultParticipants = {
  participants: [
    { id: "p1", name: "Andrea", initials: "A", avatarColor: "#6366f1", hasAvatar: true, isMuted: false, isSpeaking: true },
    { id: "p2", name: "Michael", initials: "M", avatarColor: "#f97316", hasAvatar: false, isMuted: false, isSpeaking: false },
    { id: "p3", name: "David", initials: "D", avatarColor: "#8b5cf6", hasAvatar: false, isMuted: true, isSpeaking: false },
    { id: "p4", name: "TB", initials: "TB", avatarColor: "#3b82f6", hasAvatar: false, isMuted: true, isSpeaking: false },
    { id: "p5", name: "S", initials: "S", avatarColor: "#ef4444", hasAvatar: false, isMuted: true, isSpeaking: false },
    { id: "p6", name: "Katie", initials: "K", avatarColor: "#6366f1", hasAvatar: true, isMuted: true, isSpeaking: false },
    { id: "p7", name: "TB", initials: "TB", avatarColor: "#14b8a6", hasAvatar: false, isMuted: true, isSpeaking: false },
    { id: "p8", name: "JS", initials: "JS", avatarColor: "#f59e0b", hasAvatar: false, isMuted: true, isSpeaking: false },
    { id: "p9", name: "SH", initials: "SH", avatarColor: "#ec4899", hasAvatar: false, isMuted: true, isSpeaking: false },
  ],
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const webinar = await prisma.webinar.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
      include: {
        asset: true,
      },
    });

    if (!webinar) {
      return NextResponse.json(
        { success: false, error: "Webinar not found" },
        { status: 404 }
      );
    }

    const asset = webinar.asset;

    return NextResponse.json({
      success: true,
      data: {
        webinar: {
          id: webinar.id,
          title: webinar.title,
          description: webinar.description,
          status: webinar.status,
          scheduledAt: webinar.scheduledAt,
          isRecurring: webinar.isRecurring,
          recurringDayOfWeek: webinar.recurringDayOfWeek,
          recurringTime: webinar.recurringTime,
          timeZone: webinar.timeZone,
          assetId: webinar.assetId,
        },
        asset: asset
          ? {
              id: asset.id,
              title: asset.title,
              duration: asset.duration,
              playbackUrl: asset.playbackUrl,
              thumbnailUrl: asset.thumbnailUrl,
            }
          : null,
        simulated: {
          chatScript: defaultChatScript,
          participants: defaultParticipants,
        },
      },
    });
  } catch (error) {
    console.error("[WEBINARS ID GET]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
