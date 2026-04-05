import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FullpageNavCleanup } from "./components/FullpageNavCleanup";
import Footer from "./components/Footer";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-1F7PLM5R13";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
});

const notoSerifJP = Noto_Serif_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-jp",
});

const siteTitle = "人生診断";
const siteDescription = "人生を相対評価する。5科目・50問で偏差値と合否を算出。";
const ogImagePath = "/ogp/life-exam.png";

/** OGP画像などメタの絶対URL。本番はNEXT_PUBLIC_SITE_URLで固定（VercelのVERCEL_URLはデプロイごとで変わるため） */
const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

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
      <body className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} ${notoSerifJP.variable} min-h-screen overflow-auto antialiased`}>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {children}
        <Footer />
        <FullpageNavCleanup />
        <SpeedInsights />
      </body>
    </html>
  );
}
