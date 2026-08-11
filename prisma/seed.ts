import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { name: "Stationery", slug: "stationery", emoji: "✏️" },
  { name: "Snacks & Munchies", slug: "snacks", emoji: "🍿" },
  { name: "Cafeteria", slug: "cafeteria", emoji: "🍔" },
  { name: "Electronics", slug: "electronics", emoji: "🔌" },
  { name: "Hostel Essentials", slug: "essentials", emoji: "🛏️" },
  { name: "College Merch", slug: "merch", emoji: "👕" },
];

const products: Array<{
  name: string;
  slug: string;
  description: string;
  price: number;
  mrp: number;
  imageUrl: string;
  stock: number;
  featured: boolean;
  rating: number;
  categorySlug: string;
}> = [
  {
    name: "Classmate Notebook (192pg)",
    slug: "classmate-notebook",
    description: "Single-lined spiral notebook, 192 pages, 240mm x 180mm.",
    price: 55,
    mrp: 80,
    imageUrl:
      "https://m.media-amazon.com/images/I/91X-yO-nlVL._SL1500_.jpg",
    stock: 120,
    featured: true,
    rating: 4.5,
    categorySlug: "stationery",
  },
  {
    name: "Parker Ballpoint Pen",
    slug: "parker-ballpoint-pens",
    description: "Smooth-writing blue ballpoint pens, perfect for exams.",
    price: 60,
    mrp: 100,
    imageUrl:
      "/assets/parker-pen.jpeg",
    stock: 80,
    featured: false,
    rating: 4.2,
    categorySlug: "stationery",
  },
  {
    name: "Lays India's Magic Masala",
    slug: "lays-magic-masala",
    description: "Classic crispy potato chips, pack of 3 (52g each).",
    price: 30,
    mrp: 60,
    imageUrl:
      "https://m.media-amazon.com/images/I/71I4IGrHUCL._SL1080_.jpg",
    stock: 200,
    featured: true,
    rating: 4.6,
    categorySlug: "snacks",
  },
  {
    name: "Kurkure Masala Munch",
    slug: "kurkure-masala-munch",
    description: "Spicy corn puffs, pack of 5.",
    price: 40,
    mrp: 75,
    imageUrl:
      "/assets/kurkure.jpeg",
    stock: 150,
    featured: false,
    rating: 4.3,
    categorySlug: "snacks",
  },
  {
    name: "Hot Coffee (200ml)",
    slug: "cafeteria-hot-coffee",
    description: "Freshly brewed canteen special coffee. Delivered hot!",
    price: 25,
    mrp: 30,
    imageUrl:
      "https://m.media-amazon.com/images/I/71GIMmD2nsL._SL1500_.jpg",
    stock: 60,
    featured: true,
    rating: 4.8,
    categorySlug: "cafeteria",
  },
  {
    name: "Veg Cheese Maggi",
    slug: "veg-cheese-maggi",
    description: "Canteen style Maggi loaded with cheese & veggies.",
    price: 45,
    mrp: 60,
    imageUrl:
      "https://m.media-amazon.com/images/I/71tqo2V0u9L._SL1500_.jpg",
    stock: 50,
    featured: true,
    rating: 4.9,
    categorySlug: "cafeteria",
  },
  {
    name: "boAt Airdopes 141",
    slug: "boat-airdopes-141",
    description: "True wireless earbuds with up to 42hrs playtime. Student favorite.",
    price: 999,
    mrp: 2990,
    imageUrl:
      "https://m.media-amazon.com/images/I/61y6mAQ8j7L._SL1500_.jpg",
    stock: 25,
    featured: true,
    rating: 4.2,
    categorySlug: "electronics",
  },
  {
    name: "USB Type-C Fast Charger 20W",
    slug: "usb-c-fast-charger",
    description: "Compact 20W fast charger compatible with most smartphones.",
    price: 349,
    mrp: 799,
    imageUrl:
      "/assets/USB-cable-with-charger.jpeg",
    stock: 40,
    featured: false,
    rating: 4.1,
    categorySlug: "electronics",
  },
  {
    name: "Reusable Water Bottle 1L",
    slug: "reusable-water-bottle",
    description: "BPA-free Tritan bottle with flip lid, fits in hostel bags.",
    price: 199,
    mrp: 399,
    imageUrl:
      "/assets/bottles.jpeg",
    stock: 70,
    featured: false,
    rating: 4.4,
    categorySlug: "essentials",
  },
  {
    name: "Combo: Noodles + 2 Cold Drinks",
    slug: "midnight-snack-combo",
    description: "Late-night study fuel: 2 instant noodles + 2 cold drinks.",
    price: 120,
    mrp: 160,
    imageUrl:
      "https://m.media-amazon.com/images/I/71tqo2V0u9L._SL1500_.jpg",
    stock: 45,
    featured: true,
    rating: 4.7,
    categorySlug: "snacks",
  },
  {
    name: "College Hoodie (Unisex)",
    slug: "college-hoodie",
    description: "Premium cotton hoodie with embroidered campus logo.",
    price: 899,
    mrp: 1499,
    imageUrl:
      "https://m.media-amazon.com/images/I/71BUK+uS-LL._SL1500_.jpg",
    stock: 30,
    featured: true,
    rating: 4.6,
    categorySlug: "merch",
  },
  {
    name: "ID Card Holder Lanyard",
    slug: "id-card-lanyard",
    description: "Colourful lanyard with safety breakaway clip.",
    price: 49,
    mrp: 99,
    imageUrl:
      "https://m.media-amazon.com/images/I/61Xf0oVS3QL._SL1500_.jpg",
    stock: 100,
    featured: false,
    rating: 4.0,
    categorySlug: "merch",
  },
];

const zones = [
  {
    name: "Main Hostel Block A",
    description: "Covers Hostel A, B and the main mess.",
    lat: 12.9716,
    lng: 77.5946,
    radiusKm: 1.0,
  },
  {
    name: "Academic Block",
    description: "Lecture halls, library and central courtyard.",
    lat: 12.9735,
    lng: 77.5912,
    radiusKm: 0.8,
  },
  {
    name: "Girls Hostel & Canteen",
    description: "Girls hostel blocks and the campus canteen.",
    lat: 12.9696,
    lng: 77.5968,
    radiusKm: 1.2,
  },
];

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("student123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@microhub.in" },
    update: {},
    create: {
      name: "Micro Hub Admin",
      email: "admin@microhub.in",
      passwordHash,
      phone: "9876543210",
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  await prisma.vendor.upsert({
    where: { id: "vendor-canteen" },
    update: {},
    create: {
      id: "vendor-canteen",
      name: "Campus Canteen Co.",
      description: "The official on-campus micro-vendor for hot food & snacks.",
      emoji: "🍜",
      verified: true,
      ownerId: admin.id,
    },
  });

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        mrp: p.mrp,
        imageUrl: p.imageUrl,
        stock: p.stock,
        featured: p.featured,
        rating: p.rating,
        category: { connect: { slug: p.categorySlug } },
        vendor: { connect: { id: "vendor-canteen" } },
      },
    });
  }

  for (const z of zones) {
    await prisma.deliveryZone.upsert({
      where: { id: z.name.toLowerCase().replace(/[^a-z0-9]/g, "-") },
      update: {},
      create: { id: z.name.toLowerCase().replace(/[^a-z0-9]/g, "-"), ...z },
    });
  }

  console.log("Seeding complete.");
  console.log("  Admin login  -> admin@microhub.in / student123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
