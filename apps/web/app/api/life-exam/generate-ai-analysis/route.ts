import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getRankFromDeviation, getRankFromScore } from "@/lib/life-exam/judgement";
import { deviationFromPopulation, provisionalDeviationValue } from "@/lib/life-exam/constants";
import { SUBJECT_ID_TO_CODE } from "@/lib/life-exam/examV2Questions";

const RANK_MEANING: Record<string, string> = {
  S: "同世代上位3%の圧倒的トップ層",
  A: "同世代上位10%の上位層",
  B: "同世代上位25%の準上位層",
  C: "同世代平均層",
  D: "同世代下位25%",
  E: "同世代下位10%",
  F: "同世代下位3%",
};

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const { attempt_id } = await req.json();
  if (!attempt_id || typeof attempt_id !== "string") {
    return NextResponse.json({ error: "attempt_id is required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 既存の分析があればキャッシュを返す
  const { data: existing } = await supabase
    .from("life_exam_report_purchases")
    .select("ai_analysis")
    .eq("attempt_id", attempt_id)
    .single();

  if (existing?.ai_analysis) {
    return NextResponse.json({ analysis: existing.ai_analysis });
  }

  // attempt + scores + subjects を取得
  const [
    { data: attempt },
    { data: scores },
    { data: subjects },
    { data: rankingEntry },
  ] = await Promise.all([
    supabase.from("life_exam_attempts").select("*").eq("id", attempt_id).single(),
    supabase.from("life_exam_scores").select("*").eq("attempt_id", attempt_id),
    supabase.from("life_exam_subjects").select("id, code, name_ja"),
    supabase
      .from("life_exam_ranking_entries")
      .select("character_name, character_code")
      .eq("attempt_id", attempt_id)
      .single(),
  ]);

  if (!attempt || !scores || !subjects) {
    return NextResponse.json({ error: "Attempt data not found" }, { status: 404 });
  }

  // 比較統計を取得（偏差値・パーセンタイル計算に使用）
  const { data: statsData } = await supabase.rpc("get_life_exam_comparison_stats", {
    p_attempt_id: attempt_id,
  });

  type SubjectStat = {
    subject_id: number;
    avg_same_gen: number | null;
    stddev_same_gen: number | null;
    rank_same_gen: number;
    total_same_gen: number;
    avg_all: number | null;
    stddev_all: number | null;
    rank_all: number;
    total_all: number;
  };
  const stats: SubjectStat[] = (statsData as { subjects?: SubjectStat[] })?.subjects ?? [];

  // subject ID → { code, name_ja }
  const subjectMap: Record<number, { code: string; name_ja: string }> = {};
  (subjects as { id: number; code: string; name_ja: string }[]).forEach((s) => {
    subjectMap[s.id] = { code: s.code, name_ja: s.name_ja };
  });

  // スコアごとにランク・パーセンタイルを正しく計算
  const scoreRows = (scores as { subject_id: number; score: number }[]).map((row) => {
    const subj = subjectMap[row.subject_id];
    const st = stats.find((s) => s.subject_id === row.subject_id);

    // 偏差値をレポートページと同じロジックで計算（比較表示用）
    const dev =
      deviationFromPopulation(
        row.score,
        st?.avg_same_gen ?? st?.avg_all ?? null,
        st?.stddev_same_gen ?? st?.stddev_all ?? null
      ) ?? provisionalDeviationValue(row.score * 5);

    // ランク判定は科目別絶対評価スコア閾値を使用
    const subjectCode = SUBJECT_ID_TO_CODE[row.subject_id];
    const rank = subjectCode
      ? getRankFromScore(row.score, subjectCode)
      : getRankFromDeviation(dev);

    // 上位X% の計算：rank=1 が最上位なので (total - rank + 1) / total * 100
    let percentileText = RANK_MEANING[rank] ?? "";
    if (st && st.total_same_gen > 0) {
      const pctFromTop = Math.round(((st.rank_same_gen) / st.total_same_gen) * 100);
      if (pctFromTop <= 50) {
        percentileText = `同世代上位${pctFromTop}%`;
      } else {
        const pctFromBottom = Math.round(((st.total_same_gen - st.rank_same_gen) / st.total_same_gen) * 100);
        percentileText = `同世代下位${pctFromBottom}%`;
      }
    }

    return {
      name: subj?.name_ja ?? subj?.code ?? "不明",
      score: row.score,
      rank,
      dev: Math.round(dev * 10) / 10,
      percentileText,
    };
  });

  const characterName = rankingEntry?.character_name ?? "不明";
  const characterCode = rankingEntry?.character_code ?? "????";
  const ageBand = attempt.age_band_at_attempt ?? null;
  const gender = attempt.gender_at_attempt ?? null;
  const deviation = attempt.same_age_deviation_value ?? null;

  const ageBandText = ageBand ? `${ageBand.replace(/^(\d+).*/, "$1")}代` : "年代不明";
  const genderText =
    gender === "male" || gender === "m" || gender === "男" ? "男性"
    : gender === "female" || gender === "f" || gender === "女" ? "女性"
    : "性別不明";

  const subjectLines = scoreRows
    .map((r) => `  - ${r.name}：ランク${r.rank}（偏差値${r.dev}、${r.percentileText}）`)
    .join("\n");

  const rankingText = deviation
    ? `同世代偏差値 ${deviation.toFixed(1)}`
    : "ランキング情報なし";

  const prompt = `あなたは人生診断の専門家アナリストです。以下のデータをもとに、ユーザーへの個人分析レポートを日本語で書いてください。

【診断結果データ】
- キャラクター：${characterName}（コード：${characterCode}）
- 属性：${ageBandText}・${genderText}
- 同世代ランキング：${rankingText}
- 5科目の詳細スコア（ランクS=最高〜F=最低、偏差値50が平均）：
${subjectLines}

【執筆ルール】
1. 文章量：1500〜2000文字
2. 構成：以下の4パートで書く
   ① あなたの現在地（強い科目を具体的な数値で描写し、現状を正確に表現する）
   ② 見えていないリスク（スコアが低い科目・弱点から導かれる潜在的な課題）
   ③ 次の一手（最も弱い科目の改善に向けた行動指針を1〜2点）
   ④ あなたへのメッセージ（締めのパーソナルメッセージ）
3. 必ずデータ通りの内容を書くこと。ランクが高い科目を「課題」と表現してはいけない。ランクが低い科目を「強み」と表現してはいけない。
4. スコアの数値（偏差値・パーセンタイル）を積極的に引用して説得力を持たせる
5. キャラクター名は自然に2〜3回登場させる
6. 上から目線・説教調にならず、寄り添うトーンで書く
7. パートタイトルは「## ①〜」形式で記載する
8. 各パートは段落（空行区切り）で読みやすく構成する

それでは、上記データに基づいた個人分析レポートを書いてください。`;

  const anthropic = new Anthropic({ apiKey });

  let analysis = "";
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    if (block.type === "text") {
      analysis = block.text;
    }
  } catch (err) {
    console.error("[generate-ai-analysis] Anthropic API error:", err);
    return NextResponse.json({ error: "AI analysis generation failed" }, { status: 500 });
  }

  // DBに保存
  await supabase
    .from("life_exam_report_purchases")
    .update({ ai_analysis: analysis })
    .eq("attempt_id", attempt_id);

  return NextResponse.json({ analysis });
}
