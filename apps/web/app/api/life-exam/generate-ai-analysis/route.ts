import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const SUBJECT_LABEL: Record<string, string> = {
  income: "収入",
  asset: "資産",
  time: "時間",
  relationship: "人間関係",
  health: "健康",
};

const RANK_PERCENTILE: Record<string, string> = {
  S: "上位3%",
  A: "上位10%",
  B: "上位25%",
  C: "上位50%",
  D: "下位25%",
  E: "下位10%",
  F: "下位3%",
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
    supabase.from("life_exam_ranking_entries").select("character_name, character_code").eq("attempt_id", attempt_id).single(),
  ]);

  if (!attempt || !scores || !subjects) {
    return NextResponse.json({ error: "Attempt data not found" }, { status: 404 });
  }

  // 比較統計を取得
  const { data: statsData } = await supabase.rpc("get_life_exam_comparison_stats", {
    p_attempt_id: attempt_id,
  });

  type SubjectStat = {
    subject_id: number;
    rank_same_gen: number;
    total_same_gen: number;
    rank_all: number;
    total_all: number;
  };
  const stats: SubjectStat[] = (statsData as { subjects?: SubjectStat[] })?.subjects ?? [];

  // プロンプト用データを構築
  const subjectMap: Record<number, { code: string; name_ja: string }> = {};
  (subjects as { id: number; code: string; name_ja: string }[]).forEach((s) => {
    subjectMap[s.id] = { code: s.code, name_ja: s.name_ja };
  });

  const scoreRows = (scores as { subject_id: number; score: number; rank?: string }[]).map((row) => {
    const subj = subjectMap[row.subject_id];
    const st = stats.find((s) => s.subject_id === row.subject_id);
    const rank = row.rank ?? "C";
    const percentile =
      st && st.total_same_gen > 0
        ? `上位${Math.round((st.rank_same_gen / st.total_same_gen) * 100)}%`
        : RANK_PERCENTILE[rank] ?? "—";
    return {
      name: subj?.name_ja ?? SUBJECT_LABEL[subj?.code ?? ""] ?? subj?.code ?? "不明",
      score: row.score,
      rank,
      percentile,
    };
  });

  const characterName = rankingEntry?.character_name ?? "不明";
  const characterCode = rankingEntry?.character_code ?? "????";
  const ageBand = attempt.age_band_at_attempt ?? null;
  const gender = attempt.gender_at_attempt ?? null;
  const deviation = attempt.same_age_deviation_value ?? null;
  const sameGenRank = attempt.same_gen_rank ?? null;
  const sameGenTotal = attempt.same_gen_total ?? null;

  const ageBandText = ageBand ? `${ageBand.replace(/^(\d+).*/, "$1")}代` : "不明の年代";
  const genderText =
    gender === "male" || gender === "m" || gender === "男" ? "男性"
    : gender === "female" || gender === "f" || gender === "女" ? "女性"
    : "不明の性別";

  const subjectLines = scoreRows
    .map((r) => `  - ${r.name}：ランク${r.rank}（同世代${r.percentile}）`)
    .join("\n");

  const rankingText =
    sameGenRank && sameGenTotal
      ? `同世代${sameGenTotal}人中${sameGenRank}位（偏差値${deviation?.toFixed(1) ?? "不明"}）`
      : deviation
      ? `同世代偏差値 ${deviation.toFixed(1)}`
      : "ランキング情報なし";

  const prompt = `あなたは人生診断の専門家アナリストです。以下のデータをもとに、ユーザーへの個人分析レポートを日本語で書いてください。

【診断結果データ】
- キャラクター：${characterName}（コード：${characterCode}）
- 属性：${ageBandText}・${genderText}
- 同世代ランキング：${rankingText}
- 5科目の詳細スコア：
${subjectLines}

【執筆ルール】
1. 文章量：1500〜2000文字
2. 構成：以下の4パートで書く
   ① あなたの現在地（現状の強みと特徴を具体的に描写）
   ② 見えていないリスク（現状から導かれる潜在的な課題）
   ③ 次の一手（最も効果的な行動指針を1〜2点）
   ④ あなたへのメッセージ（締めのパーソナルメッセージ）
3. スコアの数値（パーセンタイルなど）を積極的に引用して説得力を持たせる
4. キャラクター名は自然に2〜3回登場させる
5. 上から目線・説教調にならず、寄り添うトーンで書く
6. パートタイトルは「## ①〜」形式で記載する
7. 各パートは段落（空行区切り）で読みやすく構成する

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
