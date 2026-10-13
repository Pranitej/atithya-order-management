import type { Metadata, Viewport } from "next";
import { Anek_Latin, Young_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Anek is drawn by an Indian type foundry and carries the rupee sign well;
// it sets all interface text. Young Serif is used only for headings.
const anek = Anek_Latin({
  subsets: ["latin"],
  variable: "--font-anek",
  display: "swap",
});

const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-young-serif",
  display: "swap",
});

const description =
  "Order pizzas, burgers and Indian mains from one kitchen and follow your order live, from the stove to your door.";

// Link previews need absolute image URLs. Vercel provides the production
// domain at build time; locally it falls back to the dev server.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Atithya: good food feels like home",
    template: "%s | Atithya",
  },
  description,
  // The preview image itself comes from app/opengraph-image.png.
  openGraph: {
    type: "website",
    siteName: "Atithya",
    title: "Atithya: good food feels like home",
    description,
  },
};

export const viewport: Viewport = {
  // The logo's green, so the browser chrome on phones matches the brand.
  themeColor: "#043022",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anek.variable} ${youngSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-leaf-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Providers>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <footer className="border-t border-line">
            <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-muted">
              <p>
                Atithya is a demonstration project. No real food is cooked and
                no payment is taken.
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
