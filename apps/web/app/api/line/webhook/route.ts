import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { messagingApi } from "@line/bot-sdk";
import { createClient } from "@supabase/supabase-js";

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
const WEB_BASE_URL = process.env.WEB_BASE_URL ?? "https://life-exam.vercel.app";

const CHARACTER_MESSAGE: Record<string, string> = {
  アマテラスオオミカミ: "人生の頂点に立つあなたの結果、ぜひ確認してみてください！",
  イカロス: "太陽へ向かって飛ぶあなた、頂点まであと一歩！診断結果を確認してください！",
  孤独な大王: "お金も時間も手にした孤高の王、あなたの診断結果はこちら！",
  スフィンクス: "謎めいた実力者、あなたの診断結果はこちら！",
  カイコ: "豊かな繭の中のあなた、診断結果を確認してみてください！",
  ツクヨミ: "時間の使い方が上手なあなた、結果はこちら！",
  没落貴族: "本物の豊かさを持つあなたの診断結果はこちら！",
  ナマケモノ: "マイペースなあなたの診断結果、のんびり確認してみてください！",
  カタツムリ: "殻を破るきっかけに、あなたの診断結果はこちら！",
  ドワーフの王: "働き者のあなた、診断結果はこちらです！",
  騎士: "誠実なあなたの診断結果、確認してみてください！",
  タヌキ: "要領のいいあなたの診断結果はこちら！",
  フンコロガシ: "一度立ち止まって、あなたの診断結果を確認してみてください！",
  オークの族長: "心の豊かさを持つあなたの診断結果はこちら！",
  流れ者: "身軽に生きるあなた、次の物語の始まりがここにあります！",
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
  const attemptId = event.follow?.referral?.ref ?? null;
  const replyToken = event.replyToken;

  if (!userId || !replyToken) return;

  const client = new messagingApi.MessagingApiClient({
    channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  });

  // referral なし → 診断結果ページから追加した場合はブラウザに戻れば解放済み
  if (!attemptId) {
    await client.replyMessage({
      replyToken,
      messages: [
        {
          type: "text",
          text: "友達追加ありがとうございます！📊\n\nレポートはブラウザに戻ると確認できます。\n\n（診断を受けていない場合はこちらから）\n" + WEB_BASE_URL + "/life-exam",
        },
      ],
    });
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let characterName = "";
  if (supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    // ranking_entries を優先（結果ページ表示時に必ず upsert される）
    const { data: entry } = await supabase
      .from("life_exam_ranking_entries")
      .select("character_name")
      .eq("attempt_id", attemptId)
      .single();

    characterName = entry?.character_name ?? "";

    // フォールバック：line_clicks テーブルから取得
    if (!characterName) {
      const { data: click } = await supabase
        .from("life_exam_line_clicks")
        .select("character_name")
        .eq("attempt_id", attemptId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      characterName = click?.character_name ?? "";
    }
  }

  // LINE登録でレポートを無料解放
  if (supabaseUrl && serviceRoleKey) {
    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });
    await supabaseAdmin.from("life_exam_report_purchases").upsert(
      {
        attempt_id: attemptId,
        stripe_session_id: null,
        unlock_method: "line",
        amount_yen: 0,
        paid_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id" }
    );
  }

  // AI分析を非同期生成
  const generateUrl = `${WEB_BASE_URL}/api/life-exam/generate-ai-analysis`;
  fetch(generateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attempt_id: attemptId }),
  }).catch(() => {});

  const reportUrl = `${WEB_BASE_URL}/life-exam/result/${attemptId}/report`;
  const message = characterName
    ? (CHARACTER_MESSAGE[characterName] ?? `「${characterName}」の診断結果はこちら！`)
    : "診断お疲れさまでした！あなたの結果を確認してみてください。";

  await client.replyMessage({
    replyToken,
    messages: [
      {
        type: "text",
        text: `${message}\n\n📋 詳細レポートはこちら👇\n${reportUrl}`,
      },
    ],
  });
}

async function handleMessage(event: {
  replyToken: string;
  source: { userId: string };
  message: { type: string; text?: string };
}): Promise<void> {
  const replyToken = event.replyToken;
  const text = (event.message.text ?? "").trim().toUpperCase().replace(/\s/g, "");
  if (!text) return;

  const client = new messagingApi.MessagingApiClient({
    channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // トークンを検索
  const { data: tokenRow } = await supabase
    .from("life_exam_report_tokens")
    .select("attempt_id, expires_at, used_at")
    .eq("token", text)
    .single();

  if (!tokenRow) {
    await client.replyMessage({
      replyToken,
      messages: [{ type: "text", text: "コードが見つかりません。\n\n診断結果ページで発行コードを確認してください。" }],
    });
    return;
  }

  if (tokenRow.used_at) {
    await client.replyMessage({
      replyToken,
      messages: [{ type: "text", text: "このコードはすでに使用済みです。\n\n新しいコードが必要な場合は診断結果ページで再発行してください。" }],
    });
    return;
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    await client.replyMessage({
      replyToken,
      messages: [{ type: "text", text: "コードの有効期限が切れています。\n\n診断結果ページで再発行してください。" }],
    });
    return;
  }

  // レポート解放
  await supabase.from("life_exam_report_purchases").upsert(
    {
      attempt_id: tokenRow.attempt_id,
      stripe_session_id: null,
      unlock_method: "line",
      amount_yen: 0,
      paid_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id" }
  );

  // トークンを使用済みに更新
  await supabase
    .from("life_exam_report_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", text);

  // AI分析を非同期生成（失敗しても返信は続ける）
  const generateUrl = `${WEB_BASE_URL}/api/life-exam/generate-ai-analysis`;
  fetch(generateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attempt_id: tokenRow.attempt_id }),
  }).catch(() => {});

  const reportUrl = `${WEB_BASE_URL}/life-exam/result/${tokenRow.attempt_id}/report`;
  await client.replyMessage({
    replyToken,
    messages: [
      {
        type: "text",
        text: `コードを確認しました✅\n\n📋 詳細レポートはこちら👇\n${reportUrl}\n\nタップするとレポートが開きます。`,
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
      const e = event as { type: string; replyToken?: string; source?: { userId?: string } };
      if (e.type === "follow") {
        await handleFollow(e as unknown as Parameters<typeof handleFollow>[0]);
      } else if (e.type === "message" && e.replyToken && e.source?.userId) {
        const msg = e as unknown as { type: string; replyToken: string; source: { userId: string }; message: { type: string; text?: string } };
        await handleMessage(msg);
      }
    }
  } catch (_e) {
    // パースや送信エラーでも 200 を返す（LINE の再送を防ぐ）
  }

  return NextResponse.json({ ok: true });
}
