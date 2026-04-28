# Meta Winning Formula Contracts

This document defines:
- The **POST request** our app sends to the **Harshboii** microservice to build a `winningFormula`.
- The **webhook contract** Harshboii uses to send the `winningFormula` back to our app (async mode).

---

## 1) Microservice: Build Winning Formula (sync)

### Endpoint
- **Method**: `POST`
- **URL**: `${PROCESSING_API_BASE}/winning-formula/from-meta-analyzed-assets`

### Request headers
- `Content-Type: application/json`

### Request body (JSON)

```json
{
  "company_id": "string",
  "meta_integration_id": "string",
  "generated_at": "2026-04-28T12:34:56.000Z",
  "items": [
    {
      "asset": {
        "id": "string",
        "asset_type": "VIDEO|IMAGE",
        "title": "string",
        "filename": "string",
        "intelligence_status": "READY|PROCESSING|FAILED|null"
      },
      "asset_intelligence": {
        "id": "string|null",
        "asset_id": "string",
        "company_id": "string",
        "processed_at": "2026-04-28T12:34:56.000Z|null",
        "language": "string|null",
        "content_type": "string|null",
        "duration_seconds": 0,
        "theme": "string|null",
        "sentiment": "string|null",
        "intensity_score": 0,
        "spiritual_elements": false,
        "title_primary": "string|null",
        "short_summary": "string|null",
        "long_description": "string|null",
        "tags": ["string"],
        "tone": ["string"],
        "topics": ["string"],
        "target_audience": ["string"],
        "best_platforms": ["string"],
        "visual_context": ["string"],
        "video_genres": ["string"],
        "title_variants": {},
        "chapters": [],
        "shorts_hooks": [],
        "clipfox_insights": [],
        "model_version": "string|null",
        "confidence": 0
      },
      "meta_media": {
        "id": "string",
      },
      "meta_ad_metrics_latest": {
        "recorded_at": "2026-04-28T12:34:56.000Z|null",
        "date_preset": "string|null",
        "impressions": 0,
        "clicks": 0,
        "ctr": 0,
        "spend": 0,
        "cpc": null,
        "roas": null
      }
    }
  ]
}
```

Notes:
- `asset_intelligence` should contain **all fields** from `AssetIntelligence` (including arrays + json fields).\n+- If an asset has no intelligence row yet, microservice should accept `asset_intelligence: null` OR accept the object with `id=null` and empty defaults.\n+
### Response body (200 JSON)

```json
{
  "ok": true,
  "winningFormula": {}
}
```

### Error responses
- `400`:\n+
```json
{ "ok": false, "error": "Invalid payload", "details": {} }
```
\n+- `500`:\n+
```json
{ "ok": false, "error": "Internal error" }
```

---

## 2) Webhook: Winning Formula Ready (async)

Use this if Harshboii enqueues the formula build and calls back later.

### Endpoint (our app)
- **Method**: `POST`
- **URL**: `/api/meta/winning-formula/webhook`

### Headers
- `Content-Type: application/json`
- `x-webhook-signature: <hmac_sha256_hex(body, WEBHOOK_SECRET)>` (recommended)

### Request body (JSON)

```json
{
  "event": "meta.winning_formula.ready|meta.winning_formula.failed",
  "job_id": "string",
  "meta_id": "string",
  "company_id": "string",
  "meta_integration_id": "string",
  "generated_at": "2026-04-28T12:34:56.000Z",
  "input_summary": {
    "items_count": 0,
    "asset_ids": ["string"]
  },
  "winningFormula": {},
  "error": "string|null"
}
```

### Response (200 JSON)

```json
{ "ok": true }
```

