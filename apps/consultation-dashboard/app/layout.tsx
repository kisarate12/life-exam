import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "相談返信ダッシュボード",
  description: "Gmail・Slack からの相談を一覧し、AI 下書きを Accept / Reject で管理する",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
