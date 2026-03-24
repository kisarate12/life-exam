import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** 6文字の英数大文字トークンを生成（O/0, I/1 を除外して読みやすく） */
function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export async function POST(req: NextRequest) {
  const { attempt_id } = await req.json();
  if (!attempt_id || typeof attempt_id !== "string") {
    return NextResponse.json({ error: "attempt_id is required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // attempt_id 単位でトークンを upsert（再発行時は上書き）
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("life_exam_report_tokens")
    .upsert(
      { token, attempt_id, expires_at: expiresAt, used_at: null },
      { onConflict: "attempt_id" }
    );

  if (error) {
    // attempt_id に unique 制約がない場合は insert にフォールバック
    const { error: insertError } = await supabase
      .from("life_exam_report_tokens")
      .insert({ token, attempt_id, expires_at: expiresAt });
    if (insertError) {
      return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
    }
  }

  return NextResponse.json({ token });
}
