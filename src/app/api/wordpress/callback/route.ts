import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/wordpress/crypto";

function b64urlDecodeToUtf8(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(`${b64}${pad}`, "base64").toString("utf8");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const rawState = searchParams.get("state");
  const userLogin = searchParams.get("user_login");
  const password = searchParams.get("password");

  if (!rawState || !userLogin || !password) {
    return redirect("/connection/wordpress?error=wp_missing_params");
  }

  let parsed: {
    tenantId: string;
    siteUrl: string;
    siteTitle: string | null;
    authUrl: string;
  };

  try {
    parsed = JSON.parse(b64urlDecodeToUtf8(rawState)) as typeof parsed;
  } catch {
    return redirect("/connection/wordpress?error=wp_invalid_state");
  }

  const tenantId = parsed?.tenantId;
  const siteUrl = parsed?.siteUrl;
  const siteTitle = parsed?.siteTitle ?? null;
  const authUrl = parsed?.authUrl;

  if (!tenantId || !siteUrl || !authUrl) {
    return redirect("/connection/wordpress?error=wp_invalid_state");
  }

  const cleanPassword = password.replace(/\s+/g, "");
  const base64Creds = Buffer.from(`${userLogin}:${cleanPassword}`, "utf8").toString(
    "base64"
  );
  const encryptedCreds = encrypt(base64Creds);

  await prisma.wordPressIntegration.upsert({
    where: { tenantId },
    create: {
      tenantId,
      siteUrl,
      authUrl,
      userLogin,
      credentials: encryptedCreds,
      siteTitle,
      status: "active",
    },
    update: {
      siteUrl,
      authUrl,
      userLogin,
      credentials: encryptedCreds,
      siteTitle,
      status: "active",
      connectedAt: new Date(),
    },
  });

  return redirect("/connection/wordpress?wordpress_connected=1");
}

