# Dabba: order management for a food delivery app

A small, complete slice of a food delivery product: browse a menu, fill a
cart, check out, and watch the order move from the kitchen to your door in
real time. Staff get a board where they can move orders along by hand.

Built for the RaftLabs Senior Full Stack assessment.

- **Live app:** _added after deployment_
- **Demo accounts:** on the sign-in page, "Continue as demo customer" and
  "Continue as kitchen staff" sign you in with one click.

## What it does

| Requirement                               | Where to see it                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Menu with name, description, price, image | Home page. Sixteen dishes in six sections, filterable.                                           |
| Add to cart, change quantities            | "Add" on any dish, then the cart panel. The cart survives a reload.                              |
| Checkout with name, address, phone        | `/checkout`. Validated in the browser and again by the API.                                      |
| Order status                              | `/orders/:id`. Order Received, Preparing, Out for Delivery, Delivered (or Cancelled).            |
| Real-time updates                         | The tracking page updates by itself over Server-Sent Events. The back end simulates the kitchen. |
| REST API                                  | `/api/v1`, listed below.                                                                         |
| Storage                                   | MongoDB.                                                                                         |
| Tests                                     | 302 tests: API endpoints, business rules and key UI components.                                  |

Beyond the brief: accounts with JWT access and refresh tokens, a staff role,
rate limiting, and a kitchen board at `/admin/orders`.

## Run it locally

You need Node.js 22.12 or newer and a MongoDB connection string
(a free MongoDB Atlas cluster works, as does a local server).

```bash
npm install
cp .env.example .env.local   # then fill in the three values
npm run seed                 # loads the menu and the two demo accounts
npm run dev                  # http://localhost:3000
```

| Script               | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Development server                                 |
| `npm test`           | All tests, once. Needs no database or `.env` file. |
| `npm run test:watch` | Tests in watch mode                                |
| `npm run lint`       | ESLint                                             |
| `npm run typecheck`  | TypeScript                                         |
| `npm run build`      | Production build. Needs no database.               |
| `npm run seed`       | Menu and demo accounts. Safe to run again.         |

### Environment variables

| Name                 | Required | Purpose                                                             |
| -------------------- | -------- | ------------------------------------------------------------------- |
| `MONGODB_URI`        | yes      | MongoDB connection string                                           |
| `JWT_ACCESS_SECRET`  | yes      | Signs access tokens. At least 32 characters.                        |
| `JWT_REFRESH_SECRET` | yes      | Signs refresh tokens. At least 32 characters, different from above. |
| `ORDER_STEP_SECONDS` | no       | Seconds a simulated order spends in each status. Default 20.        |

## Architecture

One Next.js 16 application (App Router, TypeScript) serves both the pages
and the API, and deploys to Vercel. MongoDB is the only other service.

```
src/
  app/                    Pages and API route handlers (thin)
    api/v1/               REST endpoints
  features/               Browser-side features: menu, cart, checkout, orders, auth, admin
  components/ui/          Reusable primitives: Button, TextField, Sheet, QuantityStepper...
  lib/                    Browser helpers: API client, formatting
  shared/                 Code used by BOTH browser and server:
                          validation schemas, order status rules, pricing, types
  server/                 Server-only code
    http/                 Route wrapper, errors, cookies, rate limiting
    modules/              Business logic: auth, menu, orders
    models/               Mongoose models
    db/, config/          Connection and validated environment
tests/                    API tests and shared test helpers
scripts/seed.ts           Menu and demo accounts
```

A request passes through three layers, each with one job:

1. **Route handler** (`src/app/api/v1/**/route.ts`). A few lines: declare
   who may call it and what the body must look like, call a service, return
   the result. All routes are built with one wrapper,
   [`route()`](src/server/http/route.ts), which does the origin check, rate
   limiting, authentication, body validation and error formatting in one place.
2. **Service** (`src/server/modules/**`). The business rules: who may see an
   order, which status changes are legal, what an order costs.
3. **Repository** ([`order.repository.ts`](src/server/modules/orders/order.repository.ts)).
   The only code that builds database queries for orders.

The `shared/` folder is what keeps the browser and server honest with each
other. The checkout form and the API validate with the _same_ Zod schema;
the cart preview and the server price an order with the _same_ function; the
status timeline and the API use the _same_ transition rules.

## API

All responses are JSON: `{ "data": ... }` on success,
`{ "error": { "code", "message", "details?" } }` on failure.

| Method   | Path                 | Who                     | Purpose                                        |
| -------- | -------------------- | ----------------------- | ---------------------------------------------- |
| `GET`    | `/menu`              | anyone                  | Available dishes, in menu order                |
| `POST`   | `/orders`            | signed in               | Place an order                                 |
| `GET`    | `/orders`            | signed in               | Own orders; staff see all. `?status=` filters. |
| `GET`    | `/orders/:id`        | owner or staff          | One order                                      |
| `PATCH`  | `/orders/:id/status` | staff                   | Move to the next status, or cancel             |
| `DELETE` | `/orders/:id`        | owner or staff          | Cancel (orders are never erased)               |
| `GET`    | `/orders/:id/events` | owner or staff          | Server-Sent Events stream of the order         |
| `POST`   | `/auth/register`     | anyone                  | Create an account and sign in                  |
| `POST`   | `/auth/login`        | anyone                  | Sign in                                        |
| `POST`   | `/auth/refresh`      | holder of refresh token | New access token; rotates the refresh token    |
| `POST`   | `/auth/logout`       | anyone                  | End the session                                |
| `GET`    | `/auth/me`           | anyone                  | The signed-in user, or `null`                  |

Status codes used: `400` invalid input (with per-field `details`), `401` not
signed in, `403` not allowed, `404` not found, `409` the order's current
state does not allow this, `429` too many requests.

## Design decisions

### Real-time updates on a serverless host

Vercel runs each request in a short-lived function. There is no process that
stays up to run timers, and instances share no memory. Two decisions follow.

**The kitchen is simulated without a background worker.** Each order stores
`nextTransitionAt`, the moment its next status is due. Whenever an order is
read, any overdue steps are applied first
([`settleDueOrders`](src/server/modules/orders/order.repository.ts)). Each
step is one atomic update that only matches orders still in the previous
status, so however many requests arrive together, a step is applied exactly
once. Nothing has to keep running, and nothing is lost on a restart. Each
change is stamped with the time it was _due_, so the timeline is right even
if nobody looked for ten minutes.

**Updates are pushed with Server-Sent Events.** Status tracking is one-way,
server to browser, which is what SSE is for: plain HTTP, automatic
reconnection in the browser, no extra infrastructure. The stream
([`order-events.ts`](src/server/modules/orders/order-events.ts)) checks the
order every two seconds and sends it when it has changed. It closes itself
shortly before the platform's five-minute limit and the browser reconnects.

The honest trade-off: the stream polls the database, because the database is
the only thing every instance can see. For a handful of concurrent orders
that is fine. At scale I would put a message broker (Redis pub/sub) behind
the same `loadOrder` seam, or use MongoDB change streams, so that a write on
one instance wakes the streams on all others.

### Money and trust

- Amounts are integers in paise, never floating point.
- The browser sends only item ids and quantities. The server reads prices
  from the database and computes the bill. A tampered request cannot change
  what an order costs (there is a test for exactly that).
- Each order stores a copy of the item names and prices, so editing the menu
  later never rewrites past orders.

### Authentication

- A 15-minute JWT access token and a 7-day JWT refresh token, both in
  `httpOnly` cookies, so page scripts can never read them.
- The refresh token is replaced every time it is used. If an old one is
  presented again, two parties hold it, so the whole session is ended.
- Sessions are stored in MongoDB (hashed token id, TTL index), which is what
  makes sign-out and revocation real rather than "wait for it to expire".
- The browser's API client refreshes an expired session once, transparently,
  and shares a single refresh between simultaneous requests.

### Security

- Every input is validated with Zod; unknown fields are dropped.
- Customers can only see and cancel their own orders. Someone else's order
  answers `404`, not `403`, so ids cannot be probed.
- State-changing requests from another site are refused (Origin check), on
  top of `SameSite=Lax` cookies.
- Sign-in, sign-up and ordering are rate limited per address, with counters
  in MongoDB so the limit holds across serverless instances.
- Passwords are hashed with bcrypt. Sign-in takes the same time whether or
  not the email exists.
- Unexpected errors return a generic `500`; details go to the server log only.
- Security headers: no framing, no MIME sniffing, strict referrer policy.

### Front end

- The menu page is a static shell served from the CDN; the menu streams in
  from the database (Next.js partial prerendering).
- Server state lives in TanStack Query, the cart in a small Zustand store
  persisted to `localStorage`.
- `components/ui` holds typed, reusable primitives styled with Tailwind
  design tokens (`bg-leaf-900`, `text-muted`), so pages compose rather than
  repeat class strings.
- Accessibility: labelled controls, errors announced and tied to their
  fields, visible keyboard focus, a focus-trapped cart panel, reduced-motion
  support, and status conveyed in words as well as colour.

## Testing

Written test-first. For the business rules, the API and the key components,
the git history shows a failing-test commit (marked `(red)`) before the
commit that makes it pass. Page composition and styling primitives have no
logic of their own and were checked by the production build and by driving
the app in a browser.

| Project | What it covers                                                                                          | How                                                                |
| ------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `unit`  | Status rules, pricing, validation schemas, JWTs, the SSE stream, env validation                         | Plain functions, fake clock                                        |
| `api`   | Every endpoint: order CRUD, validation failures, permissions, status changes, simulation, rate limiting | Real route handlers against an in-memory MongoDB                   |
| `ui`    | Menu, cart, checkout form, checkout flow, status timeline, live tracking, sign-in, kitchen board        | React Testing Library; only `fetch` and `EventSource` are replaced |

Time-dependent behaviour (token expiry, the kitchen simulation, rate-limit
windows) is tested by moving a fake clock, never by waiting.

GitHub Actions runs formatting, lint, type-check, tests and a production
build on every push.

## Known limitations and next steps

- **Fixed-window rate limiting** allows a short burst across a window
  boundary. A sliding window would be stricter.
- **Simultaneous refresh from two tabs** can end the session, because each
  refresh token works once. A short grace period for the previous token
  would smooth that over.
- **No Content-Security-Policy yet.** A strict one needs per-request nonces.
- **The staff demo account is public**, so anyone can move any order on the
  demo. That is deliberate for review, and would not exist in production.
- Not built: payments, menu editing, multiple restaurants, notifications.

## How AI was used

This project was built by pairing with Claude Code (Anthropic's coding
agent), directed step by step:

- **Requirements and design.** The brief was broken into a design that was
  reviewed before any code: stack, hosting constraints, API shape, security
  model. The serverless real-time design came out of checking Vercel's
  current documentation rather than assuming.
- **Test-driven implementation.** Each behaviour started as a failing test,
  then the smallest implementation that passed it.
- **Debugging.** For example, a production build revealed that the API
  wrapper was swallowing a Next.js control-flow error; a test that passed or
  failed depending on the wall clock was found and made deterministic.
- **Verification.** The finished app was driven in a real browser (menu,
  cart, checkout, live tracking, staff board) before being called done.

Dish photos are from Unsplash.
