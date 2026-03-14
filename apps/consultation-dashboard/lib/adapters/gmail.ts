import { google } from "googleapis";
import type { ConnectionTokens, FetchedMessage, PlatformAdapter } from "./types";

function buildOAuth2Client(tokens: ConnectionTokens) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/gmail`
  );
  oauth2.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  return oauth2;
}

/** Base64URL をデコードする */
function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

/** メールの本文（テキストパート）を再帰的に取得する */
function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }
  return "";
}

/** ヘッダ値からメールアドレスを抽出（"Name <a@b.com>" または "a@b.com" 形式） */
function parseAddresses(headerValue: string | undefined): string[] {
  if (!headerValue) return [];
  const addresses: string[] = [];
  const parts = headerValue.split(/[,;]/).map((s) => s.trim());
  for (const part of parts) {
    const match = part.match(/<([^>]+)>/);
    if (match) {
      addresses.push(match[1].toLowerCase());
    } else if (/^[^\s]+@[^\s]+$/.test(part)) {
      addresses.push(part.toLowerCase());
    }
  }
  return addresses;
}

/** 自分宛かどうか（To / Cc / Delivered-To に userEmail が含まれるか） */
function isAddressedToUser(
  headers: { name?: string; value?: string }[],
  userEmail: string
): boolean {
  const toHeader = headers.find((h) => h.name?.toLowerCase() === "to");
  const ccHeader = headers.find((h) => h.name?.toLowerCase() === "cc");
  const deliveredToHeader = headers.find(
    (h) => h.name?.toLowerCase() === "delivered-to"
  );
  const toAddrs = parseAddresses(toHeader?.value);
  const ccAddrs = parseAddresses(ccHeader?.value);
  const deliveredTo = parseAddresses(deliveredToHeader?.value);
  const allRecipients = [...new Set([...toAddrs, ...ccAddrs, ...deliveredTo])];
  const normalized = userEmail.toLowerCase();
  return allRecipients.some((addr) => addr === normalized);
}

export const gmailAdapter: PlatformAdapter = {
  platform: "gmail",

  async fetchMessages(tokens): Promise<FetchedMessage[]> {
    const auth = buildOAuth2Client(tokens);
    const gmail = google.gmail({ version: "v1", auth });

    // 自分宛フィルタ用にプロフィールからメールアドレスを取得
    const profile = await gmail.users.getProfile({ userId: "me" });
    const userEmail = profile.data.emailAddress ?? "";

    // 未読メールを最大 20 件取得
    const listRes = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX", "UNREAD"],
      maxResults: 20,
    });

    const messageIds = listRes.data.messages ?? [];
    const results: FetchedMessage[] = [];

    for (const msg of messageIds) {
      if (!msg.id) continue;
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const headers = detail.data.payload?.headers ?? [];
      // 自分宛でない（To/Cc に自分が含まれない）は対象外
      if (
        userEmail &&
        !isAddressedToUser(headers, userEmail)
      ) {
        continue;
      }

      const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from");
      const dateHeader = headers.find((h) => h.name?.toLowerCase() === "date");

      const senderDisplay = fromHeader?.value ?? "不明";
      const body = extractBody(detail.data.payload);
      const receivedAt = dateHeader?.value
        ? new Date(dateHeader.value)
        : new Date(Number(detail.data.internalDate));

      results.push({
        platform: "gmail",
        senderDisplay,
        body: body.slice(0, 4000), // 長すぎる場合は先頭4000文字
        platformThreadId: detail.data.threadId ?? undefined,
        platformMessageId: detail.data.id!,
        receivedAt,
      });
    }

    return results;
  },

  async sendReply(tokens, message, replyBody): Promise<void> {
    const auth = buildOAuth2Client(tokens);
    const gmail = google.gmail({ version: "v1", auth });

    // 返信メールを構築（同じスレッドに返信）
    const rawMessage = [
      `In-Reply-To: ${message.platformMessageId}`,
      `References: ${message.platformMessageId}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      replyBody,
    ].join("\r\n");

    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        threadId: message.platformThreadId,
      },
    });
  },
};
