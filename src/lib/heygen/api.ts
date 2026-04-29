import { getSession } from "@/lib/auth";

export const HEYGEN_API_BASE = "https://api.heygen.com";

type UnknownRecord = Record<string, unknown>;

export type HeygenAvatar = {
  id: string;
  name: string;
  gender: string | null;
  previewImageUrl: string | null;
  previewVideoUrl: string | null;
  defaultVoiceId: string | null;
  premium: boolean;
  type: string | null;
  tags: string[];
};

export type HeygenVoice = {
  id: string;
  name: string;
  language: string | null;
  gender: string | null;
  previewAudioUrl: string | null;
  supportsLocale: boolean;
  supportsPause: boolean;
  supportsEmotion: boolean;
  supportsInteractiveAvatar: boolean;
};

export function requireHeygenApiKey(): string {
  const apiKey = process.env.HEYGEN_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("HEYGEN_API_KEY is not set");
  }
  return apiKey;
}

export function requireAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set");
  }
  return appUrl.replace(/\/$/, "");
}

export async function requireCompanySession() {
  const session = await getSession();
  if (!session?.companyId) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function heygenAssetKey(companyId: string, jobId: string): string {
  return `assets/${companyId}/heygen/${jobId}.mp4`;
}

export async function heygenFetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const apiKey = requireHeygenApiKey();
  const response = await fetch(`${HEYGEN_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const json = (await response.json().catch(() => ({}))) as T & {
    error?: unknown;
    message?: unknown;
    msg?: unknown;
  };

  if (!response.ok) {
    const message =
      (typeof json?.error === "string" && json.error) ||
      (typeof json?.message === "string" && json.message) ||
      (typeof json?.msg === "string" && json.msg) ||
      `HeyGen request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return json;
}

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

export function extractHeygenVideoId(payload: unknown): string | null {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const candidates = [
    record?.video_id,
    data?.video_id,
    data?.id,
    data?.videoId,
    record?.videoId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function extractHeygenStatus(payload: unknown): string | null {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const candidates = [
    record?.status,
    data?.status,
    data?.video_status,
    data?.state,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
}

export function extractHeygenDownloadUrl(payload: unknown): string | null {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const candidates = [
    record?.download_url,
    data?.download_url,
    data?.video_url,
    data?.url,
    record?.url,
    record?.video_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function extractHeygenThumbnailUrl(payload: unknown): string | null {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const candidates = [
    record?.thumbnail_url,
    data?.thumbnail_url,
    data?.thumbnail,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function normalizeHeygenAvatars(payload: unknown): HeygenAvatar[] {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const avatars = Array.isArray(data?.avatars) ? data.avatars : [];
  return avatars
    .map((avatarValue: unknown) => {
      const avatar = asRecord(avatarValue);
      return {
        id: typeof avatar?.avatar_id === "string" ? avatar.avatar_id : "",
        name: typeof avatar?.avatar_name === "string" ? avatar.avatar_name : "Unnamed avatar",
        gender: typeof avatar?.gender === "string" ? avatar.gender : null,
        previewImageUrl:
          typeof avatar?.preview_image_url === "string" ? avatar.preview_image_url : null,
        previewVideoUrl:
          typeof avatar?.preview_video_url === "string" ? avatar.preview_video_url : null,
        defaultVoiceId:
          typeof avatar?.default_voice_id === "string" ? avatar.default_voice_id : null,
        premium: Boolean(avatar?.premium),
        type: typeof avatar?.type === "string" ? avatar.type : null,
        tags: Array.isArray(avatar?.tags)
          ? avatar.tags.filter((tag: unknown): tag is string => typeof tag === "string")
          : [],
      };
    })
    .filter((avatar: HeygenAvatar) => avatar.id);
}

export function normalizeHeygenVoices(payload: unknown): HeygenVoice[] {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const voices = Array.isArray(data?.voices) ? data.voices : [];
  return voices
    .map((voiceValue: unknown) => {
      const voice = asRecord(voiceValue);
      return {
        id: typeof voice?.voice_id === "string" ? voice.voice_id : "",
        name: typeof voice?.name === "string" ? voice.name : "Unnamed voice",
        language: typeof voice?.language === "string" ? voice.language : null,
        gender: typeof voice?.gender === "string" ? voice.gender : null,
        previewAudioUrl:
          typeof voice?.preview_audio === "string" && voice.preview_audio.trim()
            ? voice.preview_audio
            : null,
        supportsLocale: Boolean(voice?.support_locale),
        supportsPause: Boolean(voice?.support_pause),
        supportsEmotion: Boolean(voice?.emotion_support),
        supportsInteractiveAvatar: Boolean(voice?.support_interactive_avatar),
      };
    })
    .filter((voice: HeygenVoice) => voice.id);
}

