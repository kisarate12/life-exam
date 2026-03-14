import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { encrypt } from "@/lib/crypto";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connections?error=gmail_auth_failed`
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/gmail`
  );

  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  // Google ユーザー情報を取得
  const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
  const userInfo = await oauth2Api.userinfo.get();
  const platformAccountId = userInfo.data.id ?? undefined;

  const db = createServiceRoleClient();
  await db.from("connections").upsert(
    {
      user_id: user.id,
      platform: "gmail",
      access_token_enc: tokens.access_token ? encrypt(tokens.access_token) : null,
      refresh_token_enc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      platform_account_id: platformAccountId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/connections?success=gmail`
  );
}
