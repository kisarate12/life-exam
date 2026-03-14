import { gmailAdapter } from "./gmail";
import { slackAdapter } from "./slack";
import { googleChatAdapter } from "./google_chat";
import type { Platform, PlatformAdapter } from "./types";

const adapters: Record<Platform, PlatformAdapter> = {
  gmail: gmailAdapter,
  slack: slackAdapter,
  google_chat: googleChatAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  return adapters[platform];
}

export type { Platform, FetchedMessage, ConnectionTokens, PlatformAdapter } from "./types";
