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
          "Rewrite a script brief into a highly explicit, explanatory, video-generation-ready prompt in the requested language, including timecoded beats, VO/dialogue guidance, on-screen text, audio cues, negatives, and deliverables.",
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
  