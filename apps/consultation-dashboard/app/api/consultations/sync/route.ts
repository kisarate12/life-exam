import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import { getAdapter } from "@/lib/adapters";
import type { Platform } from "@/lib/adapters";

/** POST /api/consultations/sync — 接続済みプラットフォームからメッセージを同期する */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();

  const { data: connections, error: connErr } = await db
    .from("connections")
    .select("id, platform, access_token_enc, refresh_token_enc")
    .eq("user_id", user.id);

  if (connErr) return NextResponse.json({ error: connErr.message }, { status: 500 });
  if (!connections?.length) return NextResponse.json({ synced: 0 });

  let totalSynced = 0;
  const errors: string[] = [];

  for (const conn of connections) {
    try {
      const adapter = getAdapter(conn.platform as Platform);
      const tokens = {
        accessToken: decrypt(conn.access_token_enc),
        refreshToken: conn.refresh_token_enc ? decrypt(conn.refresh_token_enc) : undefined,
      };

      const messages = await adapter.fetchMessages(tokens);

      for (const msg of messages) {
        const { error: upsertErr } = await db.from("consultations").upsert(
          {
            connection_id: conn.id,
            platform: msg.platform,
            sender_display: msg.senderDisplay,
            body: msg.body,
            platform_thread_id: msg.platformThreadId ?? null,
            platform_message_id: msg.platformMessageId,
            received_at: msg.receivedAt.toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "platform,platform_message_id", ignoreDuplicates: false }
        );

        if (!upsertErr) totalSynced++;
      }
    } catch (err: any) {
      errors.push(`${conn.platform}: ${err.message}`);
    }
  }

  return NextResponse.json({
    synced: totalSynced,
    errors: errors.length > 0 ? errors : undefined,
  });
}
