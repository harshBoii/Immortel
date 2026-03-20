import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.DATABASE_URL ?? "file:./dev.db";

function createPrismaClient() {
  if (url.startsWith("postgres")) {
    const adapter = new PrismaPg({ connectionString: url });
    return new PrismaClient({ adapter });
  }
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

type SeedProduct = {
  name: string;
  description: string;
  best_for: string[];
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "Whole Wheat Masala Khakhra",
    description: "Thin roasted whole-wheat khakhra with mild masala",
    best_for: ["healthy tea-time snack", "light evening hunger"],
  },
  {
    name: "Methi Khakhra",
    description: "Crisp fenugreek-flavored khakhra made in small batches",
    best_for: ["fiber-rich snacking", "breakfast side"],
  },
  {
    name: "Jeera Khakhra",
    description: "Roasted cumin-infused khakhra with balanced spices",
    best_for: ["digestive-friendly snacking", "travel snack"],
  },
  {
    name: "Punjabi Masala Papad",
    description: "Hand-rolled spicy papad with bold Punjabi masala",
    best_for: ["party starter", "crispy side dish"],
  },
  {
    name: "Moong Papad",
    description: "Protein-rich moong dal papad with light seasoning",
    best_for: ["high-protein snack", "quick roast-and-eat"],
  },
  {
    name: "Urad Pepper Papad",
    description: "Classic urad papad with black pepper kick",
    best_for: ["lunch accompaniment", "crunchy cravings"],
  },
  {
    name: "Bajra Chakli",
    description: "Millet-based crunchy chakli with homemade spice blend",
    best_for: ["gluten-conscious snackers", "festive munching"],
  },
  {
    name: "Rice Murukku",
    description: "South-style rice murukku, crisp and non-greasy",
    best_for: ["kids snack box", "on-the-go snack"],
  },
  {
    name: "Jowar Namak Para",
    description: "Baked jowar namak para with low-oil preparation",
    best_for: ["guilt-free munching", "midday snack"],
  },
  {
    name: "Aloo Sev",
    description: "Traditional potato sev with balanced salt and spice",
    best_for: ["chaat topping", "evening snack"],
  },
  {
    name: "Bhavnagri Gathiya",
    description: "Soft-crunch bhavnagri gathiya made with gram flour",
    best_for: ["breakfast side", "tea-time combo"],
  },
  {
    name: "Ratlami Sev",
    description: "Spicy Ratlami-style sev with robust flavor",
    best_for: ["spicy snack lovers", "festival platters"],
  },
  {
    name: "Roasted Chana Mix",
    description: "Roasted chana blend with peanuts and curry leaves",
    best_for: ["protein snack", "office munching"],
  },
  {
    name: "Masala Makhana",
    description: "Fox nuts roasted with house masala and low oil",
    best_for: ["weight-conscious snacking", "late-night bites"],
  },
  {
    name: "Til Chikki Bites",
    description: "Sesame-jaggery chikki pieces with no refined sugar",
    best_for: ["winter snack", "natural energy boost"],
  },
  {
    name: "Peanut Chikki Cubes",
    description: "Crunchy peanut chikki made with jaggery syrup",
    best_for: ["post-meal sweet snack", "kids treat"],
  },
  {
    name: "Dry Fruit Ladoo",
    description: "No-added-sugar dry fruit laddoo packed with nuts",
    best_for: ["healthy dessert", "festival gifting"],
  },
  {
    name: "Ragi Cookies",
    description: "Millet-based ragi cookies with cardamom notes",
    best_for: ["smart snacking", "tiffin snack"],
  },
  {
    name: "Nankhatai",
    description: "Traditional homemade-style nankhatai, buttery and crumbly",
    best_for: ["tea companion", "family snack time"],
  },
  {
    name: "Shakarpara",
    description: "Lightly sweet crispy shakarpara made in small batches",
    best_for: ["festive snacking", "travel-friendly snack"],
  },
];

function toHandle(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDescription(base: string, bestFor: string[]) {
  return `${base}. Best for: ${bestFor.join(", ")}.`;
}

async function main() {
  const company = await prisma.company.findFirst({
    where: {
      OR: [{ name: { equals: "MomsMade", mode: "insensitive" } }, { slug: "MomsMade" }],
    },
    select: { id: true, name: true },
  });

  if (!company) {
    throw new Error(
      "MomsMade company not found. Run `npm run seed` first or create the company before seeding products."
    );
  }

  const shopDomain = "momsmade-demo.myshopify.com";
  const shop = await prisma.shopifyShop.upsert({
    where: { shopDomain },
    create: {
      companyId: company.id,
      shopDomain,
      accessToken: "dummy-access-token",
      scopes: ["read_products", "write_products"],
      status: "installed",
    },
    update: {
      companyId: company.id,
      status: "installed",
      uninstalledAt: null,
    },
    select: { id: true, shopDomain: true },
  });

  let seeded = 0;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const product = PRODUCTS[i];
    const handle = toHandle(product.name);
    const gid = `gid://shopify/Product/momsmade-${handle}`;
    const now = new Date();
    const price = (2.99 + i * 0.5).toFixed(2);

    await prisma.shopifyProduct.upsert({
      where: { shopifyGid: gid },
      create: {
        shopId: shop.id,
        companyId: company.id,
        shopifyGid: gid,
        title: product.name,
        status: "ACTIVE",
        handle,
        totalInventory: 100 + i * 5,
        onlineStoreUrl: `https://${shop.shopDomain}/products/${handle}`,
        description: toDescription(product.description, product.best_for),
        featuredImageUrl: `https://picsum.photos/seed/${encodeURIComponent(handle)}/1200/800`,
        featuredImageAltText: product.name,
        featuredImageWidth: 1200,
        featuredImageHeight: 800,
        priceMinAmount: price,
        priceMaxAmount: price,
        currencyCode: "USD",
        shopifyCreatedAt: now,
        shopifyUpdatedAt: now,
      },
      update: {
        shopId: shop.id,
        companyId: company.id,
        title: product.name,
        status: "ACTIVE",
        handle,
        totalInventory: 100 + i * 5,
        onlineStoreUrl: `https://${shop.shopDomain}/products/${handle}`,
        description: toDescription(product.description, product.best_for),
        featuredImageUrl: `https://picsum.photos/seed/${encodeURIComponent(handle)}/1200/800`,
        featuredImageAltText: product.name,
        featuredImageWidth: 1200,
        featuredImageHeight: 800,
        priceMinAmount: price,
        priceMaxAmount: price,
        currencyCode: "USD",
        shopifyUpdatedAt: now,
      },
    });
    seeded++;
  }

  console.log(`Seeded ${seeded} products for company ${company.name}.`);
  console.log(`Shop domain: ${shop.shopDomain}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

