import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";

/** POST /api/drafts/[id]/reject — 下書きを却下する */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();

  // 権限確認
  const { data: draft } = await db
    .from("drafts")
    .select("id, consultations(connection_id, connections(user_id))")
    .eq("id", id)
    .single();

  const consultation = (draft as any)?.consultations;
  const connection = consultation?.connections;
  if (!connection || connection.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .from("drafts")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
