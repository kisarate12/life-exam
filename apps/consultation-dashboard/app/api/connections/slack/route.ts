import { NextResponse } from "next/server";

/** GET /api/connections/slack — Slack OAuth URL を返す */
export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: "channels:history,im:history,im:read,chat:write,users:read",
    user_scope: "channels:history,im:history,im:read,chat:write",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/slack`,
  });

  const url = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  return NextResponse.json({ url });
}
