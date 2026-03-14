import { WebClient } from "@slack/web-api";
import type { ConnectionTokens, FetchedMessage, PlatformAdapter } from "./types";

export const slackAdapter: PlatformAdapter = {
  platform: "slack",

  async fetchMessages(tokens): Promise<FetchedMessage[]> {
    const client = new WebClient(tokens.accessToken);
    const results: FetchedMessage[] = [];

    // DM チャンネル (im) の一覧を取得
    const convRes = await client.conversations.list({
      types: "im",
      limit: 20,
    });

    const channels = convRes.channels ?? [];

    for (const channel of channels) {
      if (!channel.id) continue;

      // 各 DM の履歴を取得
      const histRes = await client.conversations.history({
        channel: channel.id,
        limit: 10,
      });

      const messages = histRes.messages ?? [];

      for (const msg of messages) {
        if (!msg.ts || !msg.text) continue;
        // Bot メッセージは除外
        if (msg.bot_id) continue;

        // 送信者の表示名を取得
        let senderDisplay = msg.user ?? "不明";
        if (msg.user) {
          try {
            const userRes = await client.users.info({ user: msg.user });
            senderDisplay =
              userRes.user?.real_name ??
              userRes.user?.name ??
              msg.user;
          } catch {
            // ユーザー情報取得失敗は無視
          }
        }

        results.push({
          platform: "slack",
          senderDisplay,
          body: msg.text.slice(0, 4000),
          platformThreadId: channel.id,
          // channel_id + ts で一意
          platformMessageId: `${channel.id}__${msg.ts}`,
          receivedAt: new Date(Number(msg.ts) * 1000),
        });
      }
    }

    return results;
  },

  async sendReply(tokens, message, replyBody): Promise<void> {
    const client = new WebClient(tokens.accessToken);

    // channel_id を platformThreadId から取得
    const channelId = message.platformThreadId;
    if (!channelId) {
      throw new Error("Slack チャンネル ID が不明です");
    }

    await client.chat.postMessage({
      channel: channelId,
      text: replyBody,
    });
  },
};
