import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** この文字数以上なら長文とみなし、Google Doc にまとめて URL 共有する候補にする */
const DOC_LENGTH_THRESHOLD = 2000;

export type DraftResult =
  | { draftType: "short"; body: string }
  | { draftType: "doc"; summaryMessage: string; docContent: string };

/**
 * 相談本文が長文または全体設計の指示かどうかを閾値で判定する
 */
export function shouldUseDoc(body: string): boolean {
  return body.length >= DOC_LENGTH_THRESHOLD;
}

/**
 * 相談本文から返信下書きを生成する（短文 or Doc 用の本文＋要約メッセージ）
 * @param body 相談の本文
 * @param senderDisplay 送信者名
 * @returns 短文の場合は body のみ。Doc の場合は送信用短文と Doc 本文
 */
export async function generateDraft(
  body: string,
  senderDisplay: string
): Promise<string> {
  const result = await generateDraftOrDoc(body, senderDisplay);
  if (result.draftType === "short") return result.body;
  return result.summaryMessage;
}

/**
 * 短文か Doc かを判定し、それぞれ返信案を生成する。
 * 長文・設計指示の場合は Doc 用の本文と、送信する短文（URL 差し込み用）を返す。
 */
export async function generateDraftOrDoc(
  body: string,
  senderDisplay: string
): Promise<DraftResult> {
  const useDoc = shouldUseDoc(body);

  if (useDoc) {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `あなたはマネージャーのアシスタントです。以下の相談は長文または全体設計の指示のため、返信内容を Google Document にまとめ、URL を共有する形式にします。

【送信者】${senderDisplay}
【相談内容】
${body.slice(0, 12000)}

---
次の 2 つを生成してください。

1) docContent: 相談への返信本文（設計案・方針・詳細説明など）。見出しや箇条書きを使って読みやすく。Doc にそのまま書き込む内容です。説明や前置きは不要で、本文のみ。

2) summaryMessage: 相談者に送る短文メッセージ（チャットやメールに送る一文）。例：「設計案を Doc にまとめました。ご確認ください: [URL]」のように、[URL] の部分はそのまま [URL] と書いてください。URL は後で差し込みます。

以下の JSON のみを出力してください（他に説明は不要）:
{"docContent":"...", "summaryMessage":"..."}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("AI からテキスト応答が得られませんでした");
    }
    const text = content.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI が JSON を返しませんでした");
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      docContent?: string;
      summaryMessage?: string;
    };
    const docContent = parsed.docContent ?? text;
    const summaryMessage =
      parsed.summaryMessage ?? "詳細を Doc にまとめました: [URL]";
    return { draftType: "doc", summaryMessage, docContent };
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `あなたはマネージャーのアシスタントです。以下の相談メッセージに対する返信案を日本語で作成してください。

【送信者】${senderDisplay}
【相談内容】
${body}

---
返信案を作成してください。以下の点に注意してください：
- 丁寧かつ簡潔に
- 相談内容に具体的に応答する
- 「〜かと思います」「〜いたします」など適切な敬語を使用
- マネージャーが送信前に確認・編集することを想定した文案にする
- 返信案のみを出力し、説明や前置きは不要`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("AI からテキスト応答が得られませんでした");
  }
  return { draftType: "short", body: content.text };
}
