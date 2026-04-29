import { getSession } from "@/lib/auth";

export const HEYGEN_API_BASE = "https://api.heygen.com";

type UnknownRecord = Record<string, unknown>;

export class HeygenApiError extends Error {
  status: number;
  path: string;
  responseBody: unknown;

  constructor(opts: { message: string; status: number; path: string; responseBody: unknown }) {
    super(opts.message);
    this.name = "HeygenApiError";
    this.status = opts.status;
    this.path = opts.path;
    this.responseBody = opts.responseBody;
  }
}

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
    throw new HeygenApiError({
      message,
      status: response.status,
      path,
      responseBody: json,
    });
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

export function extractHeygenSessionId(payload: unknown): string | null {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const candidates = [
    record?.session_id,
    data?.session_id,
    data?.sessionId,
    record?.sessionId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function extractHeygenCallbackId(payload: unknown): string | null {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const candidates = [
    record?.callback_id,
    data?.callback_id,
    data?.callbackId,
    record?.callbackId,
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
  const dataRaw = record?.data;
  const data = asRecord(dataRaw);

  // v3 (as provided): { data: [ { id, name, preview_image_url, preview_video_url, gender, default_voice_id, ... } ], has_more, next_token }
  if (Array.isArray(dataRaw)) {
    return dataRaw
      .map((itemValue: unknown) => {
        const item = asRecord(itemValue);
        const id = typeof item?.id === "string" ? item.id : "";
        if (!id) return null;
        const avatar: HeygenAvatar = {
          id,
          name: typeof item?.name === "string" ? item.name : "Avatar",
          gender: typeof item?.gender === "string" ? item.gender : null,
          previewImageUrl:
            typeof item?.preview_image_url === "string" ? item.preview_image_url : null,
          previewVideoUrl:
            typeof item?.preview_video_url === "string" ? item.preview_video_url : null,
          defaultVoiceId:
            typeof item?.default_voice_id === "string" ? item.default_voice_id : null,
          premium: false as boolean,
          type: null,
          tags: [] as string[],
        };
        return avatar;
      })
      .filter((avatar): avatar is HeygenAvatar => avatar !== null);
  }

  // v3: avatar groups → looks (flatten to list)
  const v3GroupsCandidates = [
    (data?.avatar_groups as unknown),
    (data?.avatarGroups as unknown),
    (data?.groups as unknown),
    (data?.items as unknown),
  ];
  const v3Groups = v3GroupsCandidates.find(Array.isArray) as unknown[] | undefined;

  if (v3Groups && v3Groups.length > 0) {
    const flattened: HeygenAvatar[] = [];
    for (const groupValue of v3Groups) {
      const group = asRecord(groupValue);
      const groupName = typeof group?.name === "string" ? group.name : null;
      const looksCandidates = [
        group?.looks,
        group?.avatar_looks,
        group?.look_list,
        group?.avatars,
      ];
      const looks = looksCandidates.find(Array.isArray) as unknown[] | undefined;
      if (!looks || looks.length === 0) continue;

      for (const lookValue of looks) {
        const look = asRecord(lookValue);
        const id =
          (typeof look?.avatar_id === "string" && look.avatar_id) ||
          (typeof look?.id === "string" && look.id) ||
          "";
        if (!id) continue;

        const name =
          (typeof look?.name === "string" && look.name) ||
          (typeof look?.avatar_name === "string" && look.avatar_name) ||
          (groupName ? `${groupName} look` : "Avatar look");

        const previewImageUrl =
          (typeof look?.preview_image_url === "string" && look.preview_image_url) ||
          (typeof look?.image_url === "string" && look.image_url) ||
          null;

        const previewVideoUrl =
          (typeof look?.preview_video_url === "string" && look.preview_video_url) ||
          (typeof look?.motion_preview_url === "string" && look.motion_preview_url) ||
          null;

        const defaultVoiceId =
          (typeof look?.default_voice_id === "string" && look.default_voice_id) ||
          (typeof group?.default_voice_id === "string" && group.default_voice_id) ||
          null;

        flattened.push({
          id,
          name,
          gender: typeof look?.gender === "string" ? look.gender : null,
          previewImageUrl,
          previewVideoUrl,
          defaultVoiceId,
          premium: Boolean(look?.premium ?? group?.premium),
          type: typeof group?.group_type === "string" ? group.group_type : null,
          tags: [],
        });
      }
    }

    // Deduplicate by id (some looks may appear in multiple groups)
    const byId = new Map<string, HeygenAvatar>();
    for (const item of flattened) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    return Array.from(byId.values());
  }

  // v2 fallback: /v2/avatars → data.avatars
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

