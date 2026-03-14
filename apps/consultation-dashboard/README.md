# 相談返信ダッシュボード

Gmail・Slack・Google Chat からの相談を一覧し、AI（Claude）が生成した返信下書きを **Accept / Reject** で承認してから各プラットフォームに返信する Web ダッシュボードです。

## 機能

- Gmail / Slack / Google Chat の相談取得・返信
- **対象外フィルタ**: Gmail は To/Cc に自分が含まれるメールのみ。Chat は DM のみ（ルームは対象外）
- AI（Claude）による返信下書きの一括生成
- **長文・設計指示**: 一定文字数以上は Google Document にまとめ、共有 URL を返信
- Accept → 該当プラットフォームへ即時返信（Doc の場合は作成後に URL を差し込んで送信）
- Reject → 却下し、再生成可能

---

## セットアップ

### 1. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` の各項目を以下の手順で取得してください。

---

### 2. Supabase のセットアップ

1. [Supabase](https://supabase.com) でプロジェクトを作成する
2. SQL エディタで `/supabase/migrations/00027_consultation_dashboard.sql` を実行する
3. **Project Settings → API** から以下をコピーして `.env.local` に設定する
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Authentication → Providers** で Email/Password を有効にする
5. **Authentication → Users** からマネージャーアカウントを手動作成する（または Sign Up で登録）

---

### 3. GCP での Gmail API 有効化

1. [GCP コンソール](https://console.cloud.google.com/) でプロジェクトを作成または選択する
2. **APIs & Services → Library** で **Gmail API**, **Google Drive API**, **Google Docs API** を有効化する
3. **APIs & Services → OAuth consent screen** を設定する
   - User Type: External（または Internal）
   - スコープ: `gmail.readonly`, `gmail.send`, `gmail.modify`, `drive.file`, `documents`
4. **APIs & Services → Credentials** で **OAuth 2.0 Client IDs** を作成する
   - Type: Web application
   - Authorized redirect URIs に追加: `http://localhost:3001/api/auth/callback/gmail`
5. クライアント ID とシークレットを `.env.local` の `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` に設定する

> **Phase 2（Google Chat API）**: 同じ GCP プロジェクトで Google Chat API を有効化し、OAuth スコープに `https://www.googleapis.com/auth/chat.messages` を追加する。

---

### 4. Slack アプリの作成

1. [api.slack.com/apps](https://api.slack.com/apps) にアクセスし、**Create New App → From scratch** を選択する
2. アプリ名とワークスペースを選択する
3. **OAuth & Permissions** で Redirect URLs に追加: `http://localhost:3001/api/auth/callback/slack`
4. **OAuth & Permissions → Scopes** に以下を追加する
   - **Bot Token Scopes**: `channels:history`, `im:history`, `im:read`, `chat:write`, `users:read`
   - **User Token Scopes**: `channels:history`, `im:history`, `im:read`, `chat:write`
5. **App Credentials** から `Client ID` と `Client Secret` を `.env.local` に設定する
6. **Install to Workspace** でアプリをインストールする

---

### 5. トークン暗号化キーの生成

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

出力された 64 文字の hex 文字列を `.env.local` の `TOKEN_ENCRYPTION_KEY` に設定する。

---

### 6. 起動

```bash
# 依存パッケージのインストール
npm install

# 開発サーバー起動（ポート 3001）
npm run dev
```

ブラウザで http://localhost:3001 にアクセスし、Supabase で作成したアカウントでログインする。

---

## ディレクトリ構成

```
apps/consultation-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/callback/
│   │   │   ├── gmail/route.ts   # Gmail OAuth コールバック
│   │   │   └── slack/route.ts   # Slack OAuth コールバック
│   │   ├── connections/
│   │   │   ├── route.ts         # GET: 接続一覧
│   │   │   ├── gmail/route.ts   # GET: Gmail OAuth URL
│   │   │   └── slack/route.ts   # GET: Slack OAuth URL
│   │   ├── consultations/
│   │   │   ├── route.ts         # GET: 相談一覧
│   │   │   └── sync/route.ts    # POST: メッセージ同期
│   │   └── drafts/
│   │       ├── generate/route.ts          # POST: 一括下書き生成
│   │       └── [id]/
│   │           ├── accept/route.ts        # POST: 承認・送信
│   │           ├── reject/route.ts        # POST: 却下
│   │           └── regenerate/route.ts    # POST: 再生成
│   ├── components/Nav.tsx
│   ├── connections/page.tsx   # 接続設定画面
│   ├── dashboard/page.tsx     # 相談一覧（メイン）
│   └── login/page.tsx         # ログイン画面
├── lib/
│   ├── supabase.ts            # Supabase クライアント
│   ├── crypto.ts              # AES-256-GCM 暗号化
│   ├── ai.ts                  # Anthropic API（下書き生成）
│   └── adapters/
│       ├── types.ts           # プラットフォームアダプタ型定義
│       ├── gmail.ts           # Gmail アダプタ
│       ├── slack.ts           # Slack アダプタ
│       └── index.ts           # アダプタファクトリ
└── middleware.ts              # 認証ミドルウェア（未認証→/login）
```

## Phase 2 への拡張方法（Google Chat）

1. `lib/adapters/google_chat.ts` を作成し `PlatformAdapter` インターフェースを実装する
2. `lib/adapters/index.ts` の `adapters` オブジェクトに `google_chat` アダプタを追加する
3. `/app/api/connections/google_chat/route.ts`（OAuth URL）と `/app/api/auth/callback/google_chat/route.ts`（コールバック）を追加する
4. 接続設定画面（`connections/page.tsx`）に Google Chat ボタンを追加する
