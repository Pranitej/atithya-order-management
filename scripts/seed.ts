/**
 * Fills the database with the menu and the two demo accounts.
 *
 *   npm run seed
 *
 * Safe to run more than once: menu items are matched by slug and accounts by
 * email, so a second run updates them instead of adding duplicates. Orders
 * are never touched.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/server/db/connect";
import { MenuItemModel } from "@/server/models/menu-item.model";
import { OrderModel } from "@/server/models/order.model";
import { RateLimitModel } from "@/server/models/rate-limit.model";
import { SessionModel } from "@/server/models/session.model";
import { UserModel } from "@/server/models/user.model";
import { hashPassword } from "@/server/modules/auth/password";
import { MENU_CATALOG } from "@/server/modules/menu/menu.catalog";
import { DEMO_ACCOUNTS } from "@/shared/demo-accounts";

async function seedMenu() {
  await MenuItemModel.bulkWrite(
    MENU_CATALOG.map((item) => ({
      updateOne: {
        filter: { slug: item.slug },
        update: { $set: { ...item, isAvailable: true } },
        upsert: true,
      },
    })),
  );

  // Anything no longer in the catalogue comes off the menu, but stays in the
  // database because past orders refer to it.
  const retired = await MenuItemModel.updateMany(
    { slug: { $nin: MENU_CATALOG.map((item) => item.slug) } },
    { $set: { isAvailable: false } },
  );

  console.log(
    `Menu: ${MENU_CATALOG.length} items available, ${retired.modifiedCount} retired`,
  );
}

async function seedDemoAccounts() {
  const accounts = [
    { ...DEMO_ACCOUNTS.customer, role: "customer" as const },
    { ...DEMO_ACCOUNTS.admin, role: "admin" as const },
  ];

  for (const account of accounts) {
    await UserModel.updateOne(
      { email: account.email },
      {
        $set: {
          name: account.name,
          role: account.role,
          passwordHash: await hashPassword(account.password),
        },
      },
      { upsert: true },
    );
    console.log(`Account: ${account.email} (${account.role})`);
  }
}

async function main() {
  await connectToDatabase();

  // Create every index up front, rather than on the first request that needs one.
  await Promise.all(
    [MenuItemModel, OrderModel, RateLimitModel, SessionModel, UserModel].map(
      (model) => model.syncIndexes(),
    ),
  );

  await seedMenu();
  await seedDemoAccounts();
  console.log("Done.");
}

main()
  .catch((error: unknown) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
