import type { Metadata } from "next";
import { CHARACTER_DEFINITIONS } from "@/lib/life-diagnosis/characters";
import { CHARACTER_IDS } from "@/lib/life-diagnosis/types";
import { runDiagnosisFromScores } from "@/lib/life-diagnosis";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const WORLD_LABEL: Record<string, string> = {
  空: "空の世界",
  海: "海の世界",
  地上: "地上の世界",
  闇: "闇の世界",
  冥界: "闇の世界",
};

/** OGP 画像が存在するキャラクター ID セット */
const OGP_IMAGE_EXISTS = new Set<string>([
  "amaterasu", "icarus", "king", "egyptian_cat", "kaiko",
  "tsukuyomi", "noble", "namakemono", "snail",
  "dwarf_king", "knight", "tanuki", "beetle",
  "goblin_king", "wanderer", "hyena", "mosquito",
]);

const NAME_TO_ID: Record<string, string> = {
  ...Object.fromEntries(
    CHARACTER_IDS.map((id) => [CHARACTER_DEFINITIONS[id].name, id])
  ),
  アマテラスオオミカミ: "amaterasu",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let characterName = "";
  let worldLabel = "";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    if (supabaseUrl && anonKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/life_exam_ranking_entries?attempt_id=eq.${id}&select=character_name,world`,
        {
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
          cache: "no-store",
        }
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        characterName = data[0].character_name ?? "";
        worldLabel = WORLD_LABEL[data[0].world] ?? "";
      }
    }

    if (!characterName && supabaseUrl && anonKey) {
      const scoresRes = await fetch(
        `${supabaseUrl}/rest/v1/life_exam_scores?attempt_id=eq.${id}&select=subject_id,score`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, cache: "no-store" }
      );
      const scores = await scoresRes.json() as { subject_id: number; score: number }[];
      if (Array.isArray(scores) && scores.length > 0) {
        const scoreBySubjectId: Record<number, number> = {};
        scores.forEach((s) => { scoreBySubjectId[s.subject_id] = Number(s.score); });
        const characterResult = runDiagnosisFromScores(scoreBySubjectId);
        characterName = characterResult.name;
        worldLabel = WORLD_LABEL[characterResult.world.replace("の世界の住人", "")] ?? "";
      }
    }
  } catch {
    // fallback to generic
  }

  const title = characterName
    ? `「${characterName}」の詳細レポート | 人生診断`
    : "詳細レポート | 人生診断";
  const description =
    worldLabel && characterName
      ? `${worldLabel}の住人「${characterName}」の詳細分析レポート。5科目パーセンタイル・同世代ランキング・進化の道筋を公開中。`
      : "人生診断の詳細分析レポート。5科目パーセンタイル・同世代ランキング・進化の道筋。";

  const characterId = characterName ? NAME_TO_ID[characterName] : null;
  const ogImageUrl =
    characterId && OGP_IMAGE_EXISTS.has(characterId)
      ? `${baseUrl}/ogp/${characterId}.png`
      : `${baseUrl}/ogp/life-exam.png`;

  const reportUrl = `${baseUrl}/life-exam/result/${id}/report`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: reportUrl,
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

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
