import { google } from "googleapis";
import type { ConnectionTokens } from "./adapters/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

function buildOAuth2Client(
  tokens: ConnectionTokens,
  callbackPath: "gmail" | "google_chat"
) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${APP_URL}/api/auth/callback/${callbackPath}`
  );
  oauth2.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  return oauth2;
}

/**
 * Google Document を新規作成し、本文を書き込んで共有リンク（webViewLink）を返す。
 * Gmail または Google Chat の OAuth トークン（Drive/Docs スコープ付き）を使用する。
 */
export async function createDocWithShareLink(
  tokens: ConnectionTokens,
  options: {
    title: string;
    content: string;
    /** トークンを発行した接続が Gmail なら 'gmail', Google Chat なら 'google_chat' */
    googleCallbackPath: "gmail" | "google_chat";
  }
): Promise<{ webViewLink: string; fileId: string }> {
  const auth = buildOAuth2Client(tokens, options.googleCallbackPath);
  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });

  const title = options.title || "相談返信";
  const content = options.content || "";

  const createRes = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: "application/vnd.google-apps.document",
    },
    fields: "id",
  });

  const fileId = createRes.data.id;
  if (!fileId) {
    throw new Error("Failed to create document: no file id returned");
  }

  if (content) {
    await docs.documents.batchUpdate({
      documentId: fileId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });
  }

  await drive.permissions.create({
    fileId,
    requestBody: {
      type: "anyone",
      role: "reader",
    },
  });

  const getRes = await drive.files.get({
    fileId,
    fields: "webViewLink",
  });

  const webViewLink = getRes.data.webViewLink;
  if (!webViewLink) {
    throw new Error("Failed to get webViewLink for document");
  }

  return { webViewLink, fileId };
}
