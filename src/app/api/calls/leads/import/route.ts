import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";
import { IntegrationProvider, LeadStage } from "@prisma/client";

/**
 * CSV importer for Leads. Accepts either:
 *   - `multipart/form-data` with a `file` field, or
 *   - `text/csv` raw body.
 *
 * CSV header is required. Recognised columns (case-insensitive):
 *   name, phone, email, city, industry, source, intentScore, tags, notes, timezone,
 *   product_id, product_name.
 * `tags` may be pipe-separated (`retail|fashion`).
 */

const REQUIRED = ["name", "phone"];

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') quoted = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((l) => splitCsvLine(l));
  return { headers, rows };
}

export async function POST(request: Request) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";
  let csvText = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    csvText = await request.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty CSV body" }, { status: 400 });
  }

  const { headers, rows } = parseCsv(csvText);
  if (headers.length === 0) {
    return NextResponse.json({ error: "CSV missing header row" }, { status: 400 });
  }
  for (const r of REQUIRED) {
    if (!headers.includes(r)) {
      return NextResponse.json(
        { error: `CSV missing required column '${r}'` },
        { status: 400 }
      );
    }
  }

  const idx = (col: string) => headers.indexOf(col);
  const iName = idx("name");
  const iPhone = idx("phone");
  const iEmail = idx("email");
  const iCity = idx("city");
  const iIndustry = idx("industry");
  const iSource = idx("source");
  const iIntent = idx("intentscore");
  const iTags = idx("tags");
  const iNotes = idx("notes");
  const iTz = idx("timezone");
  const iProductId = idx("product_id");
  const iProductName = idx("product_name");

  const created: string[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[iName] ?? "").trim();
    const phone = (row[iPhone] ?? "").trim();
    if (!name || !phone) {
      skipped.push({ row: i + 2, reason: "Missing name or phone" });
      continue;
    }

    const tags =
      iTags >= 0 && row[iTags]
        ? row[iTags]
            .split("|")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    const productExternalId =
      iProductId >= 0 ? row[iProductId]?.trim() || null : null;
    const productName =
      iProductName >= 0 ? row[iProductName]?.trim() || null : null;
    const productProvider: IntegrationProvider | null =
      productExternalId && productExternalId.startsWith("gid://")
        ? IntegrationProvider.Shopify
        : productExternalId && /^\d+$/.test(productExternalId)
          ? IntegrationProvider.WooCommerce
          : null;

    try {
      const lead = await prisma.lead.create({
        data: ({
          companyId: session.companyId,
          name: name.slice(0, 255),
          phone: phone.slice(0, 32),
          email: iEmail >= 0 ? row[iEmail]?.trim() || null : null,
          city: iCity >= 0 ? row[iCity]?.trim() || null : null,
          industry: iIndustry >= 0 ? row[iIndustry]?.trim() || null : null,
          source: iSource >= 0 ? row[iSource]?.trim() || null : null,
          intentScore:
            iIntent >= 0 ? Math.max(0, Math.min(100, parseInt(row[iIntent] ?? "0", 10) || 0)) : 0,
          tags,
          notes: iNotes >= 0 ? row[iNotes] || null : null,
          timezone: iTz >= 0 ? row[iTz]?.trim() || null : null,
          productProvider,
          productExternalId,
          productName: productName ? productName.slice(0, 500) : null,
          stage: LeadStage.NEW,
        } as unknown as Parameters<typeof prisma.lead.create>[0]["data"]),
      });
      created.push(lead.id);
    } catch (err) {
      skipped.push({
        row: i + 2,
        reason: err instanceof Error ? err.message : "DB insert failed",
      });
    }
  }

  return NextResponse.json({
    created: created.length,
    skipped: skipped.length,
    errors: skipped,
  });
}
