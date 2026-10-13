/**
 * Accounts created by the seed script so that anyone reviewing the app can
 * try it without signing up. They are public on purpose: the sign-in page
 * offers them as one-click buttons. A real deployment would not have these.
 */
export const DEMO_ACCOUNTS = {
  customer: {
    name: "Asha Rao",
    email: "asha@atithya.example",
    password: "demo-customer-1",
  },
  admin: {
    name: "Kitchen Staff",
    email: "kitchen@atithya.example",
    password: "demo-kitchen-1",
  },
} as const;
