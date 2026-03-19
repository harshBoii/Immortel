// app/api/webhooks/customers-redact/route.js

import { verifyShopifyWebhook } from '@/lib/shopify/webhook'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { valid, body } = await verifyShopifyWebhook(req)

  if (!valid) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete this customer's data from your DB
  // body.customer.id → the customer to delete
  console.log('Redact customer:', body.customer?.id, body.shop_domain)

  // TODO: delete customer data from your database here

  return Response.json({ success: true }, { status: 200 })
}
