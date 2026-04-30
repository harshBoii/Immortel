import {
    registerAppResource,
    registerAppTool,
    RESOURCE_MIME_TYPE,
  } from "@modelcontextprotocol/ext-apps/server";
  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
  import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
  import type { Request, Response } from "express";
  import { z } from "zod";
  import { prisma } from "@/lib/prisma";
  import { resolveCompanyByPassword } from "@/lib/mcp/companyPasswordAuth";
  import { createCreativeUploadToken } from "@/lib/mcp/creativeUploadToken";
  import { decrypt } from "@/lib/meta/crypto";
  import { graphPost } from "@/lib/meta/graph";
  import {
    pollStreamReady,
    streamMp4PlaybackUrl,
    streamToCloudflareStream,
    streamToR2,
  } from "@/lib/cloudfare";
  
  const PORT = process.env.MCP_PORT ? Number(process.env.MCP_PORT) : 3001;
  const IMMORTEL_BASE_URL =
    process.env.IMMORTEL_API_BASE_URL ?? "https://immortel.vercel.app";
  
  const WIDGET_DOMAIN = "https://immortel.vercel.app";
  
  
  
  export function createServer(): McpServer {
    const server = new McpServer({
      name: "Immortel MCP App Server",
      version: "1.0.0",
    });
  
    const productListResourceUri = "ui://product-list/mcp-app.html";
    const checkoutResourceUri = "ui://checkout/mcp-app.html";

    // ─── get_creative_upload_link ───────────────────────────────────────────

    const getCreativeUploadLinkInputSchema = z.object({
      password: z.string().min(1).describe("Company account password. Required."),
      email: z.string().optional().describe("Optional company email to narrow lookup."),
      companyName: z.string().optional().describe("Optional company name/slug to narrow lookup."),
      userName: z.string().optional().describe("Optional company userName to narrow lookup."),
      ttlMinutes: z.number().int().optional().default(20).describe("Link expiry in minutes (default 20)."),
    });
    type GetCreativeUploadLinkInput = z.infer<typeof getCreativeUploadLinkInputSchema>;

    server.registerTool(
      "get_creative_upload_link",
      {
        title: "Get creative upload link",
        description:
          "Authenticate by company password and return a time-limited link where the user can upload a creative (image/video) from their device. After upload, the page shows an assetId to paste back into Claude for prepare_meta_creative.",
        inputSchema: (getCreativeUploadLinkInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const parsed = getCreativeUploadLinkInputSchema.safeParse(input);
        if (!parsed.success) {
          return { content: [{ type: "text" as const, text: "Error: Invalid input." }] };
        }
        const { password, email, companyName, userName, ttlMinutes } = parsed.data as GetCreativeUploadLinkInput;
        const company = await resolveCompanyByPassword(password, { email, companyName, userName });
        if (!company) {
          return { content: [{ type: "text" as const, text: "Error: Invalid credentials." }] };
        }

        const ttlSeconds = Math.max(5, Math.min(60, ttlMinutes)) * 60;
        const token = createCreativeUploadToken({
          companyId: company.id,
          ttlSeconds,
          allowedTypes: ["IMAGE", "VIDEO"],
        });

        const uploadUrl = `${IMMORTEL_BASE_URL.replace(/\/$/, "")}/upload/creative?t=${encodeURIComponent(token)}`;
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

        const instructions =
          `1) Open this link and upload your image/video creative: ${uploadUrl}\n` +
          `2) After upload completes, copy the assetId shown on the page.\n` +
          `3) Paste it back here and call prepare_meta_creative with assetId.\n` +
          `Link expires at: ${expiresAt}`;

        return {
          content: [{ type: "text" as const, text: instructions }],
          structuredContent: { uploadUrl, expiresAt },
        };
      }) as any
    );
  
    // ─── list_products ──────────────────────────────────────────────────────
  
    const listProductsInputSchema = z.object({
      companyName: z.string().describe("Company name or slug. Always required."),
      page: z.number().int().optional().default(1).describe("Page number"),
      pageSize: z.number().int().optional().default(20).describe("Items per page"),
    });
    type ListProductsInput = z.infer<typeof listProductsInputSchema>;
  
    registerAppTool(
      server,
      "list_products",
      {
        title: "List products",
        description: "List products from the Immortel catalog.",
        inputSchema: listProductsInputSchema as any,
        _meta: {
          ui: { resourceUri: productListResourceUri },
          "openai/outputTemplate": productListResourceUri,
        },
      },
      (async (input) => {
        const { page = 1, pageSize = 20, companyName } = input as ListProductsInput;
        const url = new URL("/api/mcp/products", IMMORTEL_BASE_URL);
        if (companyName) url.searchParams.set("companyName", companyName);
        url.searchParams.set("page", String(page));
        url.searchParams.set("pageSize", String(pageSize));
  
        console.log("[list_products] →", url.toString());
  
        const res = await fetch(url.toString());
        if (!res.ok) {
          console.error("[list_products] ✗ HTTP", res.status);
          return { content: [{ type: "text" as const, text: `Error: ${res.status}` }] };
        }
  
        const data = await res.json();
  
        // ── Image debug ──────────────────────────────────────────────────────
        const products = data.data ?? [];
        console.log(`[list_products] ✓ ${products.length} products returned`);
        products.slice(0, 3).forEach((p: any, i: number) => {
          console.log(`  [${i}] "${p.title}" → featuredImage:`, p.featuredImage ?? "NULL");
        });
        // ────────────────────────────────────────────────────────────────────
  
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data) }],
          structuredContent: data,
        };
      }) as any
    );
  
    // ─── get_product ────────────────────────────────────────────────────────
  
    const getProductInputSchema = z.object({
      id: z.string().describe("Product ID"),
      companyName: z.string().describe("Company name or slug. Always required."),
    });
    type GetProductInput = z.infer<typeof getProductInputSchema>;
  
    registerAppTool(
      server,
      "get_product",
      {
        title: "Get product",
        description: "Get detailed product info by ID.",
        inputSchema: getProductInputSchema as any,
        _meta: {
          ui: { resourceUri: productListResourceUri },
          "openai/outputTemplate": productListResourceUri,
        },
      },
      (async (input) => {
        const { id, companyName } = input as GetProductInput;
        const url = new URL(`/api/mcp/products/${encodeURIComponent(id)}`, IMMORTEL_BASE_URL);
        if (companyName) url.searchParams.set("companyName", companyName);
  
        console.log("[get_product] →", url.toString());
  
        const res = await fetch(url.toString());
        if (!res.ok) {
          console.error("[get_product] ✗ HTTP", res.status);
          return { content: [{ type: "text" as const, text: `Error: ${res.status}` }] };
        }
  
        const data = await res.json();
  
        console.log(`[get_product] ✓ "${data.data?.title}" → featuredImage:`, data.data?.featuredImage ?? "NULL");
  
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data)  }],
          structuredContent: data,
        };
      }) as any
    );
  
    // ─── search_products ────────────────────────────────────────────────────
  
    const searchProductsInputSchema = z.object({
      query: z.string().describe("Search query for products"),
      companyName: z.string().describe("Company name or slug. Always required."),
      priceMin: z.number().optional().describe("Minimum price filter"),
      priceMax: z.number().optional().describe("Maximum price filter"),
    });
    type SearchProductsInput = z.infer<typeof searchProductsInputSchema>;
  
    registerAppTool(
      server,
      "search_products",
      {
        title: "Search products",
        description: "Search products by query. You MUST always include `companyName` (e.g. 'moonknight') — never omit it. Extract the company name from the user's message and pass it as a separate `companyName` parameter, not inside `query`.",
        inputSchema: searchProductsInputSchema as any,
        _meta: {
          ui: { resourceUri: productListResourceUri },
          "openai/outputTemplate": productListResourceUri,
        },
      },
      (async (input) => {
        const { query, companyName, priceMin, priceMax } = input as SearchProductsInput;
        const url = new URL("/api/mcp/products/search", IMMORTEL_BASE_URL);
        const body: Record<string, unknown> = { query };
        if (companyName) body.companyName = companyName;
        if (typeof priceMin === "number") body.priceMin = priceMin;
        if (typeof priceMax === "number") body.priceMax = priceMax;
  
        console.log("[search_products] →", url.toString(), "body:", JSON.stringify(body));
  
        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          console.error("[search_products] ✗ HTTP", res.status);
          return { content: [{ type: "text" as const, text: `Error: ${res.status}` }] };
        }
  
        const data = await res.json();
  
        // ── Image debug ──────────────────────────────────────────────────────
        const products = data.data ?? [];
        console.log(`[search_products] ✓ ${products.length} results`);
        products.slice(0, 3).forEach((p: any, i: number) => {
          console.log(`  [${i}] "${p.title}" → featuredImage:`, p.featuredImage ?? "NULL");
        });
        // ────────────────────────────────────────────────────────────────────
  
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data)  }],
          structuredContent: data,
        };
      }) as any
    );
  
    // ─── create_checkout ────────────────────────────────────────────────────
  
    const createCheckoutInputSchema = z.object({
      companyName: z.string().describe("Company name or slug. Always required."),
      productIds: z.array(z.string()).min(1).describe("Product IDs to checkout"),
    });
    type CreateCheckoutInput = z.infer<typeof createCheckoutInputSchema>;
  
    registerAppTool(
      server,
      "create_checkout",
      {
        title: "Create checkout",
        description: "Create a checkout session for selected products.",
        inputSchema: createCheckoutInputSchema as any,
        _meta: {
          ui: { resourceUri: checkoutResourceUri },
          "openai/outputTemplate": checkoutResourceUri,
        },
      },
      (async (input) => {
        const { companyName, productIds } = input as CreateCheckoutInput;
        const url = new URL("/api/mcp/products/checkout", IMMORTEL_BASE_URL);
        const body: Record<string, unknown> = { productIds };
        if (companyName) body.companyName = companyName;
  
        console.log("[create_checkout] →", url.toString(), "productIds:", productIds);
  
        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          console.error("[create_checkout] ✗ HTTP", res.status);
          return { content: [{ type: "text" as const, text: `Error: ${res.status}` }] };
        }
  
        const data = await res.json();
        console.log("[create_checkout] ✓ checkoutUrl:", data.checkoutUrl ?? "MISSING");
  
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data)  }],
          structuredContent: data,
        };
      }) as any
    );
  
    // ─── get_company_data ───────────────────────────────────────────────────

    const getCompanyDataInputSchema = z.object({
      password: z
        .string()
        .min(1)
        .describe("Company account password. Always required."),
      email: z
        .string()
        .optional()
        .describe("Optional company email to narrow the lookup and avoid scanning all companies."),
      companyName: z
        .string()
        .optional()
        .describe("Optional company name or slug to narrow the lookup."),
      userName: z
        .string()
        .optional()
        .describe("Optional company userName to narrow the lookup."),
    });
    type GetCompanyDataInput = z.infer<typeof getCompanyDataInputSchema>;

    server.registerTool(
      "get_company_data",
      {
        title: "Get company data",
        description:
          "Authenticate a company using its password and return the full GEO data-mine payload: company profile, a flat `identity` block (canonicalName, aliases, entityType, oneLiner, about, industry, category, headquarters, foundedYear, employeeRange, businessModel, topics, keywords, targetAudiences), brand entity, offerings, branding, and all GEO data sources (files, text, URLs). Optionally include `email`, `companyName`, or `userName` to speed up the lookup.",
        inputSchema: (getCompanyDataInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const { password, email, companyName, userName } = input as GetCompanyDataInput;
        const url = new URL("/api/mcp/company-data", IMMORTEL_BASE_URL);

        const body: Record<string, unknown> = { password };
        if (email) body.email = email;
        if (companyName) body.companyName = companyName;
        if (userName) body.userName = userName;

        console.log(
          "[get_company_data] →",
          url.toString(),
          "hints:",
          JSON.stringify({
            email: email ? "***" : undefined,
            companyName,
            userName,
          })
        );

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          console.error("[get_company_data] ✗ HTTP", res.status);
          let errText = `Error: ${res.status}`;
          try {
            const j = await res.json();
            if (j?.error) errText = `Error: ${j.error}`;
          } catch {}
          return { content: [{ type: "text" as const, text: errText }] };
        }

        const data = await res.json();
        console.log(
          `[get_company_data] ✓ company="${data.company?.name}" sources=${data.dataMine?.sources?.length ?? 0} offerings=${data.dataMine?.offerings?.length ?? 0} topics=${data.identity?.topics?.length ?? 0} keywords=${data.identity?.keywords?.length ?? 0} audiences=${data.identity?.targetAudiences?.length ?? 0}`
        );

        return {
          content: [{ type: "text" as const, text: JSON.stringify(data) }],
          structuredContent: data,
        };
      }) as any
    );

    // ─── get_company_ads_data ──────────────────────────────────────────────

    server.registerTool(
      "get_company_ads_data",
      {
        title: "Get company Meta ads (top by performance + media)",
        description:
          "Authenticate with the company account password and return Meta ad performance for this company: top 5 ads by impressions, top 5 by clicks, and top 5 by ROAS (using the latest stored metrics per ad). Each ad includes name/status, ad set, key metrics, creative text/CTA/URLs, and linked media (creative image/video/thumbnail fields plus any matching `MetaMedia` rows: Stream URLs, thumbnails, status). Use the same `password` as get_company_data; optional `email`, `companyName`, or `userName` narrow the company lookup.",
        inputSchema: (getCompanyDataInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const { password, email, companyName, userName } = input as GetCompanyDataInput;
        const url = new URL("/api/mcp/company-ads-data", IMMORTEL_BASE_URL);

        const body: Record<string, unknown> = { password };
        if (email) body.email = email;
        if (companyName) body.companyName = companyName;
        if (userName) body.userName = userName;

        console.log(
          "[get_company_ads_data] →",
          url.toString(),
          "hints:",
          JSON.stringify({
            email: email ? "***" : undefined,
            companyName,
            userName,
          })
        );

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          console.error("[get_company_ads_data] ✗ HTTP", res.status);
          let errText = `Error: ${res.status}`;
          try {
            const j = await res.json();
            if (j?.error) errText = `Error: ${j.error}`;
          } catch {}
          return { content: [{ type: "text" as const, text: errText }] };
        }

        const data = await res.json();
        const nI = (data as { topByImpressions?: unknown[] }).topByImpressions?.length ?? 0;
        const nC = (data as { topByClicks?: unknown[] }).topByClicks?.length ?? 0;
        const nR = (data as { topByRoas?: unknown[] }).topByRoas?.length ?? 0;
        console.log(
          `[get_company_ads_data] ✓ topByImpr=${nI} topByClicks=${nC} topByRoas=${nR} connected=${(data as { meta?: { connected?: boolean } }).meta?.connected !== false}`
        );

        return {
          content: [{ type: "text" as const, text: JSON.stringify(data) }],
          structuredContent: data,
        };
      }) as any
    );

    // ─── generate_ad_story_ideas ─────────────────────────────────────────────
    // Returns a prompt payload that an MCP-capable agent can use to generate ad story ideas.
    const generateAdStoryIdeasInputSchema = z.object({
      password: z
        .string()
        .min(1)
        .describe("Company account password (used for authentication). Required."),
      email: z.string().optional().describe("Optional email hint to narrow lookup."),
      companyName: z
        .string()
        .optional()
        .describe("Optional company name/slug hint to narrow lookup."),
      userName: z.string().optional().describe("Optional company userName hint to narrow lookup."),
    });
    type GenerateAdStoryIdeasInput = z.infer<typeof generateAdStoryIdeasInputSchema>;

    server.registerTool(
      "generate_ad_story_ideas",
      {
        title: "Generate ad story ideas ",
        description:
          "Authenticate a company by password, fetch the company's winning mantra (MetaIntegration.winningFormula), and return a prompt payload that instructs the agent to output exactly 3 oscar worthy ad story concepts using the provided template.",
        inputSchema: (generateAdStoryIdeasInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const { password, email, companyName, userName } = input as GenerateAdStoryIdeasInput;
        const company = await resolveCompanyByPassword(password, { email, companyName, userName });
        if (!company) {
          return {
            content: [{ type: "text" as const, text: "Error: Invalid credentials (company not found)." }],
          };
        }

        const metaIntegration = await prisma.metaIntegration.findUnique({
          where: { companyId: company.id },
          select: { id: true, companyId: true, winningFormula: true },
        });

        if (!metaIntegration?.winningFormula) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: Missing winning formula for this company. Build winning formula first in Meta analyze.",
              },
            ],
          };
        }

        const winningMantra = metaIntegration.winningFormula;

        const generationRules = [
          "Style: melodrama, dramatic reveals, emotional pacing",
          "Must include: a lesson/moral, and brand solves the problem in a satisfying end card.",
          "Output: exactly 3 concepts (one of 10-15 seconds duration , another of 20-25 seconds duration , and last of 25-40 seconds duration). Each must be labeled `Short-Length` ... `Medium-Length` ... `Long-Length`.",
          "The brand tag should use only the brand name from the winning mantra/endcard guidance (do not add extra brands).",
          "Keep it concise but screenplay-like; each concept should be self-contained.",
          "Do Not Exact Match the template, but follow the structure and style.",
          "You have to act like a director and write a screenplay for the ad story ideas. , mention the events happening at each 3 second mark in the screenplay .",
          "Maintain An Indian Style Screenplay, with the characters and the events happening in the screenplay."
        ].join("\n");

        const templateGuide = `
Example template (Do Not Exact Match):
She Saved for Everyone, Never for Herself
A middle-class Indian mother keeps sacrificing small joys for the family.
Lesson/Moral: The one who gives most is often forgotten first.
Mother POV
36s
No dialogue until final reveal

0–3s
Morning kitchen rush. Maa serves breakfast, her own plate empty.

3–6s
She quietly stitches son’s torn school shirt.

6–9s
She counts coins in a steel box, then puts them back.

9–12s
Daughter asks for project chart paper. Maa smiles, gives money.

12–15s
Rain leaks from ceiling. Maa shifts bucket, keeps cooking.

15–18s
Family laughs watching TV. Maa stands behind, folding clothes.

18–21s
She sees an old faded maternity photo in drawer.

21–24s
Son notices her tired hands for the first time.

24–27s
Next morning, family table is decorated simply.

27–30s
Gift box placed before her. She opens it slowly.

30–33s
Soft tears. Family hugs her.

33–36s
End card.

Product: Putchi
End card line: “The hands that held everyone deserve holding too. Putchi.”"
        `.trim();

        const payload = {
          winning_mantra: winningMantra,
          generation_rules: generationRules,
          output_requirements: {
            concept_count: 3,
            concept_label_format: "Short-Length..Medium-Length..Long-Length",
            template: templateGuide,
          },
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
          structuredContent: payload,
        };
      }) as any
    );

    // ─── finalize the script ────────────────────────────────────────────────
    // Rewrites a brief into a highly explicit, video-generator-friendly prompt.
    const finalizeTheScriptInputSchema = z.object({
      scriptBrief: z
        .string()
        .min(1)
        .describe("Short script/story/ad brief to expand into a video-generation-ready prompt."),
      language: z
        .string()
        .min(1)
        .describe('Output language for the final prompt (e.g. "English", "Hindi", "Tamil").'),
    });
    type FinalizeTheScriptInput = z.infer<typeof finalizeTheScriptInputSchema>;

    server.registerTool(
      "finalize_the_script",
      {
        title: "Finalize the script",
        description:
          "Rewrite a script brief into a highly explicit, explanatory, video-generation-ready prompt in the requested language, including timecoded beats, VO/dialogue guidance, on-screen text, audio cues, negatives, and deliverables. Do Not Call Ad generation tool unless prompted to do so.",
        inputSchema: (finalizeTheScriptInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const { scriptBrief, language } = input as FinalizeTheScriptInput;

        const defaults = {
          aspectRatio: "9:16",
          resolution: "1080x1920",
          durationSeconds: 25,
          fps: 30,
        };

        const sections = {
          intent:
            "Turn the brief into a clear, production-ready video generation prompt. Be explicit and reduce ambiguity. Assume the generator can follow structured instructions.",
          constraints: [
            `Write everything in ${language}.`,
            "Use simple, unambiguous sentences. Prefer concrete visual actions over abstract feelings.",
            "If the brief is missing details, make reasonable assumptions and state them explicitly (do not ask questions).",
            "Avoid meta commentary. Output only the final video-generation prompt.",
          ],
          cinematicSpec: {
            style:
              "Short-form cinematic ad/story with strong emotional pacing, clear subject, and a satisfying end beat.",
            camera:
              "Mix of wide establishing shots + medium action shots + close-ups for emotion and product detail. Smooth handheld or gimbal; avoid chaotic motion.",
            lighting:
              "Naturalistic, soft key light; motivated practicals. Keep faces well-lit and readable.",
            artDirection:
              "Clean compositions, readable product/brand moments, minimal clutter, consistent wardrobe and props.",
          },
          scenePlan: [
            "0–3s: Hook. Show the problem in one striking visual moment.",
            "3–6s: Escalate. Make the pain point feel real and relatable.",
            "6–9s: Reveal. Introduce the solution/product/service clearly.",
            "9–12s: Proof. Show how it works (one key feature visually).",
            "12–15s: Transformation. Before/after contrast.",
            "15–18s: Payoff. Emotional relief or confidence moment.",
            "18–22s: Brand moment. Logo/product in-frame; benefit statement on-screen.",
            "22–25s: CTA end card. Clear next step.",
          ],
          voiceoverAndDialogue: [
            "Voiceover: concise, conversational, and aligned to each beat. Prefer short lines that match the visuals.",
            "Dialogue (optional): only if it increases clarity; keep it minimal and natural.",
          ],
          onScreenText: [
            "Use 3–7 words per on-screen text line.",
            "Keep text high-contrast, large, and within safe margins (avoid edges).",
            "Only show one message at a time; sync with the scene beat.",
          ],
          audio: [
            "Music: starts curious/tense, resolves uplifting after the solution reveal.",
            "SFX: subtle UI taps, whooshes for transitions, light ambience matching location.",
          ],
          negatives: [
            "No distorted faces, extra limbs, melted hands, or warped text.",
            "No unreadable logos or misspelled brand/product names.",
            "No sudden character/wardrobe changes between shots.",
            "No jump cuts that break continuity; keep consistent environment.",
            "Avoid crowded frames; keep the main subject centered and readable.",
          ],
          deliverables: {
            aspectRatio: defaults.aspectRatio,
            resolution: defaults.resolution,
            durationSeconds: defaults.durationSeconds,
            fps: defaults.fps,
            captioning: "If captions are used, they must match the spoken language and be perfectly readable.",
          },
        } as const;

        const videoPrompt = [
          `LANGUAGE: ${language}`,
          "",
          "TASK:",
          "Rewrite the following script brief into a single, extremely clear prompt for a video-generating AI.",
          "The goal is that a video model can produce the video without guessing what to show.",
          "",
          "SCRIPT_BRIEF:",
          scriptBrief.trim(),
          "",
          "OUTPUT_REQUIREMENTS:",
          "- Output ONLY the final video-generation prompt (no analysis).",
          `- Everything must be written in ${language}.`,
          `- Assume vertical video (${defaults.aspectRatio}), ${defaults.resolution}, ~${defaults.durationSeconds}s, ${defaults.fps}fps.`,
          "- Include timecoded beats (0–3s, 3–6s, ...). For each beat specify: shot type + camera motion + what is on-screen + action + emotion cue.",
          "- Include VO/dialogue lines aligned to beats (optional but recommended).",
          "- Include on-screen text per beat (keep it short).",
          "- Include music + SFX guidance.",
          "- Include a short end-card/CTA spec.",
          "- Include a 'NEGATIVE PROMPT / AVOID' list.",
          "",
          "STRUCTURE_TO_FOLLOW:",
          "1) One-line summary",
          "2) Style & cinematic direction",
          "3) Characters & setting (make assumptions explicit if missing)",
          "4) Timecoded shot list (0–3s, 3–6s, ...)",
          "5) Voiceover/dialogue",
          "6) On-screen text",
          "7) Music & SFX",
          "8) End card / CTA",
          "9) NEGATIVE PROMPT / AVOID",
        ].join("\n");

        return {
          content: [{ type: "text" as const, text: videoPrompt }],
          structuredContent: {
            language,
            videoPrompt,
            sections,
          },
        };
      }) as any
    );

    // ─── prepare_meta_video_creative ─────────────────────────────────────────

    const passwordAuthSchema = z.object({
      password: z.string().min(1).describe("Company account password. Required."),
      email: z.string().optional().describe("Optional company email to narrow lookup."),
      companyName: z.string().optional().describe("Optional company name/slug to narrow lookup."),
      userName: z.string().optional().describe("Optional company userName to narrow lookup."),
    });

    async function loadMetaIntegrationByPassword(input: unknown): Promise<
      | {
          company: { id: string; name: string; slug: string; website: string | null };
          integration: {
            integrationId: string;
            accessToken: string;
            adAccountId: string;
            fbPageId: string;
            actId: string;
          };
        }
      | { error: string; status: number }
    > {
      const parsed = passwordAuthSchema.safeParse(input);
      if (!parsed.success) {
        return { error: "Error: `password` is required.", status: 400 };
      }

      const { password, email, companyName, userName } = parsed.data;
      const company = await resolveCompanyByPassword(password, { email, companyName, userName });
      if (!company) {
        return { error: "Error: Invalid credentials (company not found).", status: 401 };
      }

      const integ = await prisma.metaIntegration.findUnique({
        where: { companyId: company.id },
        select: {
          id: true,
          accessToken: true,
          adAccountId: true,
          fbPageId: true,
        },
      });

      if (!integ) {
        return { error: "Error: Meta not connected for this company.", status: 401 };
      }

      let accessToken: string;
      try {
        accessToken = decrypt(integ.accessToken);
      } catch {
        return { error: "Error: Meta credentials decrypt failed.", status: 500 };
      }

      const raw = integ.adAccountId.replace(/^act_/, "");
      const actId = integ.adAccountId.startsWith("act_") ? integ.adAccountId : `act_${raw}`;

      return {
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          website: company.website ?? null,
        },
        integration: {
          integrationId: integ.id,
          accessToken,
          adAccountId: integ.adAccountId,
          fbPageId: integ.fbPageId,
          actId,
        },
      };
    }

    function requireEnv(name: string): string {
      const v = process.env[name];
      if (!v) throw new Error(`${name} must be set`);
      return v;
    }

    function processingBaseUrl(): string {
      return (
        process.env.PROCESSING_API_BASE ??
        process.env.CLIPFOX_PROCESSING_URL ??
        "https://harshboii--asset-intelligence-fastapi-app.modal.run"
      ).replace(/\/$/, "");
    }

    function stripDataUrlBase64(input: string): string {
      const i = input.indexOf("base64,");
      return i >= 0 ? input.slice(i + "base64,".length) : input;
    }

    function safeFilename(name: string): string {
      const trimmed = name.trim() || "video.mp4";
      return trimmed.replace(/[^\w.\-()]+/g, "_");
    }

    function extractJobId(payload: unknown): string | null {
      if (!payload || typeof payload !== "object") return null;
      const obj = payload as Record<string, unknown>;
      const candidates = [
        obj.id,
        obj.jobId,
        obj.job_id,
        obj.requestId,
        obj.request_id,
        obj.taskId,
        obj.task_id,
      ];
      for (const c of candidates) {
        if (typeof c === "string" && c.trim()) return c.trim();
        if (typeof c === "number" && Number.isFinite(c)) return String(c);
      }
      return null;
    }

    // ─── prepare_meta_creative (unified: image | video) ──────────────────────

    const prepareMetaCreativeInputSchema = passwordAuthSchema.extend({
      // For Claude large uploads: user uploads via /upload/creative and pastes assetId here.
      assetId: z.string().optional().describe("Existing Asset id to use (recommended for large uploads)."),
      // For small files: still allow direct base64.
      kind: z
        .enum(["video", "image"])
        .optional()
        .describe('Creative kind: "video" uses Stream+advideos; "image" uses adimages image_hash. If omitted with assetId, inferred from Asset.assetType.'),
      fileBase64: z
        .string()
        .optional()
        .describe("Base64-encoded file bytes (optionally a data: URL). Use only for small files."),
      filename: z.string().optional().describe("Original filename (e.g. ad.mp4 or ad.jpg). Required with fileBase64."),
      mimeType: z.string().optional().describe("MIME type (e.g. video/mp4, image/jpeg)."),
      headline: z.string().optional().describe("Creative headline."),
      primaryText: z.string().optional().describe("Creative primary text."),
      description: z.string().optional().describe("Creative description (optional)."),
      ctaType: z.string().optional().default("LEARN_MORE").describe("CTA type (e.g. LEARN_MORE)."),
      landingUrl: z.string().optional().describe("Landing page URL."),
      name: z.string().optional().describe("Creative name override (optional)."),
      scenePreset: z.string().optional().describe("Harshboii scene preset (default sensitive)."),
    });
    type PrepareMetaCreativeInput = z.infer<typeof prepareMetaCreativeInputSchema>;

    server.registerTool(
      "prepare_meta_creative",
      {
        title: "Prepare Meta creative (image or video)",
        description:
          "Authenticate by company password and prepare a Meta creative from an uploaded file. For video: upload to R2 + Cloudflare Stream, upload to Meta advideos, then create a video ad creative. For image: upload to R2, upload to Meta adimages to obtain image_hash, then create an image ad creative. Enqueues Harshboii analysis and returns ad set options + tracking ids.",
        inputSchema: (prepareMetaCreativeInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const auth = await loadMetaIntegrationByPassword(input);
        if ("error" in auth) {
          return { content: [{ type: "text" as const, text: auth.error }] };
        }

        const parsed = prepareMetaCreativeInputSchema.safeParse(input);
        if (!parsed.success) {
          return { content: [{ type: "text" as const, text: "Error: Invalid input." }] };
        }
        const opts = parsed.data as PrepareMetaCreativeInput;

        const bucket = process.env.R2_BUCKET_NAME ?? "";
        if (!bucket) {
          return { content: [{ type: "text" as const, text: "Error: R2_BUCKET_NAME must be set." }] };
        }

        // Resolve input source: assetId (preferred) vs base64.
        const hasAssetId = typeof opts.assetId === "string" && opts.assetId.trim().length > 0;
        const hasBase64 = typeof opts.fileBase64 === "string" && opts.fileBase64.trim().length > 0;
        if (!hasAssetId && !hasBase64) {
          return { content: [{ type: "text" as const, text: "Error: Provide `assetId` or `fileBase64`." }] };
        }

        let kind: "video" | "image";
        let mimeType: string;
        let fileName: string;
        let r2Key: string;
        let bytes: Buffer | null = null;
        /** Loaded row when caller passed assetId */
        let existingAssetRow: {
          id: string;
          assetType: string;
          filename: string;
          mimeType: string | null;
          r2Key: string;
          r2Bucket: string;
          streamId: string | null;
          playbackUrl: string | null;
          thumbnailUrl: string | null;
          originalSize: bigint;
        } | null = null;

        if (hasAssetId) {
          const asset = await prisma.asset.findFirst({
            where: { id: opts.assetId!.trim(), companyId: auth.company.id },
            select: {
              id: true,
              assetType: true,
              filename: true,
              mimeType: true,
              r2Key: true,
              r2Bucket: true,
              streamId: true,
              playbackUrl: true,
              thumbnailUrl: true,
              status: true,
              intelligenceStatus: true,
              metadata: true,
              originalSize: true,
            },
          });
          if (!asset) {
            return { content: [{ type: "text" as const, text: "Error: Asset not found." }] };
          }
          if (asset.r2Bucket !== bucket) {
            // We only support the main bucket for now; keep it explicit.
            return { content: [{ type: "text" as const, text: "Error: Asset bucket mismatch." }] };
          }
          if (asset.assetType !== "VIDEO" && asset.assetType !== "IMAGE") {
            return {
              content: [{ type: "text" as const, text: "Error: Only VIDEO or IMAGE assets are supported." }],
            };
          }

          kind =
            opts.kind ??
            (asset.assetType === "VIDEO" ? "video" : "image");
          mimeType =
            (opts.mimeType?.trim() || asset.mimeType?.trim() || (kind === "video" ? "video/mp4" : "image/jpeg")) as string;
          fileName = safeFilename(opts.filename ?? asset.filename);
          r2Key = asset.r2Key;
          existingAssetRow = asset;

          // For images we need bytes to send to Meta adimages; download from our R2-backed asset download route.
          if (kind === "image") {
            const appUrl = requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
            const dl = await fetch(`${appUrl}/api/assets/${asset.id}/download`);
            if (!dl.ok) {
              return { content: [{ type: "text" as const, text: `Error: Failed to download asset bytes (HTTP ${dl.status}).` }] };
            }
            const ab = await dl.arrayBuffer();
            bytes = Buffer.from(ab);
          }

          // For videos we do not download bytes; rely on Cloudflare Stream once processing finished.
          if (kind === "video") {
            const playback =
              asset.playbackUrl ?? (asset.streamId ? streamMp4PlaybackUrl(asset.streamId) : null);
            if (!playback || !asset.streamId) {
              const queue = await prisma.streamQueue.findFirst({
                where: { assetId: asset.id },
                orderBy: { createdAt: "desc" },
                select: { id: true, status: true, streamId: true, lastError: true },
              });
              return {
                content: [
                  {
                    type: "text" as const,
                    text:
                      "Video is not stream-ready yet. Please retry after Stream processing completes.\n" +
                      `assetId=${asset.id}\n` +
                      `streamQueueStatus=${queue?.status ?? "unknown"}\n` +
                      (queue?.lastError ? `lastError=${queue.lastError}\n` : ""),
                  },
                ],
                structuredContent: {
                  ok: false,
                  reason: "STREAM_NOT_READY",
                  assetId: asset.id,
                  streamQueue: queue ?? null,
                },
              };
            }

            const polled = await pollStreamReady(asset.streamId, { maxAttempts: 25, delayMs: 3000 });
            if (!polled.ready) {
              const queue = await prisma.streamQueue.findFirst({
                where: { assetId: asset.id },
                orderBy: { createdAt: "desc" },
                select: { id: true, status: true, streamId: true, lastError: true },
              });
              return {
                content: [
                  {
                    type: "text" as const,
                    text:
                      "Video Stream encoding is not ready yet. Please retry in a minute.\n" +
                      `assetId=${asset.id}\n` +
                      `streamQueueStatus=${queue?.status ?? "unknown"}\n` +
                      (queue?.lastError ? `lastError=${queue.lastError}\n` : ""),
                  },
                ],
                structuredContent: {
                  ok: false,
                  reason: "STREAM_ENCODING",
                  assetId: asset.id,
                  streamQueue: queue ?? null,
                },
              };
            }
          }
        } else {
          // Base64 path (small files)
          if (!opts.kind || !opts.filename) {
            return { content: [{ type: "text" as const, text: "Error: With fileBase64, you must provide `kind` and `filename`." }] };
          }
          kind = opts.kind;
          mimeType =
            (typeof opts.mimeType === "string" && opts.mimeType.trim()) ||
            (kind === "video" ? "video/mp4" : "image/jpeg");
          fileName = safeFilename(opts.filename);
          bytes = Buffer.from(stripDataUrlBase64(opts.fileBase64!), "base64");
          if (!bytes.length) {
            return { content: [{ type: "text" as const, text: "Error: Empty file bytes." }] };
          }
          r2Key = `assets/${auth.company.id}/uploads/${Date.now()}-${fileName}`;
        }

        console.log("[mcp][prepare_meta_creative] start", {
          companyId: auth.company.id,
          kind,
          filename: fileName,
          bytes: bytes?.length ?? null,
          r2Key,
        });

        // If this call started from base64, we need to store bytes to R2.
        if (bytes && !hasAssetId) {
          await streamToR2({
            body: bytes,
            key: r2Key,
            contentType: mimeType,
            bucket,
          });
        }

        const landingUrl =
          (typeof opts.landingUrl === "string" && opts.landingUrl.trim()) ||
          (auth.company.website?.trim() ?? "") ||
          "https://immortel.vercel.app";
        const headline = (opts.headline?.trim() || fileName.replace(/\.[^.]+$/, "") || "Ad").slice(0, 255);
        const primaryText = opts.primaryText?.trim() || "";
        const description = opts.description?.trim() || "";
        const ctaType = opts.ctaType?.trim() || "LEARN_MORE";
        const creativeName = (opts.name?.trim() || headline || "Creative").slice(0, 255);

        // Create Asset row
        // If input is base64, create the Asset row here. If assetId was provided, reuse it.
        const asset =
          hasAssetId
            ? { id: opts.assetId!.trim() }
            : await prisma.asset.create({
                data: {
                  companyId: auth.company.id,
                  assetType: kind === "video" ? "VIDEO" : "IMAGE",
                  title: headline,
                  filename: fileName,
                  originalSize: BigInt(bytes!.length),
                  status: kind === "video" ? "PROCESSING" : "READY",
                  r2Key,
                  r2Bucket: bucket,
                  mimeType,
                  intelligenceStatus: "PENDING",
                  metadata: { source: "mcp_meta_ad", kind },
                  uploadSource: "NATIVE",
                },
                select: { id: true },
              });

        let streamId: string | null = null;
        let playbackUrl: string | null = null;
        let thumbnailUrl: string | null = null;

        let metaMediaId: string | null = null;
        let metaVideoId: string | null = null;
        let metaVideoStatus: "ready" | "processing" | null = null;
        let imageHash: string | null = null;
        let imageUrl: string | null = null;

        if (kind === "video") {
          if (!hasAssetId) {
            const streamUpload = await streamToCloudflareStream({
              body: new Blob([new Uint8Array(bytes!)], { type: mimeType }),
              filename: fileName,
              metadata: {
                source: "mcp_meta_ad",
                companyId: auth.company.id,
                assetId: asset.id,
              },
            });

            await pollStreamReady(streamUpload.uid, { maxAttempts: 20, delayMs: 2000 });
            streamId = streamUpload.uid;
            playbackUrl = streamMp4PlaybackUrl(streamUpload.uid);
            thumbnailUrl = streamUpload.thumbnail ?? null;

            await prisma.asset.update({
              where: { id: asset.id },
              data: {
                status: "READY",
                streamId,
                playbackUrl,
                thumbnailUrl,
              },
            });
          } else if (existingAssetRow?.streamId) {
            streamId = existingAssetRow.streamId;
            thumbnailUrl = existingAssetRow.thumbnailUrl;
            playbackUrl =
              existingAssetRow.playbackUrl ?? streamMp4PlaybackUrl(existingAssetRow.streamId);
            if (!playbackUrl) {
              return {
                content: [{ type: "text" as const, text: "Error: Video asset missing Stream playback URL." }],
              };
            }
            if (!existingAssetRow.playbackUrl) {
              await prisma.asset.update({
                where: { id: asset.id },
                data: { playbackUrl },
              });
            }
          } else {
            return {
              content: [{ type: "text" as const, text: "Error: Video asset has no Stream id." }],
            };
          }

          metaVideoStatus = "ready";
          try {
            const adv = (await graphPost(
              `${auth.integration.actId}/advideos`,
              { file_url: playbackUrl },
              { accessToken: auth.integration.accessToken },
            )) as { id?: string };
            metaVideoId = adv.id ?? null;
          } catch (e) {
            metaVideoStatus = "processing";
            console.log("[mcp][prepare_meta_creative] advideos error", {
              error: e instanceof Error ? e.message : String(e),
              payload: (e as any)?.payload ?? null,
            });
          }

          const metaMediaBytes =
            hasAssetId && existingAssetRow
              ? Number(existingAssetRow.originalSize)
              : bytes!.length;

          const metaMedia = await prisma.metaMedia.create({
            data: {
              metaIntegrationId: auth.integration.integrationId,
              kind: "video",
              videoId: metaVideoId,
              assetId: asset.id,
              videoUrl: playbackUrl,
              videoStreamId: streamId,
              thumbnailUrl,
              r2Key,
              filename: fileName,
              mimeType,
              bytes: metaMediaBytes,
              status: metaVideoStatus ?? "processing",
            },
            select: { id: true },
          });
          metaMediaId = metaMedia.id;
        } else {
          if (!bytes) {
            return { content: [{ type: "text" as const, text: "Error: Missing image bytes." }] };
          }
          // Meta adimages upload (multipart) to obtain image_hash
          const graphVersion = (process.env.META_GRAPH_VERSION?.trim() || "v25.0").startsWith("v")
            ? (process.env.META_GRAPH_VERSION?.trim() || "v25.0")
            : `v${process.env.META_GRAPH_VERSION?.trim() || "25.0"}`;
          const graphBase = `https://graph.facebook.com/${graphVersion}`;
          const graphUrl = `${graphBase}/${auth.integration.actId}/adimages?access_token=${encodeURIComponent(
            auth.integration.accessToken,
          )}`;

          const metaForm = new FormData();
          const uint8 = new Uint8Array(bytes);
          const filePart =
            typeof File !== "undefined"
              ? new File([uint8], fileName, { type: mimeType })
              : new Blob([uint8], { type: mimeType });
          metaForm.append("filename", filePart);

          const metaRes = await fetch(graphUrl, { method: "POST", body: metaForm });
          const graphRes = await metaRes.json().catch(() => ({}));
          if (!metaRes.ok || (graphRes as any)?.error) {
            const msg =
              (graphRes as any)?.error?.message ?? `Meta adimages HTTP ${metaRes.status}`;
            return {
              content: [{ type: "text" as const, text: `Error: ${msg}` }],
              structuredContent: { error: msg, graphRes },
            };
          }

          const images = (graphRes as any)?.images as
            | Record<string, { hash?: string; url?: string; permalink_url?: string; width?: number; height?: number }>
            | undefined;
          const first = images ? Object.values(images)[0] : undefined;
          imageHash = typeof first?.hash === "string" ? first.hash : null;
          imageUrl =
            (typeof first?.url === "string" && first.url) ||
            (typeof first?.permalink_url === "string" && first.permalink_url) ||
            null;

          if (!imageHash) {
            return {
              content: [{ type: "text" as const, text: "Error: Meta did not return an image hash." }],
              structuredContent: { graphRes },
            };
          }

          const metaMedia = await prisma.metaMedia.create({
            data: {
              metaIntegrationId: auth.integration.integrationId,
              kind: "image",
              imageHash,
              assetId: asset.id,
              r2Key,
              imageUrl,
              mimeType,
              bytes: bytes.length,
              filename: fileName,
              width: first?.width ?? null,
              height: first?.height ?? null,
              status: "ready",
            },
            select: { id: true },
          });
          metaMediaId = metaMedia.id;
        }

        // Create Meta adcreative (video_id or image_hash)
        let metaCreativeId: string | null = null;
        try {
          const link_data: Record<string, unknown> = {
            message: primaryText,
            link: landingUrl,
            name: headline,
            ...(description ? { description } : {}),
            call_to_action: {
              type: ctaType,
              value: { link: landingUrl },
            },
          };
          if (kind === "video" && metaVideoId) link_data.video_id = metaVideoId;
          if (kind === "image" && imageHash) link_data.image_hash = imageHash;

          const object_story_spec = {
            page_id: auth.integration.fbPageId,
            link_data,
          };

          const created = (await graphPost(
            `${auth.integration.actId}/adcreatives`,
            { name: creativeName, object_story_spec },
            { accessToken: auth.integration.accessToken },
          )) as { id?: string };
          metaCreativeId = created.id ?? null;
        } catch (e) {
          console.log("[mcp][prepare_meta_creative] adcreatives error", {
            error: e instanceof Error ? e.message : String(e),
            payload: (e as any)?.payload ?? null,
          });
        }

        const creativeRow = await prisma.metaCreative.create({
          data: {
            metaIntegrationId: auth.integration.integrationId,
            metaCampaignId: null,
            metaCreativeId,
            imageHash: kind === "image" ? imageHash : null,
            videoId: kind === "video" ? metaVideoId : null,
            headline,
            primaryText,
            description: description || null,
            ctaType,
            landingUrl,
            imageUrl: kind === "image" ? imageUrl : null,
            videoUrl: kind === "video" ? playbackUrl : null,
            videoStreamId: kind === "video" ? streamId : null,
            thumbnailUrl: kind === "video" ? thumbnailUrl : null,
            aiGenerated: false,
          },
          select: { id: true },
        });

        // Enqueue Harshboii analysis.
        const appUrl = requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
        const baseUrl = processingBaseUrl();
        const api_url =
          kind === "video"
            ? `${appUrl}/api/videos/${asset.id}/download`
            : `${appUrl}/api/assets/${asset.id}/download`;
        const harshPayload = {
          api_url,
          asset_Id: asset.id,
          asset_type: kind === "video" ? "VIDEO" : "IMAGE",
          scene_preset: opts.scenePreset ?? "sensitive",
        };

        const harshRes = await fetch(`${baseUrl}/process-from-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(harshPayload),
        });
        const harshJson = await harshRes.json().catch(() => null);
        if (!harshRes.ok) {
          const errText =
            typeof harshJson === "object" && harshJson && "error" in harshJson
              ? String((harshJson as any).error)
              : `process-from-api HTTP ${harshRes.status}`;
          return { content: [{ type: "text" as const, text: `Error: ${errText}` }], structuredContent: harshJson };
        }

        const analysisJobId = extractJobId(harshJson);

        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            intelligenceStatus: "PROCESSING",
            metadata: {
              source: "mcp_meta_ad",
              kind,
              harshboii: { baseUrl, jobId: analysisJobId, response: harshJson },
              meta: {
                metaMediaId,
                metaVideoId,
                metaImageHash: imageHash,
                metaCreativeId,
                creativeDbId: creativeRow.id,
              },
            },
          },
        });

        const adSets = await prisma.metaAdSet.findMany({
          where: { metaIntegrationId: auth.integration.integrationId },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: {
            id: true,
            metaAdSetId: true,
            name: true,
            campaign: { select: { name: true, metaCampaignId: true } },
          },
        });

        const structuredContent = {
          kind,
          assetId: asset.id,
          r2Key,
          r2Bucket: bucket,
          streamId,
          playbackUrl,
          thumbnailUrl,
          metaMediaDbId: metaMediaId,
          metaVideoId,
          metaVideoStatus,
          metaImageHash: imageHash,
          imageUrl,
          creativeDbId: creativeRow.id,
          metaCreativeId,
          analysis: { baseUrl, enqueued: true, api_url, response: harshJson },
          analysisJobId,
          adSets: adSets.map((a) => ({
            adSetDbId: a.id,
            metaAdSetId: a.metaAdSetId,
            name: a.name,
            campaignName: a.campaign?.name ?? null,
            metaCampaignId: a.campaign?.metaCampaignId ?? null,
          })),
          next: {
            tool: "list_post_ad_options",
            required: ["assetId"],
            confirmMessage: "Next: list selectable ad sets (the creative will be the same uploaded asset).",
          },
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }],
          structuredContent,
        };
      }) as any
    );

    const prepareMetaVideoCreativeInputSchema = passwordAuthSchema.extend({
      videoBase64: z.string().min(1).describe("Base64-encoded video bytes (optionally a data: URL)."),
      filename: z.string().min(1).describe("Original filename (e.g. ad.mp4)."),
      mimeType: z.string().optional().default("video/mp4").describe("Video MIME type."),
      headline: z.string().optional().describe("Creative headline."),
      primaryText: z.string().optional().describe("Creative primary text."),
      description: z.string().optional().describe("Creative description (optional)."),
      ctaType: z.string().optional().default("LEARN_MORE").describe("CTA type (e.g. LEARN_MORE)."),
      landingUrl: z.string().optional().describe("Landing page URL."),
      name: z.string().optional().describe("Creative name override (optional)."),
      scenePreset: z.string().optional().describe("Harshboii scene preset (default sensitive)."),
    });
    type PrepareMetaVideoCreativeInput = z.infer<typeof prepareMetaVideoCreativeInputSchema>;

    server.registerTool(
      "prepare_meta_video_creative",
      {
        title: "Prepare Meta video creative (upload + analyze)",
        description:
          "Authenticate by company password, ingest an uploaded video, store it to R2 + Cloudflare Stream, upload as a Meta ad video, create a Meta ad creative using that video, enqueue Harshboii asset-intelligence analysis, and return ad set options plus tracking ids.",
        inputSchema: (prepareMetaVideoCreativeInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const auth = await loadMetaIntegrationByPassword(input);
        if ("error" in auth) {
          return { content: [{ type: "text" as const, text: auth.error }] };
        }

        const parsed = prepareMetaVideoCreativeInputSchema.safeParse(input);
        if (!parsed.success) {
          return { content: [{ type: "text" as const, text: "Error: Invalid input." }] };
        }
        const opts = parsed.data as PrepareMetaVideoCreativeInput;

        const bucket = process.env.R2_BUCKET_NAME ?? "";
        if (!bucket) {
          return { content: [{ type: "text" as const, text: "Error: R2_BUCKET_NAME must be set." }] };
        }

        const fileName = safeFilename(opts.filename);
        const bytes = Buffer.from(stripDataUrlBase64(opts.videoBase64), "base64");
        if (!bytes.length) {
          return { content: [{ type: "text" as const, text: "Error: Empty video bytes." }] };
        }

        const r2Key = `assets/${auth.company.id}/uploads/${Date.now()}-${fileName}`;

        console.log("[mcp][prepare_meta_video_creative] start", {
          companyId: auth.company.id,
          filename: fileName,
          bytes: bytes.length,
          r2Key,
        });

        await streamToR2({
          body: bytes,
          key: r2Key,
          contentType: opts.mimeType,
          bucket,
        });

        const landingUrl =
          (typeof opts.landingUrl === "string" && opts.landingUrl.trim()) ||
          (auth.company.website?.trim() ?? "") ||
          "https://immortel.vercel.app";
        const headline = (opts.headline?.trim() || fileName.replace(/\.[^.]+$/, "") || "Video Ad").slice(0, 255);
        const primaryText = opts.primaryText?.trim() || "";
        const description = opts.description?.trim() || "";
        const ctaType = opts.ctaType?.trim() || "LEARN_MORE";
        const creativeName = (opts.name?.trim() || headline || "Creative").slice(0, 255);

        const asset = await prisma.asset.create({
          data: {
            companyId: auth.company.id,
            assetType: "VIDEO",
            title: headline,
            filename: fileName,
            originalSize: BigInt(bytes.length),
            status: "PROCESSING",
            r2Key,
            r2Bucket: bucket,
            mimeType: opts.mimeType,
            intelligenceStatus: "PENDING",
            metadata: {
              source: "mcp_meta_ad",
            },
            uploadSource: "NATIVE",
          },
          select: { id: true },
        });

        const streamUpload = await streamToCloudflareStream({
          body: new Blob([bytes], { type: opts.mimeType }),
          filename: fileName,
          metadata: {
            source: "mcp_meta_ad",
            companyId: auth.company.id,
            assetId: asset.id,
          },
        });

        await pollStreamReady(streamUpload.uid, { maxAttempts: 20, delayMs: 2000 });
        const playbackUrl = streamMp4PlaybackUrl(streamUpload.uid);
        const thumbnailUrl = streamUpload.thumbnail ?? null;

        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            status: "READY",
            streamId: streamUpload.uid,
            playbackUrl,
            thumbnailUrl,
          },
        });

        let metaVideoId: string | null = null;
        let metaVideoStatus: "ready" | "processing" = "ready";
        try {
          const adv = (await graphPost(
            `${auth.integration.actId}/advideos`,
            { file_url: playbackUrl },
            { accessToken: auth.integration.accessToken },
          )) as { id?: string };
          metaVideoId = adv.id ?? null;
        } catch (e) {
          metaVideoStatus = "processing";
          console.log("[mcp][prepare_meta_video_creative] advideos error", {
            error: e instanceof Error ? e.message : String(e),
            payload: (e as any)?.payload ?? null,
          });
        }

        const metaMedia = await prisma.metaMedia.create({
          data: {
            metaIntegrationId: auth.integration.integrationId,
            kind: "video",
            videoId: metaVideoId,
            assetId: asset.id,
            videoUrl: playbackUrl,
            videoStreamId: streamUpload.uid,
            thumbnailUrl,
            r2Key,
            filename: fileName,
            mimeType: opts.mimeType,
            bytes: bytes.length,
            status: metaVideoStatus,
          },
          select: { id: true },
        });

        let metaCreativeId: string | null = null;
        try {
          if (metaVideoId) {
            const object_story_spec = {
              page_id: auth.integration.fbPageId,
              link_data: {
                message: primaryText,
                link: landingUrl,
                name: headline,
                ...(description ? { description } : {}),
                call_to_action: {
                  type: ctaType,
                  value: { link: landingUrl },
                },
                video_id: metaVideoId,
              },
            };

            const created = (await graphPost(
              `${auth.integration.actId}/adcreatives`,
              { name: creativeName, object_story_spec },
              { accessToken: auth.integration.accessToken },
            )) as { id?: string };

            metaCreativeId = created.id ?? null;
          }
        } catch (e) {
          console.log("[mcp][prepare_meta_video_creative] adcreatives error", {
            error: e instanceof Error ? e.message : String(e),
            payload: (e as any)?.payload ?? null,
          });
        }

        const creativeRow = await prisma.metaCreative.create({
          data: {
            metaIntegrationId: auth.integration.integrationId,
            metaCampaignId: null,
            metaCreativeId,
            imageHash: null,
            videoId: metaVideoId,
            headline,
            primaryText,
            description: description || null,
            ctaType,
            landingUrl,
            videoUrl: playbackUrl,
            videoStreamId: streamUpload.uid,
            thumbnailUrl,
            aiGenerated: false,
          },
          select: { id: true },
        });

        // Enqueue Harshboii analysis.
        const appUrl = requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
        const baseUrl = processingBaseUrl();
        const api_url = `${appUrl}/api/videos/${asset.id}/download`;
        const harshPayload = {
          api_url,
          asset_Id: asset.id,
          asset_type: "VIDEO",
          scene_preset: opts.scenePreset ?? "sensitive",
        };

        const harshRes = await fetch(`${baseUrl}/process-from-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(harshPayload),
        });
        const harshJson = await harshRes.json().catch(() => null);
        if (!harshRes.ok) {
          const errText =
            typeof harshJson === "object" && harshJson && "error" in harshJson
              ? String((harshJson as any).error)
              : `process-from-api HTTP ${harshRes.status}`;
          return { content: [{ type: "text" as const, text: `Error: ${errText}` }], structuredContent: harshJson };
        }

        const analysisJobId = extractJobId(harshJson);

        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            intelligenceStatus: "PROCESSING",
            metadata: {
              source: "mcp_meta_ad",
              harshboii: {
                baseUrl,
                jobId: analysisJobId,
                response: harshJson,
              },
              meta: {
                metaMediaId: metaMedia.id,
                metaVideoId,
                metaCreativeId,
                creativeDbId: creativeRow.id,
              },
            },
          },
        });

        const adSets = await prisma.metaAdSet.findMany({
          where: { metaIntegrationId: auth.integration.integrationId },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: {
            id: true,
            metaAdSetId: true,
            name: true,
            campaign: { select: { name: true, metaCampaignId: true } },
          },
        });

        const structuredContent = {
          assetId: asset.id,
          r2Key,
          r2Bucket: bucket,
          streamId: streamUpload.uid,
          playbackUrl,
          thumbnailUrl,
          metaMediaDbId: metaMedia.id,
          metaVideoId,
          metaVideoStatus,
          creativeDbId: creativeRow.id,
          metaCreativeId,
          analysis: {
            baseUrl,
            enqueued: true,
            api_url,
            response: harshJson,
          },
          analysisJobId,
          adSets: adSets.map((a) => ({
            adSetDbId: a.id,
            metaAdSetId: a.metaAdSetId,
            name: a.name,
            campaignName: a.campaign?.name ?? null,
            metaCampaignId: a.campaign?.metaCampaignId ?? null,
          })),
          next: {
            tool: "list_post_ad_options",
            required: ["assetId"],
            confirmMessage:
              "Next: list selectable ad sets (the creative will be the same uploaded video asset).",
          },
        };

        return {
          content: [
            {
              type: "text" as const,
              text:
                `Prepared video + creative.\n` +
                `assetId=${asset.id}\n` +
                `metaVideoId=${metaVideoId ?? "processing"}\n` +
                `metaCreativeId=${metaCreativeId ?? "missing"}\n` +
                `analysisJobId=${analysisJobId ?? "unknown"}\n` +
                `Next: call list_post_ad_options with assetId, then post_ad_to_meta.`,
            },
          ],
          structuredContent,
        };
      }) as any
    );

    // ─── get_video_processing_status ─────────────────────────────────────────

    const getVideoProcessingStatusInputSchema = passwordAuthSchema.extend({
      assetId: z.string().optional().describe("Immortel Asset id to check."),
      analysisJobId: z.string().optional().describe("Harshboii job/request id to check."),
    });
    type GetVideoProcessingStatusInput = z.infer<typeof getVideoProcessingStatusInputSchema>;

    server.registerTool(
      "get_video_processing_status",
      {
        title: "Get video processing status (Harshboii)",
        description:
          "Authenticate by company password and fetch the Harshboii processing status for an analyzed video (by assetId or analysisJobId). Also returns local Asset intelligenceStatus.",
        inputSchema: (getVideoProcessingStatusInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const auth = await loadMetaIntegrationByPassword(input);
        if ("error" in auth) {
          return { content: [{ type: "text" as const, text: auth.error }] };
        }
        const parsed = getVideoProcessingStatusInputSchema.safeParse(input);
        if (!parsed.success) {
          return { content: [{ type: "text" as const, text: "Error: Invalid input." }] };
        }
        const { assetId, analysisJobId } = parsed.data as GetVideoProcessingStatusInput;
        if (!assetId && !analysisJobId) {
          return {
            content: [{ type: "text" as const, text: "Error: Provide `assetId` or `analysisJobId`." }],
          };
        }

        const baseUrl = processingBaseUrl();

        const asset =
          assetId
            ? await prisma.asset.findFirst({
                where: { id: assetId, companyId: auth.company.id },
                select: { id: true, intelligenceStatus: true, metadata: true },
              })
            : null;

        if (assetId && !asset) {
          return { content: [{ type: "text" as const, text: "Error: Asset not found." }] };
        }

        const metadata = (asset?.metadata ?? {}) as any;
        const jobIdFromAsset =
          metadata?.harshboii?.jobId ||
          metadata?.harshboii?.job_id ||
          metadata?.harshboii?.requestId ||
          metadata?.harshboii?.request_id ||
          null;

        const jobId = (analysisJobId?.trim() || jobIdFromAsset || "").trim() || null;

        let remote: unknown = null;
        if (jobId) {
          const tryPaths = [`/status/${encodeURIComponent(jobId)}`, `/jobs/${encodeURIComponent(jobId)}`];
          for (const p of tryPaths) {
            const res = await fetch(`${baseUrl}${p}`, { method: "GET" }).catch(() => null);
            if (!res) continue;
            if (res.ok) {
              remote = await res.json().catch(() => null);
              break;
            }
            if (res.status === 404) continue;
            const t = await res.text().catch(() => "");
            remote = { ok: false, status: res.status, text: t };
            break;
          }
        }

        // If we already have intelligence rows, prefer them as “READY”.
        const intel =
          asset?.id
            ? await prisma.assetIntelligence.findFirst({
                where: { assetId: asset.id, companyId: auth.company.id },
                orderBy: { processedAt: "desc" },
              })
            : null;

        if (asset?.id && intel && asset.intelligenceStatus !== "READY") {
          await prisma.asset.update({
            where: { id: asset.id },
            data: { intelligenceStatus: "READY" },
          });
        }

        const structuredContent = {
          assetId: asset?.id ?? null,
          analysisJobId: jobId,
          assetIntelligenceStatus: intel ? "READY" : (asset?.intelligenceStatus ?? null),
          remote,
          latestIntelligence: intel ?? null,
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }],
          structuredContent,
        };
      }) as any
    );

    // ─── list_post_ad_options ────────────────────────────────────────────────

    const listPostAdOptionsInputSchema = passwordAuthSchema.extend({
      assetId: z
        .string()
        .min(1)
        .describe("Asset id from prepare_meta_video_creative (the uploaded video)."),
    });
    type ListPostAdOptionsInput = z.infer<typeof listPostAdOptionsInputSchema>;

    server.registerTool(
      "list_post_ad_options",
      {
        title: "List options to post Meta ad",
        description:
          "Authenticate by company password and return selectable options for posting an ad: a list of ad sets to choose from, and the fixed creativeDbId/metaCreativeId associated with the uploaded video asset.",
        inputSchema: (listPostAdOptionsInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const auth = await loadMetaIntegrationByPassword(input);
        if ("error" in auth) {
          return { content: [{ type: "text" as const, text: auth.error }] };
        }

        const parsed = listPostAdOptionsInputSchema.safeParse(input);
        if (!parsed.success) {
          return { content: [{ type: "text" as const, text: "Error: Invalid input." }] };
        }

        const { assetId } = parsed.data as ListPostAdOptionsInput;

        const asset = await prisma.asset.findFirst({
          where: { id: assetId, companyId: auth.company.id },
          select: { id: true, metadata: true },
        });
        if (!asset) {
          return { content: [{ type: "text" as const, text: "Error: Asset not found." }] };
        }

        const md = (asset.metadata ?? {}) as any;
        const creativeDbId =
          typeof md?.meta?.creativeDbId === "string" && md.meta.creativeDbId.trim()
            ? md.meta.creativeDbId.trim()
            : null;
        const metaCreativeId =
          typeof md?.meta?.metaCreativeId === "string" && md.meta.metaCreativeId.trim()
            ? md.meta.metaCreativeId.trim()
            : null;

        let metaCreativeIdResolved = metaCreativeId;
        if (creativeDbId && !metaCreativeIdResolved) {
          const c = await prisma.metaCreative.findFirst({
            where: { id: creativeDbId, metaIntegrationId: auth.integration.integrationId },
            select: { metaCreativeId: true },
          });
          metaCreativeIdResolved = c?.metaCreativeId ?? null;
        }

        const adSets = await prisma.metaAdSet.findMany({
          where: { metaIntegrationId: auth.integration.integrationId },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: {
            id: true,
            metaAdSetId: true,
            name: true,
            campaign: { select: { name: true, metaCampaignId: true } },
          },
        });

        const structuredContent = {
          assetId,
          creativeDbId,
          metaCreativeId: metaCreativeIdResolved,
          adSets: adSets.map((a) => ({
            adSetDbId: a.id,
            metaAdSetId: a.metaAdSetId,
            name: a.name,
            campaignName: a.campaign?.name ?? null,
            metaCampaignId: a.campaign?.metaCampaignId ?? null,
          })),
          next: {
            tool: "post_ad_to_meta",
            required: ["adSetDbId", "creativeDbId", "confirmReuseAsset"],
            confirmMessage:
              "Confirm we will use the same uploaded video asset as the creative you just prepared.",
          },
        };

        return {
          content: [
            {
              type: "text" as const,
              text:
                `Select an ad set and confirm reuse of the same creative.\n` +
                `assetId=${assetId}\n` +
                `creativeDbId=${creativeDbId ?? "missing"}\n` +
                `metaCreativeId=${metaCreativeIdResolved ?? "missing"}\n` +
                `Then call post_ad_to_meta with adSetDbId + creativeDbId + confirmReuseAsset=true.`,
            },
          ],
          structuredContent,
        };
      }) as any
    );

    // ─── post_ad_to_meta ─────────────────────────────────────────────────────

    const postAdToMetaInputSchema = passwordAuthSchema.extend({
      adSetDbId: z.string().min(1).describe("MetaAdSet DB id (from adSets list)."),
      creativeDbId: z.string().optional().describe("MetaCreative DB id (from prepare_meta_video_creative)."),
      metaCreativeId: z.string().optional().describe("Meta creative id (Graph) if not using creativeDbId."),
      name: z.string().optional().describe("Ad name (optional)."),
      confirmReuseAsset: z.boolean().describe("Must be true to confirm reuse of uploaded asset as creative."),
    });
    type PostAdToMetaInput = z.infer<typeof postAdToMetaInputSchema>;

    server.registerTool(
      "post_ad_to_meta",
      {
        title: "Post ad to Meta (create ad)",
        description:
          "Authenticate by company password, select an ad set, confirm reuse of the prepared asset as the creative, then create a Meta ad (PAUSED) using the prepared Meta creative.",
        inputSchema: (postAdToMetaInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const auth = await loadMetaIntegrationByPassword(input);
        if ("error" in auth) {
          return { content: [{ type: "text" as const, text: auth.error }] };
        }
        const parsed = postAdToMetaInputSchema.safeParse(input);
        if (!parsed.success) {
          return { content: [{ type: "text" as const, text: "Error: Invalid input." }] };
        }
        const { adSetDbId, creativeDbId, metaCreativeId, name, confirmReuseAsset } =
          parsed.data as PostAdToMetaInput;

        if (confirmReuseAsset !== true) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: You must set confirmReuseAsset=true to post this ad using the same uploaded asset as the creative.",
              },
            ],
          };
        }

        const adSet = await prisma.metaAdSet.findFirst({
          where: { id: adSetDbId, metaIntegrationId: auth.integration.integrationId },
          select: { id: true, metaAdSetId: true, campaignId: true },
        });
        if (!adSet) {
          return { content: [{ type: "text" as const, text: "Error: Ad set not found." }] };
        }

        let metaCreativeIdOut: string | null = metaCreativeId?.trim() || null;
        let creativeDbIdOut: string | null = creativeDbId?.trim() || null;
        if (creativeDbIdOut) {
          const c = await prisma.metaCreative.findFirst({
            where: { id: creativeDbIdOut, metaIntegrationId: auth.integration.integrationId },
            select: { id: true, metaCreativeId: true },
          });
          if (!c) {
            return { content: [{ type: "text" as const, text: "Error: Creative not found." }] };
          }
          creativeDbIdOut = c.id;
          metaCreativeIdOut = c.metaCreativeId ?? null;
        }

        if (!metaCreativeIdOut) {
          return { content: [{ type: "text" as const, text: "Error: Missing metaCreativeId." }] };
        }

        const adName = (name?.trim() || "Ad").slice(0, 255);

        const created = (await graphPost(
          `${auth.integration.actId}/ads`,
          {
            name: adName,
            adset_id: adSet.metaAdSetId,
            creative: { creative_id: metaCreativeIdOut },
            status: "PAUSED",
          },
          { accessToken: auth.integration.accessToken },
        )) as { id?: string };

        const metaAdId = created.id ?? null;
        if (!metaAdId) {
          return { content: [{ type: "text" as const, text: "Error: Meta did not return ad id." }] };
        }

        const row = await prisma.metaAd.create({
          data: {
            metaIntegrationId: auth.integration.integrationId,
            adSetId: adSet.id,
            metaCreativeDbId: creativeDbIdOut,
            metaAdId,
            name: adName,
            status: "PAUSED",
          },
          select: { id: true },
        });

        // Keep legacy convenience on campaign, mirroring existing API behavior.
        await prisma.metaCampaign.update({
          where: { id: adSet.campaignId },
          data: { metaAdId },
        });

        const structuredContent = { ok: true, metaAdId, adDbId: row.id, metaCreativeId: metaCreativeIdOut };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }],
          structuredContent,
        };
      }) as any
    );

    // ─── heygen_agent_generate_video ─────────────────────────────────────────

    const heygenAgentGenerateVideoInputSchema = z.object({
      password: z
        .string()
        .min(1)
        .describe("Company account password (used for authentication). Required."),
      email: z.string().optional().describe("Optional email hint to narrow lookup."),
      companyName: z.string().optional().describe("Optional company name/slug hint to narrow lookup."),
      userName: z.string().optional().describe("Optional company userName hint to narrow lookup."),
      prompt: z.string().min(1).describe("Prompt to send to HeyGen Video Agent."),
      timeoutMs: z
        .number()
        .int()
        .optional()
        .describe("Polling timeout in ms (default 90000). Max 120000."),
      pollEveryMs: z
        .number()
        .int()
        .optional()
        .describe("Polling interval in ms (default 2000). Min 500, max 5000."),
    });
    type HeygenAgentGenerateVideoInput = z.infer<typeof heygenAgentGenerateVideoInputSchema>;

    server.registerTool(
      "heygen_agent_generate_video",
      {
        title: "Generate HeyGen video (Video Agent)",
        description:
          "Authenticate a company by password and start a HeyGen Video Agent generation. This tool polls until HeyGen assigns a `video_id`, then returns `heygenVideoId` (and also `jobId/sessionId`).",
        inputSchema: (heygenAgentGenerateVideoInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const { password, email, companyName, userName, prompt, timeoutMs, pollEveryMs } =
          input as HeygenAgentGenerateVideoInput;

        const url = new URL("/api/mcp/heygen/agents/start", IMMORTEL_BASE_URL);
        const body: Record<string, unknown> = { password, prompt };
        if (email) body.email = email;
        if (companyName) body.companyName = companyName;
        if (userName) body.userName = userName;
        if (typeof timeoutMs === "number") body.timeoutMs = timeoutMs;
        if (typeof pollEveryMs === "number") body.pollEveryMs = pollEveryMs;

        console.log("[heygen_agent_generate_video] →", url.toString());

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !(data as any)?.ok) {
          const errText =
            typeof (data as any)?.error === "string"
              ? `Error: ${(data as any).error}`
              : `Error: HTTP ${res.status}`;
          return { content: [{ type: "text" as const, text: errText }], structuredContent: data };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(data) }],
          structuredContent: data,
        };
      }) as any
    );

    // ─── heygen_video_status ────────────────────────────────────────────────

    const heygenVideoStatusInputSchema = z.object({
      password: z
        .string()
        .min(1)
        .describe("Company account password (used for authentication). Required."),
      email: z.string().optional().describe("Optional email hint to narrow lookup."),
      companyName: z.string().optional().describe("Optional company name/slug hint to narrow lookup."),
      userName: z.string().optional().describe("Optional company userName hint to narrow lookup."),
      videoId: z.string().min(1).describe("HeyGen video id (video_id)."),
    });
    type HeygenVideoStatusInput = z.infer<typeof heygenVideoStatusInputSchema>;

    server.registerTool(
      "heygen_video_status",
      {
        title: "Get HeyGen video status",
        description:
          "Authenticate a company by password and query HeyGen `GET /v3/videos/{video_id}`. Returns status and (when ready) `videoUrl`.",
        inputSchema: (heygenVideoStatusInputSchema as any).shape,
      },
      (async (input: unknown) => {
        const { password, email, companyName, userName, videoId } = input as HeygenVideoStatusInput;
        const url = new URL("/api/mcp/heygen/videos/status", IMMORTEL_BASE_URL);

        const body: Record<string, unknown> = { password, videoId };
        if (email) body.email = email;
        if (companyName) body.companyName = companyName;
        if (userName) body.userName = userName;

        console.log("[heygen_video_status] →", url.toString(), "videoId:", videoId);

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !(data as any)?.ok) {
          const errText =
            typeof (data as any)?.error === "string"
              ? `Error: ${(data as any).error}`
              : `Error: HTTP ${res.status}`;
          return { content: [{ type: "text" as const, text: errText }], structuredContent: data };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(data) }],
          structuredContent: data,
        };
      }) as any
    );

    // ─── UI Resources ────────────────────────────────────────────────────────
  
    registerAppResource(
      server,
      "Immortel Product List",
      productListResourceUri,
      { description: "Product listing widget for Immortel catalog" },
      async () => ({
        contents: [{
          uri: productListResourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="openai-widget" content="true" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Immortel Products</title>
    </head>
    <body>
      <div id="root"></div>
      <script src="${process.env.WIDGET_PRODUCT_LIST_URL ?? `${WIDGET_DOMAIN}/widget/product-list.js`}"></script>
    </body>
  </html>`,
          _meta: {
            ui: {
              csp: {
                resourceDomains: [WIDGET_DOMAIN],
                connectDomains: [WIDGET_DOMAIN],
              },
            },
          },
        }],
      })
    );
  
    registerAppResource(
      server,
      "Immortel Checkout",
      checkoutResourceUri,
      { description: "Checkout widget for Immortel products" },
      async () => ({
        contents: [{
          uri: checkoutResourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="openai-widget" content="true" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Immortel Checkout</title>
    </head>
    <body>
      <div id="root"></div>
      <script src="${process.env.WIDGET_CHECKOUT_URL ?? `${WIDGET_DOMAIN}/widget/checkout.js`}"></script>
    </body>
  </html>`,
          _meta: {
            ui: {
              csp: {
                resourceDomains: [WIDGET_DOMAIN],
                connectDomains: [WIDGET_DOMAIN],
              },
            },
          },
        }],
      })
    );
  
    return server;
  }
  
  // ─── HTTP entrypoint ─────────────────────────────────────────────────────────
  
  // const app = createMcpExpressApp({ host: "0.0.0.0" });
  
  // app.all("/mcp", async (req: Request, res: Response) => {
  //   const server = createServer();
  //   const transport = new StreamableHTTPServerTransport({
  //     sessionIdGenerator: undefined,
  //   });
  
  //   res.on("close", () => {
  //     transport.close().catch(() => {});
  //     server.close().catch(() => {});
  //   });
  
  //   try {
  //     await server.connect(transport);
  //     await transport.handleRequest(req, res, (req as any).body);
  //   } catch (error) {
  //     console.error("MCP error:", error);
  //     if (!res.headersSent) {
  //       res.status(500).json({
  //         jsonrpc: "2.0",
  //         error: { code: -32603, message: "Internal server error" },
  //         id: null,
  //       });
  //     }
  //   }
  // });
  
  // const httpServer = app.listen(PORT, (err?: Error) => {
  //   if (err) { console.error("Failed to start:", err); process.exit(1); }
  //   console.log(`MCP server listening on http://localhost:${PORT}/mcp`);
  // });
  
  // process.on("SIGINT", () => { httpServer.close(() => process.exit(0)); });
  // process.on("SIGTERM", () => { httpServer.close(() => process.exit(0)); });
  