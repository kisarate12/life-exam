import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";
import { generateDraftOrDoc } from "@/lib/ai";

/** POST /api/drafts/[id]/regenerate — 下書きを再生成する */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();

  const { data: draft } = await db
    .from("drafts")
    .select(`
      id,
      consultations (
        id,
        body,
        sender_display,
        connections (user_id)
      )
    `)
    .eq("id", id)
    .single();

  const consultation = (draft as any)?.consultations;
  const connection = consultation?.connections;
  if (!connection || connection.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await generateDraftOrDoc(
    consultation.body,
    consultation.sender_display
  );

  if (result.draftType === "short") {
    await db
      .from("drafts")
      .update({
        body: result.body,
        draft_type: "short",
        doc_content: null,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    return NextResponse.json({ success: true, body: result.body });
  }

  await db
    .from("drafts")
    .update({
      body: result.summaryMessage,
      draft_type: "doc",
      doc_content: result.docContent,
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  return NextResponse.json({
    success: true,
    body: result.summaryMessage,
    draft_type: "doc",
  });
}
