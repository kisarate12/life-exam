import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";

/** GET /api/consultations — 相談一覧を返す */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform"); // optional filter

  const db = createServiceRoleClient();

  // ユーザーの connection_id 一覧を取得
  const { data: conns } = await db
    .from("connections")
    .select("id")
    .eq("user_id", user.id);

  const connectionIds = (conns ?? []).map((c: any) => c.id);
  if (connectionIds.length === 0) {
    return NextResponse.json({ consultations: [] });
  }

  let query = db
    .from("consultations")
    .select(`
      id,
      platform,
      sender_display,
      body,
      platform_thread_id,
      platform_message_id,
      received_at,
      created_at,
      drafts (
        id,
        body,
        draft_type,
        doc_content,
        status,
        updated_at
      )
    `)
    .in("connection_id", connectionIds)
    .order("received_at", { ascending: false });

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ consultations: data });
}
