// app/api/webhooks/customers-data-request/route.js

import { verifyShopifyWebhook } from '@/lib/shopify/webhook'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { valid, body } = await verifyShopifyWebhook(req)

  if (!valid) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // A customer is asking what data you store about them
  // Log it or notify yourself — no deletion needed here
  console.log('Customer data request:', body.customer?.id, body.shop_domain)

  return Response.json({ success: true }, { status: 200 })
}
