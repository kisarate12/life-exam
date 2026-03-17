import type { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const WORLD_LABEL: Record<string, string> = {
  空: "空の世界",
  海: "海の世界",
  地上: "地上の世界",
  冥界: "闇の世界",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let characterName = "人生診断の結果";
  let worldLabel = "";

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/life_exam_ranking_entries?attempt_id=eq.${id}&select=character_name,world`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 3600 },
      }
    );
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      characterName = data[0].character_name ?? characterName;
      worldLabel = WORLD_LABEL[data[0].world] ?? "";
    }
  } catch {
    // fallback to generic
  }

  const title = `${characterName} | 人生診断`;
  const description = worldLabel
    ? `${worldLabel}の住人「${characterName}」。あなたはどのキャラクター？`
    : "人生を相対評価する。5科目・25問で偏差値と合否を算出。";
  const ogImageUrl = `${baseUrl}/life-exam/result/${id}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function ResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
