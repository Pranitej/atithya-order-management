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

export const metadata: Metadata = {
  title: {
    default: "Dabba: food from our kitchen, tracked to your door",
    template: "%s | Dabba",
  },
  description:
    "Order pizzas, burgers and Indian mains from one kitchen and follow your order live, from the stove to your door.",
};

export const viewport: Viewport = {
  themeColor: "#0e3b2e",
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
                Dabba is a demonstration project. No real food is cooked and no
                payment is taken.
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
