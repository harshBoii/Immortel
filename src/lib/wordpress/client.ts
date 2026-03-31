import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/wordpress/crypto";

type WordPressListResponse<T> = {
  data: T;
  total: number;
  pages: number;
};

export class WordPressClient {
  private base: string;
  private headers: Record<string, string>;

  constructor(siteUrl: string, base64Credentials: string) {
    const normalized = siteUrl.trim().replace(/\/+$/g, "");
    this.base = `${normalized}/wp-json/wp/v2`;
    this.headers = {
      Authorization: `Basic ${base64Credentials}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<WordPressListResponse<T>> {
    const res = await fetch(`${this.base}${path}`, {
      ...options,
      headers: { ...this.headers, ...(options.headers ?? {}) },
    });
    if (res.status === 401) throw new Error("WP_UNAUTHORIZED");
    if (!res.ok) throw new Error(`WP_ERROR:${res.status}`);
    return {
      data: (await res.json()) as T,
      total: parseInt(res.headers.get("X-WP-Total") ?? "0", 10),
      pages: parseInt(res.headers.get("X-WP-TotalPages") ?? "0", 10),
    };
  }

  getPosts(params: Record<string, string | number | boolean> = {}) {
    return this.request<any[]>(
      `/posts?${new URLSearchParams({ _embed: "true", ...params } as any)}`
    );
  }

  getPostBySlug(slug: string) {
    return this.request<any[]>(`/posts?slug=${encodeURIComponent(slug)}&_embed`);
  }

  getPages(params: Record<string, string | number | boolean> = {}) {
    return this.request<any[]>(
      `/pages?${new URLSearchParams(params as any).toString()}`
    );
  }

  getMedia(params: Record<string, string | number | boolean> = {}) {
    return this.request<any[]>(
      `/media?${new URLSearchParams(params as any).toString()}`
    );
  }

  createPost(data: unknown) {
    return this.request<any>("/posts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updatePost(id: string | number, data: unknown) {
    return this.request<any>(`/posts/${id}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getCategories() {
    return this.request<any[]>("/categories?per_page=100");
  }

  getTags() {
    return this.request<any[]>("/tags?per_page=100");
  }
}

export async function getWpClient(companyId: string): Promise<WordPressClient> {
  const integration = await prisma.wordPressIntegration.findUnique({
    where: { tenantId: companyId },
  });
  if (!integration || integration.status !== "active") {
    throw new Error("WP_NOT_CONNECTED");
  }
  return new WordPressClient(
    integration.siteUrl,
    decrypt(integration.credentials)
  );
}

export async function wpSafeFetch<T>(
  companyId: string,
  fn: (wp: WordPressClient) => Promise<T>
): Promise<T> {
  try {
    const wp = await getWpClient(companyId);
    return await fn(wp);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "WP_UNAUTHORIZED") {
      try {
        await prisma.wordPressIntegration.update({
          where: { tenantId: companyId },
          data: { status: "disconnected" },
        });
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

