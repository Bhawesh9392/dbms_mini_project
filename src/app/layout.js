import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./cards.css";
import { getSession } from "@/lib/session";
import Navbar from "@/app/ui/Navbar";
import Footer from "@/app/ui/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Trading Cards Inventory & Exchange System",
  description: "Track card collections, organize card conditions, and trade with fellow collectors.",
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&family=Onest:wght@400;500&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <Navbar session={session} />
        {children}
        <Footer />
        <script>{`window.hallmarkSlots = (m) => { for (const [k, v] of Object.entries(m)) { const s = document.querySelector('[data-slot="' + k + '"]'); if (!s) continue; const im = new Image(); im.src = typeof v === 'string' ? v : v.src; im.alt = (typeof v === 'object' && v.alt) || s.dataset.alt || ''; s.querySelectorAll(':scope > img').forEach((o) => o.remove()); s.prepend(im); } }; document.querySelectorAll('[data-slot] img').forEach((i) => { if (i.complete && !i.naturalWidth) i.remove(); else i.addEventListener('error', () => i.remove(), { once: true }); });`}</script>
      </body>
    </html>
  );
}
