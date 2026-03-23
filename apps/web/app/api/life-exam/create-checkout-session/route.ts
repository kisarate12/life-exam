import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
  const { attempt_id } = await req.json();
  if (!attempt_id || typeof attempt_id !== "string") {
    return NextResponse.json({ error: "attempt_id is required" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "jpy",
          unit_amount: 980,
          product_data: {
            name: "人生診断 詳細レポート",
            description: "レーダーチャート・科目別パーセンタイル・改善クエストを含む詳細レポート",
          },
        },
        quantity: 1,
      },
    ],
    metadata: { attempt_id },
    success_url: `${origin}/life-exam/result/${attempt_id}/report?purchased=1`,
    cancel_url: `${origin}/life-exam/result/${attempt_id}`,
  });

  return NextResponse.json({ url: session.url });
}
