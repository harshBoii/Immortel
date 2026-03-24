// app/api/webhooks/shop-redact/route.js

import { verifyShopifyWebhook } from '@/lib/shopify/webhook'
import { NextRequest } from 'next/server'
export async function POST(req: NextRequest) {
  const { valid, body } = await verifyShopifyWebhook(req)

  if (!valid || !body) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Merchant uninstalled 48hrs ago — delete ALL their store data
  // body.shop_domain → the store to wipe
  console.log('Redact shop:', body.shop_domain)

  // TODO: delete all data associated with body.shop_domain from your DB

  return Response.json({ success: true }, { status: 200 })
}
