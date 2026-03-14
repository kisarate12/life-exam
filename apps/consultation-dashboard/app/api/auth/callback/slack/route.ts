import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connections?error=slack_auth_failed`
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }

  // Slack OAuth token exchange
  const params = new URLSearchParams({
    code,
    client_id: process.env.SLACK_CLIENT_ID!,
    client_secret: process.env.SLACK_CLIENT_SECRET!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/slack`,
  });

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();

  if (!data.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connections?error=slack_token_failed`
    );
  }

  const accessToken: string = data.authed_user?.access_token ?? data.access_token;
  const teamId: string = data.team?.id ?? "";

  const db = createServiceRoleClient();
  await db.from("connections").upsert(
    {
      user_id: user.id,
      platform: "slack",
      access_token_enc: encrypt(accessToken),
      refresh_token_enc: null,
      platform_account_id: teamId,
      extra_data: { team_name: data.team?.name ?? "" },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/connections?success=slack`
  );
}
