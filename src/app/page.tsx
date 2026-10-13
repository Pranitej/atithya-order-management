import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CartBar } from "@/features/cart/cart-sheet";
import { MenuBrowser } from "@/features/menu/menu-browser";
import { listMenu } from "@/server/modules/menu/menu.service";
import { formatPrice } from "@/shared/money";
import { FREE_DELIVERY_THRESHOLD } from "@/shared/pricing";

/**
 * The hero and page frame are static and served instantly. The menu itself
 * is read from the database for each request and streams in underneath.
 */
export default function MenuPage() {
  return (
    <>
      <section className="overflow-hidden bg-leaf-900 text-white">
        <div className="relative mx-auto flex max-w-6xl flex-col px-5 pt-12 pb-14 sm:pt-16 sm:pb-20 md:min-h-[22rem] md:justify-center">
          <div className="relative z-10 max-w-xl">
            <h1 className="font-display text-[2.6rem] leading-[1.05] text-balance sm:text-6xl">
              Good food, delivered hot.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-leaf-100">
              Cooked to order in one kitchen and followed live to your door.
              Delivery is free on orders over{" "}
              {formatPrice(FREE_DELIVERY_THRESHOLD)}.
            </p>
          </div>

          {/* A plate seen from above, sitting half off the edge of the table. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 -right-24 hidden size-[26rem] -translate-y-1/2 md:block lg:-right-10 lg:size-[30rem]"
          >
            <div className="absolute -inset-5 rounded-full bg-turmeric-500" />
            <Image
              src="/hero-biryani.jpg"
              alt=""
              fill
              priority
              sizes="480px"
              className="rounded-full object-cover"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 pb-28 sm:pb-16">
        <Suspense fallback={<MenuSkeleton />}>
          <Menu />
        </Suspense>
      </div>

      <CartBar />
    </>
  );
}

async function Menu() {
  // Marks this part as request-time, so `next build` never needs a database.
  await connection();
  const items = await listMenu();
  return <MenuBrowser items={items} />;
}

function MenuSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the menu">
      <div className="flex gap-2 border-b border-line py-3">
        {["w-14", "w-20", "w-24", "w-20"].map((width, index) => (
          <Skeleton key={index} className={`h-10 rounded-full ${width}`} />
        ))}
      </div>
      <Skeleton className="mt-10 h-9 w-32" />
      <div className="mt-2 grid gap-x-14 md:grid-cols-2">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex gap-5 border-b border-line py-6">
            <div className="flex-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="mt-2 h-6 w-3/5" />
              <Skeleton className="mt-2 h-5 w-16" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
            </div>
            <Skeleton className="size-32 rounded-2xl sm:size-36" />
          </div>
        ))}
      </div>
    </div>
  );
}
