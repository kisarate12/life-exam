import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_JP } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FullpageNavCleanup } from "./components/FullpageNavCleanup";
import Footer from "./components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifJP = Noto_Serif_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-jp",
});

const siteTitle = "人生審査";
const siteDescription = "人生を相対評価する。5科目・25問で偏差値と合否を算出。";
const ogImagePath = "/og.png";

/** OGP画像などメタの絶対URL用（VercelではVERCEL_URL、ローカルはlocalhost） */
const baseUrl =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    images: [{ url: ogImagePath, width: 1200, height: 630, alt: siteTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImagePath],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJP.variable} min-h-screen overflow-auto antialiased`}>
        {children}
        <Footer />
        <FullpageNavCleanup />
        <SpeedInsights />
      </body>
    </html>
  );
}
