export async function triggerGeoAutoSeed(companyId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/geo/auto-seed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_SECRET ?? "",
        "x-company-id": companyId,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn(`[geo/auto-seed] failed for ${companyId}:`, body);
    } else {
      console.log(`[geo/auto-seed] triggered for ${companyId}`);
    }
  } catch (err) {
    console.error(`[geo/auto-seed] error for ${companyId}:`, err);
  }
}
