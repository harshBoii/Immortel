// lib/shopify-webhook.js

import crypto from 'crypto'
import { NextRequest } from 'next/server'
export async function verifyShopifyWebhook(req: NextRequest) {
  const rawBody = await req.text()
  const hmac = req.headers.get('X-Shopify-Hmac-SHA256')

  if (!hmac) return { valid: false, body: null }

  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET || '')
    .update(rawBody, 'utf8')
    .digest('base64')

  return {
    valid: hash === hmac,
    body: JSON.parse(rawBody)
  }
}
