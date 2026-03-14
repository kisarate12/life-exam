import { google } from "googleapis";
import type { ConnectionTokens, FetchedMessage, PlatformAdapter } from "./types";

function buildOAuth2Client(tokens: ConnectionTokens) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google_chat`
  );
  oauth2.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  return oauth2;
}

export const googleChatAdapter: PlatformAdapter = {
  platform: "google_chat",

  async fetchMessages(tokens): Promise<FetchedMessage[]> {
    const auth = buildOAuth2Client(tokens);
    const chat = google.chat({ version: "v1", auth });

    // 対象: DM のみ。ルーム型スペース（入っているだけのスペース）は対象外で取得しない。
    const spacesRes = await chat.spaces.list({
      filter: "spaceType = DIRECT_MESSAGE",
      pageSize: 10,
    });

    const spaces = spacesRes.data.spaces ?? [];
    const results: FetchedMessage[] = [];

    for (const space of spaces.slice(0, 5)) {
      if (!space.name) continue;

      const messagesRes = await chat.spaces.messages.list({
        parent: space.name,
        pageSize: 10,
      });

      for (const msg of messagesRes.data.messages ?? []) {
        if (!msg.name || !msg.text) continue;

        results.push({
          platform: "google_chat",
          senderDisplay: msg.sender?.displayName ?? "不明",
          body: msg.text.slice(0, 4000),
          platformThreadId: msg.thread?.name ?? undefined,
          platformMessageId: msg.name,
          receivedAt: msg.createTime ? new Date(msg.createTime) : new Date(),
        });
      }
    }

    return results;
  },

  async sendReply(tokens, message, replyBody): Promise<void> {
    const auth = buildOAuth2Client(tokens);
    const chat = google.chat({ version: "v1", auth });

    // "spaces/xxx/messages/yyy" からスペース名を取得
    const spaceName = message.platformMessageId.split("/messages/")[0];

    await chat.spaces.messages.create({
      parent: spaceName,
      requestBody: {
        text: replyBody,
        ...(message.platformThreadId && {
          thread: { name: message.platformThreadId },
          messageReplyOption: "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD",
        }),
      },
    });
  },
};
