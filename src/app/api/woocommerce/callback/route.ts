import { NextResponse } from "next/server";
import { encrypt } from "@/lib/wordpress/crypto";
import { prisma } from "@/lib/prisma";

type WcAuthBody = {
  key_id?: number;
  user_id?: string;
  consumer_key?: string;
  consumer_secret?: string;
  key_permissions?: string;
};

export async function POST(req: Request) {
  let body: WcAuthBody;
  try {
    body = (await req.json()) as WcAuthBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const consumerKey = typeof body.consumer_key === "string" ? body.consumer_key.trim() : "";
  const consumerSecret =
    typeof body.consumer_secret === "string" ? body.consumer_secret.trim() : "";

  if (!userId || !consumerKey || !consumerSecret) {
    return NextResponse.json(
      { success: false, error: "Missing user_id, consumer_key, or consumer_secret" },
      { status: 400 }
    );
  }

  const pending = await prisma.wooCommerceOAuthPending.findUnique({
    where: { state: userId },
  });

  if (!pending) {
    return NextResponse.json(
      { success: false, error: "Unknown or expired authorization state" },
      { status: 400 }
    );
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    await prisma.wooCommerceOAuthPending.delete({ where: { state: userId } }).catch(() => {});
    return NextResponse.json(
      { success: false, error: "Authorization expired; start connect again" },
      { status: 400 }
    );
  }

  const keyId = typeof body.key_id === "number" && Number.isFinite(body.key_id) ? body.key_id : null;
  const keyPermissions =
    typeof body.key_permissions === "string" ? body.key_permissions.trim() : null;

  let consumerKeyEnc: string;
  let consumerSecretEnc: string;
  try {
    consumerKeyEnc = encrypt(consumerKey);
    consumerSecretEnc = encrypt(consumerSecret);
  } catch (e) {
    console.error("[WooCommerce callback] encrypt failed:", e);
    return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500 });
  }

  const companyId = pending.companyId;
  const storeUrl = pending.storeUrl;

  await prisma.$transaction([
    prisma.wooCommerceStore.upsert({
      where: {
        companyId_storeUrl: { companyId, storeUrl },
      },
      create: {
        companyId,
        storeUrl,
        consumerKeyEnc,
        consumerSecretEnc,
        wcKeyId: keyId,
        keyPermissions,
        status: "installed",
      },
      update: {
        consumerKeyEnc,
        consumerSecretEnc,
        wcKeyId: keyId,
        keyPermissions,
        status: "installed",
        installedAt: new Date(),
      },
    }),
    prisma.wooCommerceOAuthPending.delete({ where: { state: userId } }),
  ]);

  return NextResponse.json({ success: true });
}
