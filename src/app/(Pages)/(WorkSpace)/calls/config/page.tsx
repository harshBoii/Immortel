import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CallsConfigDashboard from "./CallsConfigDashboard";

export const dynamic = "force-dynamic";

export default async function CallsConfigPage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");

  const config = await (prisma as any).callConfig.findUnique({
    where: { companyId: session.companyId },
  });

  return <CallsConfigDashboard initial={config ?? null} />;
}

