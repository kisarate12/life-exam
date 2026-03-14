import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../components/Nav";

export const metadata: Metadata = {
  title: "プライバシーポリシー | 人生審査",
  description: "人生審査のプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen relative z-10">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="card-rpg p-8">
          <h1 className="text-2xl font-bold text-[var(--theme-text)]">プライバシーポリシー</h1>
          <p className="mt-2 text-sm text-[var(--theme-text-sub)]">最終更新日：当サイトの更新に合わせて適宜改定します。</p>

          <section className="mt-8 space-y-6 text-[var(--theme-text)]">
            <div>
              <h2 className="text-lg font-semibold">1. 事業者</h2>
              <p className="mt-2 text-sm leading-relaxed">
                本サービス「人生審査」の提供者は、当社（運営者）です。お問い合わせは公式LINEよりお願いいたします。
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">2. 収集する情報</h2>
              <p className="mt-2 text-sm leading-relaxed">
                当社は、サービスの提供・改善・サポートのため、以下の情報を収集することがあります。
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>年齢・性別・都道府県（基本情報として入力いただく内容）</li>
                <li>診断結果（スコア・ランク・世界・キャラクター等）</li>
                <li>LINE連携時のお客様を識別するためのID（相談対応の連携に利用する場合）</li>
                <li>アクセスログ・Cookie・端末情報（サービスの利用状況の把握・改善のため）</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">3. 利用目的</h2>
              <p className="mt-2 text-sm leading-relaxed">
                収集した情報は、サービスの提供、診断結果の表示・ランキングの算出、サービス改善、お問い合わせ・相談対応、および公式LINEアカウントとの連携によるサポートに利用します。
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">4. 顧客情報の外部提供</h2>
              <p className="mt-2 text-sm leading-relaxed">
                お客様の情報を、サービス提供・相談対応のため、提携する外部事業者に提供することがあります。例えば、LINE株式会社のプラットフォームを通じた公式LINEアカウントの運営において、お客様の識別や相談内容の対応のために、当社が保有するお客様情報（識別子・診断結果の参照に必要な情報等）を当該公式LINEアカウント運営に利用することがあります。提供する範囲は、上記目的に必要な限度とし、法令で認められる場合を除き、お客様の同意なく目的外利用や第三者への再提供は行いません。
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                個人情報を具体的に利用する場合は、公式LINE内において別途ご同意をいただく場合があります。
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">5. 第三者提供</h2>
              <p className="mt-2 text-sm leading-relaxed">
                法令に基づく開示請求、裁判所の命令、その他法令に定められた場合を除き、お客様の同意なく個人を識別できる形で第三者に提供することはありません。
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">6. Cookie・アクセス解析</h2>
              <p className="mt-2 text-sm leading-relaxed">
                当サイトでは、利用状況の把握・改善のため、Cookieやアクセス解析ツール（例：Vercel Speed Insights）を使用することがあります。これらはサービス品質の向上を目的とし、個人の特定を目的とはしません。
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">7. お問い合わせ</h2>
              <p className="mt-2 text-sm leading-relaxed">
                プライバシーに関するお問い合わせは、公式LINE（LINEで相談）よりご連絡ください。
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">8. 改定</h2>
              <p className="mt-2 text-sm leading-relaxed">
                本ポリシーは、必要に応じて改定することがあります。改定した場合は、本ページで告知します。
              </p>
            </div>
          </section>

          <p className="mt-10">
            <Link href="/life-exam" className="text-[var(--theme-gold-bright)] underline hover:text-white transition-colors">
              トップへ戻る
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
