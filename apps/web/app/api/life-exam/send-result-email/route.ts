import { NextResponse } from "next/server";

/**
 * 人生審査の結果をメール送信するAPI（MVP: スタブ可、後でResend/Supabase等に接続）
 */
export async function POST(request: Request) {
  try {
    const { to, subject, body } = (await request.json()) as {
      to?: string;
      subject?: string;
      body?: string;
    };
    if (!to || typeof to !== "string" || !to.includes("@")) {
      return NextResponse.json(
        { error: "有効な宛先メールアドレスが必要です" },
        { status: 400 }
      );
    }

    // TODO: Resend / Supabase Edge Function / SendGrid 等で実際に送信
    // 例: await fetch("https://api.resend.com/emails", { ... })
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "onboarding@resend.dev",
          to: [to],
          subject: subject ?? "【人生審査】診断結果",
          text: body ?? "",
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: "送信に失敗しました" },
          { status: 502 }
        );
      }
    } else {
      // スタブ: 開発時は送信せず 200 を返す
      if (process.env.NODE_ENV === "development") {
        console.log("[send-result-email] stub", { to, subject: subject?.slice(0, 50) });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[send-result-email]", e);
    return NextResponse.json(
      { error: "送信に失敗しました" },
      { status: 500 }
    );
  }
}
