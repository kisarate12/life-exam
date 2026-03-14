import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";
import { generateDraftOrDoc } from "@/lib/ai";

/** POST /api/drafts/generate — 未対応の相談に対して AI 下書きを一括生成する */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();

  // ユーザーの connection_id 一覧
  const { data: conns } = await db
    .from("connections")
    .select("id")
    .eq("user_id", user.id);

  const connectionIds = (conns ?? []).map((c: any) => c.id);
  if (connectionIds.length === 0) return NextResponse.json({ generated: 0 });

  // 下書きがない相談を取得
  const { data: consultations, error } = await db
    .from("consultations")
    .select("id, body, sender_display")
    .in("connection_id", connectionIds)
    .not("id", "in",
      db.from("drafts").select("consultation_id")
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!consultations?.length) return NextResponse.json({ generated: 0 });

  let generated = 0;
  const errors: string[] = [];

  for (const consultation of consultations) {
    try {
      const result = await generateDraftOrDoc(
        consultation.body,
        consultation.sender_display
      );

      if (result.draftType === "short") {
        await db.from("drafts").upsert(
          {
            consultation_id: consultation.id,
            body: result.body,
            draft_type: "short",
            doc_content: null,
            status: "pending",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "consultation_id" }
        );
      } else {
        await db.from("drafts").upsert(
          {
            consultation_id: consultation.id,
            body: result.summaryMessage,
            draft_type: "doc",
            doc_content: result.docContent,
            status: "pending",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "consultation_id" }
        );
      }
      generated++;
    } catch (err: any) {
      errors.push(`consultation ${consultation.id}: ${err.message}`);
    }
  }

  return NextResponse.json({
    generated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
