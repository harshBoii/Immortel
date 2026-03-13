import { Client } from "@elastic/elasticsearch";

const ELASTICSEARCH_NODE = process.env.ELASTICSEARCH_NODE;
const ELASTICSEARCH_API_KEY = process.env.ELASTICSEARCH_API_KEY;

export const PRODUCTS_INDEX =
  process.env.ELASTICSEARCH_PRODUCTS_INDEX ??
  `immortel-products-${process.env.NODE_ENV ?? "development"}`;

let client: Client | null = null;

export function getElasticsearchClient() {
  if (client) return client;

  if (!ELASTICSEARCH_NODE) {
    throw new Error(
      "ELASTICSEARCH_NODE is not configured. Please set it in your environment."
    );
  }

  client = new Client({
    node: ELASTICSEARCH_NODE,
    auth: ELASTICSEARCH_API_KEY
      ? {
          apiKey: ELASTICSEARCH_API_KEY,
        }
      : undefined,
    // Required for Elastic Cloud Serverless
    serverMode: "serverless",
  });

  return client;
}

