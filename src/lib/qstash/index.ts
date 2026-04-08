// lib/qstash.ts
import { Client } from "@upstash/qstash"


const client = new Client({
  baseUrl: process.env.QSTASH_URL!,
  token: process.env.QSTASH_TOKEN!,
})

const appUrl = process.env.NEXT_PUBLIC_APP_PRODUCTION_URL!

// ─── Immediate publish ────────────────────────────────────────────────────────
export async function publish(companyId: string) {
  const res = await client.publishJSON({
    url: `${appUrl}/api/qstash/callback`,
    body: { companyId },
    retries: 3,
  })
  return res // { messageId: string }
}

// ─── Scheduled publish (fires at a specific Date) ────────────────────────────
export async function scheduleAt(companyId: string, runAt: Date) {
  const res = await client.publishJSON({
    url: `${appUrl}/api/qstash/callback`,
    body: { companyId },
    notBefore: Math.floor(runAt.getTime() / 1000), // Unix seconds
    retries: 3,
  })
  return res // { messageId: string }
}

// ─── Cancel a pending message ────────────────────────────────────────────────
export async function cancelMessage(messageId: string) {
  return client.messages.cancel(messageId)
}