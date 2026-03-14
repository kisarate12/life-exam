import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import { getAdapter } from "@/lib/adapters";
import { createDocWithShareLink } from "@/lib/google-doc";
import type { Platform, FetchedMessage } from "@/lib/adapters";

/** POST /api/drafts/[id]/accept — 下書きを承認して返信を送信する */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();

  const { data: draft, error: draftErr } = await db
    .from("drafts")
    .select(`
      id,
      body,
      draft_type,
      doc_content,
      status,
      consultation_id,
      consultations (
        id,
        platform,
        sender_display,
        body,
        platform_thread_id,
        platform_message_id,
        connection_id,
        connections (
          user_id,
          access_token_enc,
          refresh_token_enc
        )
      )
    `)
    .eq("id", id)
    .single();

  if (draftErr || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const consultation = (draft as any).consultations;
  const connection = consultation?.connections;

  if (!connection || connection.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (draft.status === "accepted") {
    return NextResponse.json({ error: "Already accepted" }, { status: 400 });
  }

  const adapter = getAdapter(consultation.platform as Platform);
  const tokens = {
    accessToken: decrypt(connection.access_token_enc),
    refreshToken: connection.refresh_token_enc
      ? decrypt(connection.refresh_token_enc)
      : undefined,
  };

  let bodyToSend = draft.body;

  if (draft.draft_type === "doc" && draft.doc_content) {
    const googleCallbackPath: "gmail" | "google_chat" =
      consultation.platform === "gmail" ? "gmail" : "google_chat";
    let tokensForDoc = tokens;
    let pathForDoc: "gmail" | "google_chat" = googleCallbackPath;
    if (consultation.platform === "slack") {
      const { data: googleConn } = await db
        .from("connections")
        .select("platform, access_token_enc, refresh_token_enc")
        .eq("user_id", user.id)
        .in("platform", ["gmail", "google_chat"])
        .limit(1)
        .single();
      if (!googleConn) {
        return NextResponse.json(
          { error: "Doc 作成には Gmail または Google Chat の接続が必要です" },
          { status: 400 }
        );
      }
      pathForDoc = googleConn.platform === "gmail" ? "gmail" : "google_chat";
      tokensForDoc = {
        accessToken: decrypt(googleConn.access_token_enc),
        refreshToken: googleConn.refresh_token_enc
          ? decrypt(googleConn.refresh_token_enc)
          : undefined,
      };
    }
    try {
      const title = `相談返信_${new Date().toISOString().slice(0, 10)}_${consultation.sender_display?.slice(0, 20) ?? "unknown"}`;
      const { webViewLink } = await createDocWithShareLink(tokensForDoc, {
        title,
        content: draft.doc_content,
        googleCallbackPath: pathForDoc,
      });
      bodyToSend = draft.body.replace(/\[URL\]/g, webViewLink);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Doc の作成に失敗しました: ${err.message}` },
        { status: 502 }
      );
    }
  }

  const message: FetchedMessage = {
    platform: consultation.platform,
    senderDisplay: consultation.sender_display,
    body: consultation.body,
    platformThreadId: consultation.platform_thread_id ?? undefined,
    platformMessageId: consultation.platform_message_id,
    receivedAt: new Date(),
  };

  await adapter.sendReply(tokens, message, bodyToSend);

  await db
    .from("drafts")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
