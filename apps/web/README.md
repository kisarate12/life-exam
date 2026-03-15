This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 人生診断の公開（Vercel + Supabase）

### 必須: Root Directory の設定（デプロイ失敗時はここを確認）

このリポジトリはモノレポです。**Vercel で必ず次を設定してください。**

1. Vercel ダッシュボード → 対象プロジェクト → **Settings** → **General**
2. **Root Directory** で **Edit** をクリック
3. `apps/web` を指定して **Save**

これが未設定だと、リポジトリルートに `package.json` がなくビルドに失敗します。

### その他の設定

- **環境変数**: Settings → Environment Variables に `.env.example` に記載の 3 つを登録（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`）。
- **Supabase**: 本番の Site URL と Redirect URLs に、デプロイ後の URL（例: `https://<プロジェクト名>.vercel.app`）を設定する。
- 詳細はプロジェクト内の公開手順プランを参照。
