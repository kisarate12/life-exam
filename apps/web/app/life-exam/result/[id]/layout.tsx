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

  let characterName = "";
  let worldLabel = "";

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/life_exam_ranking_entries?attempt_id=eq.${id}&select=character_name,world`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        cache: "no-store",
      }
    );
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      characterName = data[0].character_name ?? "";
      worldLabel = WORLD_LABEL[data[0].world] ?? "";
    }
  } catch {
    // fallback to generic
  }

  const title = characterName
    ? `${characterName} | 人生診断`
    : "人生診断";
  const description = worldLabel && characterName
    ? `${worldLabel}の住人「${characterName}」。あなたはどのキャラクター？`
    : "人生を相対評価する。5科目・25問で偏差値と合否を算出。";

  // キャラクター画像をOGPに直接使用（動的生成なし）
  const ogImageUrl = characterName
    ? `${baseUrl}/life-diagnosis/characters/${encodeURIComponent(characterName)}.png`
    : `${baseUrl}/og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImageUrl, alt: title }],
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
