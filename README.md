This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Immortel

## Claude creative upload (public R2 URL)

This repo supports a Claude-friendly flow for large creatives:

- Claude returns a time-limited browser link (`/upload/creative?t=...`)
- The user uploads an image/video in the browser (multipart to R2)
- The page shows an `assetId` which is then passed back to Claude
- Claude calls `prepare_meta_creative` with `assetId`

### Required environment

- `R2_BUCKET_NAME`: bucket where uploads land
- `R2_PUBLIC_BASE_URL`: public base URL for that bucket (used for **video** ingestion by Meta when using `assetId`)
  - Example: `https://pub-<id>.r2.dev`

### Required Cloudflare R2 settings

- **Public access**: enable public access for the uploaded objects (videos are ingested by Meta via `file_url`)
- **CORS (browser multipart uploads)**: allow cross-origin `PUT` to the R2 S3 endpoint and expose `ETag`
  - The browser must be able to read each part upload response `ETag` header to complete the multipart upload.
