/**
 * 同年齢バンドの norm 参照と偏差値算出
 * life_exam_population_stats（subject_id NULL = 総合）を参照
 */

import { supabase } from "@/lib/supabase";

export type SameAgeNormResult = {
  mean: number;
  stddev: number;
  deviationValue: number;
};

/**
 * age_band 文字列を min/max にパース（例: "20-24" → { min: 20, max: 24 }）
 */
function parseAgeBand(ageBand: string | null): { min: number; max: number } | null {
  if (!ageBand || typeof ageBand !== "string") return null;
  const parts = ageBand.split("-").map((s) => parseInt(s.trim(), 10));
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  const [min, max] = parts;
  if (min > max) return null;
  return { min, max };
}

/**
 * 同年齢バンドの総合 norm を取得し、総合得点から偏差値を算出
 * データがない場合や stddev=0 の場合は null
 */
export async function resolveSameAgeNorm(
  ageBand: string | null,
  totalScore: number
): Promise<SameAgeNormResult | null> {
  const band = parseAgeBand(ageBand);
  if (!band) return null;

  const { data, error } = await supabase
    .from("life_exam_population_stats")
    .select("mean, stddev")
    .eq("age_band_min", band.min)
    .eq("age_band_max", band.max)
    .is("subject_id", null)
    .maybeSingle();

  if (error || !data) return null;
  const mean = Number(data.mean);
  const stddev = Number(data.stddev);
  if (Number.isNaN(mean) || Number.isNaN(stddev) || stddev <= 0) return null;

  const deviationValue =
    Math.round((50 + (10 * (totalScore - mean)) / stddev) * 100) / 100;
  return { mean, stddev, deviationValue };
}
