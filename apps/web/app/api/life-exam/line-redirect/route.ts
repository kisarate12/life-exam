import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** LINE Bot の友達追加URL（startParam対応）。環境変数未設定時は従来の短縮URLにフォールバック */
const LINE_BOT_BASE_URL =
  process.env.LINE_BOT_ADD_FRIEND_URL ?? "https://lin.ee/3nGM5xuo";

/** attempt_id を startParam として付与した LINE URL を返す */
function buildLineUrl(attemptId: string): URL {
  const url = new URL(LINE_BOT_BASE_URL);
  url.searchParams.set("start", attemptId);
  return url;
}

/**
 * LINE誘導クリックをDBに記録してからLINE公式へリダイレクトする。
 * クエリ: attempt_id（必須）, character_name, world（任意）
 * これにより「どのユーザー・どの診断結果からLINEに来たか」をDBで把握できる。
 *
 * 要: SUPABASE_SERVICE_ROLE_KEY を .env.local に設定すること。
 * life_exam_attempts は RLS で自ユーザー以外読めないため、anon では attempt 取得できず
 * 記録が入らない。サービスロールなら RLS を通過して取得・insert できる。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const attemptId = searchParams.get("attempt_id");
  const lineUrl = attemptId ? buildLineUrl(attemptId) : new URL(LINE_BOT_BASE_URL);

  try {
    const characterName = searchParams.get("character_name") ?? null;
    const world = searchParams.get("world") ?? null;

    if (!attemptId || typeof attemptId !== "string" || attemptId.length < 10) {
      const base = request.nextUrl?.origin ?? request.url;
      return NextResponse.redirect(new URL("/life-exam", base), 302);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.redirect(lineUrl, 302);
    }

    // life_exam_attempts は RLS で「authenticated かつ自分の行のみ」のため、
    // anon では取得できない。サービスロールで attempt 取得 + insert する。
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey ?? anonKey,
      serviceRoleKey ? { auth: { persistSession: false } } : undefined
    );

    const { data: attempt, error: fetchError } = await supabase
      .from("life_exam_attempts")
      .select("id, user_id")
      .eq("id", attemptId)
      .single();

    if (fetchError || !attempt) {
      return NextResponse.redirect(lineUrl, 302);
    }

    await supabase.from("life_exam_line_clicks").insert({
      attempt_id: attempt.id,
      user_id: attempt.user_id,
      character_name: characterName,
      world,
    });

    // クリック時点でレポートを解放（referral経由が不安定なためここで確実に記録）
    await supabase.from("life_exam_report_purchases").upsert(
      {
        attempt_id: attempt.id,
        stripe_session_id: null,
        unlock_method: "line",
        amount_yen: 0,
        paid_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id" }
    );
  } catch (_e) {
    // テーブル未作成・RLS・ネットワーク等で失敗してもLINEへ飛ばす
  }

  return NextResponse.redirect(lineUrl, 302);
}
