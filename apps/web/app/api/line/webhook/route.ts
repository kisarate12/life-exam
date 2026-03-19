import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { messagingApi } from "@line/bot-sdk";
import { createClient } from "@supabase/supabase-js";

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
const WEB_BASE_URL = process.env.WEB_BASE_URL ?? "https://life-exam.vercel.app";

const CHARACTER_MESSAGE: Record<string, string> = {
  アマテラスオオミカミ: "人生の頂点に立つあなたの結果、ぜひ確認してみてください！",
  大将軍: "連戦連勝の実力者、あなたの診断結果はこちら！",
  獅子: "孤高の王者、あなたの診断結果はこちら！",
  カイコ: "豊かな繭の中のあなた、診断結果を確認してみてください！",
  ツクヨミ: "時間の使い方が上手なあなた、結果はこちら！",
  下流貴族: "本物の豊かさを持つあなたの診断結果はこちら！",
  亀: "マイペースなあなたの診断結果、のんびり確認してみてください！",
  カタツムリ: "殻を破るきっかけに、あなたの診断結果はこちら！",
  ドワーフの王: "働き者のあなた、診断結果はこちらです！",
  騎士: "誠実なあなたの診断結果、確認してみてください！",
  タヌキ: "要領のいいあなたの診断結果はこちら！",
  フンコロガシ: "一度立ち止まって、あなたの診断結果を確認してみてください！",
  ゴブリンキング: "心の豊かさを持つあなたの診断結果はこちら！",
  農奴: "誠実なあなたに、きっと届く結果がここにあります！",
  ハイエナ: "まだ終わりじゃない、あなたの診断結果はこちら！",
  蚊: "ここからが本当のスタート、あなたの診断結果はこちら！",
};

function validateSignature(rawBody: Buffer, signature: string): boolean {
  const hash = crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");
  return hash === signature;
}

async function handleFollow(event: {
  replyToken: string;
  source: { userId: string };
  follow: { referral?: { ref?: string } };
}): Promise<void> {
  const userId = event.source?.userId;
  const attemptId = event.follow?.referral?.ref;
  const replyToken = event.replyToken;

  if (!userId || !attemptId || !replyToken) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: click } = await supabase
    .from("life_exam_line_clicks")
    .select("character_name")
    .eq("attempt_id", attemptId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const resultUrl = `${WEB_BASE_URL}/life-exam/result/${attemptId}`;
  const characterName = click?.character_name ?? "";
  const message = characterName
    ? (CHARACTER_MESSAGE[characterName] ?? `「${characterName}」の診断結果はこちら！`)
    : "診断お疲れさまでした！あなたの結果を確認してみてください。";

  const client = new messagingApi.MessagingApiClient({
    channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  });

  await client.replyMessage({
    replyToken,
    messages: [
      {
        type: "text",
        text: `${message}\n\n📊 診断結果はこちら👇\n${resultUrl}`,
      },
    ],
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("x-line-signature") ?? "";
  const rawBody = Buffer.from(await request.arrayBuffer());

  if (!validateSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    const body = JSON.parse(rawBody.toString()) as { events?: unknown[] };
    for (const event of body.events ?? []) {
      const e = event as { type: string };
      if (e.type === "follow") {
        await handleFollow(e as unknown as Parameters<typeof handleFollow>[0]);
      }
    }
  } catch (_e) {
    // パースや送信エラーでも 200 を返す（LINE の再送を防ぐ）
  }

  return NextResponse.json({ ok: true });
}
