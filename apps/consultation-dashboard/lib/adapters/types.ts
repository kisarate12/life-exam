export type Platform = "gmail" | "slack" | "google_chat";

export interface FetchedMessage {
  platform: Platform;
  senderDisplay: string;
  body: string;
  platformThreadId?: string;
  platformMessageId: string;
  receivedAt: Date;
}

export interface ConnectionTokens {
  accessToken: string;
  refreshToken?: string;
  platformAccountId?: string;
}

export interface PlatformAdapter {
  platform: Platform;
  /** メッセージ一覧を取得する */
  fetchMessages(tokens: ConnectionTokens): Promise<FetchedMessage[]>;
  /** 指定スレッド/チャンネルに返信を送信する */
  sendReply(
    tokens: ConnectionTokens,
    message: FetchedMessage,
    replyBody: string
  ): Promise<void>;
}
