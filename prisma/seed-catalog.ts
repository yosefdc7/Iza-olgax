import "dotenv/config";
import { prisma } from "../src/lib/db";

/**
 * Safe, credential-free development catalog seed.
 *
 * Production Admin/Cashier accounts must be created through the setup wizard
 * and protected user-management UI. This script only creates representative
 * business settings and products for local development.
 */
async function main() {
  await prisma.businessSettings.upsert({
    where: { id: "singleton" },
    create: {
      name: "My Store",
      primaryColor: "#0f2044",
      accentColor: "#f5c518",
      currency: "$",
      currencyDecimals: 2,
      taxRate: 0.1,
      taxName: "Tax",
      receiptFooter: "Thank you for your purchase!",
      language: "en",
      setupComplete: true,
    },
    update: { setupComplete: true },
  });

  const products = [
    { name: "Coffee", sku: "CAFE-000", price: 3, cost: 0.8, stock: 100, category: "Beverages" },
    { name: "Espresso", sku: "CAFE-001", price: 2.5, cost: 0.5, stock: 100, category: "Beverages" },
    { name: "Cappuccino", sku: "CAFE-002", price: 4, cost: 0.8, stock: 100, category: "Beverages" },
    { name: "Latte", sku: "CAFE-003", price: 4.5, cost: 0.9, stock: 100, category: "Beverages" },
    { name: "Croissant", sku: "FOOD-001", price: 3, cost: 1, stock: 20, category: "Food" },
    { name: "Muffin", sku: "FOOD-002", price: 2.75, cost: 0.75, stock: 15, category: "Food" },
    {
      name: "Mineral Water",
      sku: "DRINK-001",
      price: 1.5,
      cost: 0.3,
      stock: 50,
      category: "Beverages",
      lowStockThreshold: 10,
    },
    {
      name: "Orange Juice",
      sku: "DRINK-002",
      price: 3.5,
      cost: 0.7,
      stock: 8,
      category: "Beverages",
      lowStockThreshold: 10,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      create: product,
      update: {},
    });
  }

  console.warn(`Seeded ${products.length} catalog products without user credentials.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
