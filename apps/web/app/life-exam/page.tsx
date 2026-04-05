"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import Nav from "../components/Nav";

const CHARACTER_GALLERY = [
  {
    world: "空の世界",
    color: "#4A90D9",
    bg: "rgba(74,144,217,0.08)",
    chars: [
      { name: "イカロス", code: "MFCH", desc: "4つの翼を広げ、頂点へ向かって飛ぶ者。あと一歩で神になれる" },
      { name: "孤独な大王", code: "MFLH", desc: "お金も時間も健康も揃っているのに、誰も隣にいない王" },
      { name: "スフィンクス", code: "MFCS", desc: "お金も時間も仲間も揃っているが、健康だけが悲鳴を上げる" },
      { name: "カイコ", code: "MFLS", desc: "豊かな繭の中で世界から切り離された存在" },
    ],
  },
  {
    world: "海の世界",
    color: "#1B6B93",
    bg: "rgba(27,107,147,0.08)",
    chars: [
      { name: "ツクヨミ", code: "PFCH", desc: "時間の自由を手にした月の住人" },
      { name: "没落貴族", code: "PFLH", desc: "財産は失ったが品格と余裕は本物の自由人" },
      { name: "ナマケモノ", code: "PFCS", desc: "のんびり生きるからこそ見えてくるものがある" },
      { name: "カタツムリ", code: "PFLS", desc: "時間だけはたっぷり、でもそれだけ" },
    ],
  },
  {
    world: "地上の世界",
    color: "#2D7D2D",
    bg: "rgba(45,125,45,0.08)",
    chars: [
      { name: "ドワーフの王", code: "MBCH", desc: "時間さえあれば完璧な王" },
      { name: "騎士", code: "MBLH", desc: "カレンダーに空白がない勇者" },
      { name: "タヌキ", code: "MBCS", desc: "器用に生きて大切なものとすり替わった" },
      { name: "フンコロガシ", code: "MBLS", desc: "お金だけ積み上がり他が消えた" },
    ],
  },
  {
    world: "闇の世界",
    color: "#6B3FA0",
    bg: "rgba(107,63,160,0.08)",
    chars: [
      { name: "オークの族長", code: "PBCH", desc: "貧しくても今日も誰かと笑える" },
      { name: "流れ者", code: "PBLH", desc: "健康な体一つで荷物を持たずどこへでも行ける" },
      { name: "ハイエナ", code: "PBCS", desc: "厳しい状況でも粘り強く生き延びる" },
      { name: "蚊", code: "PBLS", desc: "全てが底をついた、ここからがスタート" },
    ],
  },
];

const LP_SECTION_IDS = ["section-1", "section-about", "section-characters", "section-features", "section-recommend", "section-final-cta"] as const;

function CtaButton({ href, className = "" }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-block rounded-xl font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:opacity-95 ${className}`}
      style={{
        background: "linear-gradient(145deg, var(--theme-accent-gold), var(--brand-primary-hover))",
        padding: "18px 48px",
        fontSize: 18,
        boxShadow: "0 4px 20px rgba(245,117,80,0.25)",
      }}
    >
      診断を受ける
    </Link>
  );
}

export default function LifeExamPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("life-exam-top-scroll");
    const footer = document.getElementById("site-footer");
    if (!footer) return () => el.classList.remove("life-exam-top-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) el.classList.remove("life-exam-top-scroll");
        else el.classList.add("life-exam-top-scroll");
      },
      { root: null, threshold: 0, rootMargin: "0px 0px 0px 0px" }
    );
    observer.observe(footer);
    return () => {
      observer.disconnect();
      el.classList.remove("life-exam-top-scroll");
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const allSections = LP_SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (allSections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.querySelectorAll(".fade-in-content").forEach((child) => {
            const html = child as HTMLElement;
            html.style.transition = "opacity 0.8s ease, transform 0.8s ease";
            html.style.opacity = "1";
            html.style.transform = "translateY(0)";
          });
        }
      },
      { root: null, rootMargin: "-10% 0px", threshold: 0 }
    );
    allSections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [loading]);

  const startHref = "/life-exam/new";

  return (
    <div className="life-exam-top-page relative z-10">
      <Nav />

      {/* ======================================================
          セクション①：ヒーロー
          ====================================================== */}
      <section id="section-1" className="top-page-section section min-h-screen bg-white pt-[73px]">
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">

          {/* キャラクター装飾（上段4体） */}
          <div className="fade-in-content mb-6 flex items-end justify-center gap-3 sm:gap-5">
            {[
              { name: "イカロス", size: "w-16 h-16 sm:w-20 sm:h-20" },
              { name: "孤独な大王", size: "w-14 h-14 sm:w-18 sm:h-18" },
              { name: "ツクヨミ", size: "w-16 h-16 sm:w-20 sm:h-20" },
              { name: "ナマケモノ", size: "w-14 h-14 sm:w-18 sm:h-18" },
            ].map((c) => (
              <img
                key={c.name}
                src={`/life-diagnosis/characters/${encodeURIComponent(c.name)}.png`}
                alt={c.name}
                className={`${c.size} object-contain drop-shadow-md`}
                loading="eager"
              />
            ))}
          </div>

          <div className="fade-in-content">
            <p
              className="font-bold leading-tight text-[var(--theme-text)]"
              style={{ fontSize: "clamp(26px, 5.5vw, 44px)" }}
            >
              あなたの人生は
              <br />
              どの世界の住人？
            </p>
          </div>
          <div
            className="fade-in-content mt-6 text-[var(--theme-text)] md:mt-8"
            style={{ fontSize: "clamp(14px, 2.5vw, 17px)", lineHeight: 1.7, opacity: 0.95 }}
          >
            <p>資産・収入・時間・人間関係・健康</p>
            <p className="mt-0.5">5つの資本から</p>
            <p className="mt-3 font-semibold">あなたの人生ランクを診断</p>
          </div>

          {/* キャラクター装飾（下段4体） */}
          <div className="fade-in-content mt-6 flex items-start justify-center gap-3 sm:gap-5">
            {[
              { name: "ドワーフの王", size: "w-14 h-14 sm:w-18 sm:h-18" },
              { name: "タヌキ", size: "w-16 h-16 sm:w-20 sm:h-20" },
              { name: "オークの族長", size: "w-14 h-14 sm:w-18 sm:h-18" },
              { name: "蚊", size: "w-16 h-16 sm:w-20 sm:h-20" },
            ].map((c) => (
              <img
                key={c.name}
                src={`/life-diagnosis/characters/${encodeURIComponent(c.name)}.png`}
                alt={c.name}
                className={`${c.size} object-contain drop-shadow-md`}
                loading="eager"
              />
            ))}
          </div>

          {/* バッジ: 3分 / 25問 / 無料 */}
          <div className="fade-in-content mt-8 flex items-center gap-3">
            {["3分", "25問", "無料"].map((label) => (
              <span
                key={label}
                className="rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={{
                  borderColor: "var(--theme-accent-gold)",
                  color: "var(--theme-accent-gold)",
                  background: "rgba(245,117,80,0.08)",
                }}
              >
                {label}
              </span>
            ))}
          </div>

          <CtaButton href={startHref} className="fade-in-content mt-8" />

          <p
            className="animate-bounce-soft absolute bottom-10 right-6 text-[var(--theme-text-sub)] md:right-10"
            style={{ fontSize: 15 }}
          >
            ↓ スクロールして詳しく見る
          </p>
        </div>
      </section>

      {/* ======================================================
          セクション：人生診断とは？
          ====================================================== */}
      <section id="section-about" className="lp-content-section bg-[#F7E9C6] py-20 md:py-28">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2
            className="fade-in-content font-bold text-[var(--theme-text)]"
            style={{ fontSize: "clamp(22px, 4vw, 32px)" }}
          >
            人生診断とは？
          </h2>
          <div className="fade-in-content mx-auto mt-4 h-0.5 w-12" style={{ background: "var(--theme-accent-gold)" }} />
          <p
            className="fade-in-content mt-8 leading-relaxed text-[var(--theme-text)]"
            style={{ fontSize: "clamp(14px, 2.5vw, 16px)", lineHeight: 2 }}
          >
            人生の豊かさは、お金だけでは測れない。
            <br />
            <strong>資産・収入・時間・人間関係・健康</strong>の
            <br className="md:hidden" />
            5つの資本を数値化し、
            <br />
            あなたの人生を<strong>偏差値</strong>と<strong>ランク</strong>で可視化します。
            <br />
            <br className="hidden md:block" />
            同世代・全国の中で自分がどの位置にいるのか。
            <br />
            それを知ることが、次の一歩につながります。
          </p>
        </div>
      </section>

      {/* ======================================================
          セクション：キャラクター紹介（16タイプ）
          ====================================================== */}
      <section id="section-characters" className="lp-content-section bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4">
          <h2
            className="fade-in-content text-center font-bold text-[var(--theme-text)]"
            style={{ fontSize: "clamp(22px, 4vw, 32px)" }}
          >
            16タイプのキャラクター
          </h2>
          <div className="fade-in-content mx-auto mt-4 h-0.5 w-12" style={{ background: "var(--theme-accent-gold)" }} />
          <p className="fade-in-content mt-4 text-center text-[var(--theme-text-sub)]" style={{ fontSize: 15 }}>
            あなたはどのキャラクター？
          </p>

          <div className="mt-12 space-y-10">
            {CHARACTER_GALLERY.map((group) => (
              <div key={group.world} className="fade-in-content">
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="inline-block rounded-full px-4 py-1 text-xs font-bold text-white"
                    style={{ background: group.color }}
                  >
                    {group.world}
                  </span>
                  <div className="h-px flex-1" style={{ background: `${group.color}30` }} />
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                  {group.chars.map((char) => (
                    <div
                      key={char.name}
                      className="char-gallery-card flex flex-col items-center rounded-2xl border p-4 text-center transition-shadow hover:shadow-md"
                      style={{
                        borderColor: `${group.color}25`,
                        background: group.bg,
                      }}
                    >
                      <div
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 shadow-sm md:h-24 md:w-24"
                        style={{ borderColor: `${group.color}50`, background: "rgba(255,255,255,0.7)" }}
                      >
                        <img
                          src={`/life-diagnosis/characters/${encodeURIComponent(char.name)}.png`}
                          alt={char.name}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <p
                        className="mt-3 font-mono font-bold tracking-widest"
                        style={{ fontSize: "clamp(10px, 1.8vw, 12px)", color: group.color, opacity: 0.7 }}
                      >
                        {char.code}
                      </p>
                      <p
                        className="mt-0.5 font-bold text-[var(--theme-text)]"
                        style={{ fontSize: "clamp(12px, 2.5vw, 15px)" }}
                      >
                        {char.name}
                      </p>
                      <p
                        className="mt-1 text-[var(--theme-text-sub)]"
                        style={{ fontSize: "clamp(10px, 2vw, 12px)", lineHeight: 1.5 }}
                      >
                        {char.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="fade-in-content mt-12 text-center">
            <CtaButton href={startHref} />
          </div>
        </div>
      </section>

      {/* ======================================================
          セクション：診断でわかること
          ====================================================== */}
      <section id="section-features" className="lp-content-section bg-[#F7E9C6] py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <h2
            className="fade-in-content text-center font-bold text-[var(--theme-text)]"
            style={{ fontSize: "clamp(22px, 4vw, 32px)" }}
          >
            診断でわかること
          </h2>
          <div className="fade-in-content mx-auto mt-4 h-0.5 w-12" style={{ background: "var(--theme-accent-gold)" }} />

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "5科目の偏差値",
                desc: "資産・収入・時間・人間関係・健康をそれぞれスコア化。どの資本が強く、どこに伸びしろがあるかが一目でわかる。",
                accent: "#F57550",
              },
              {
                title: "全国・同世代ランキング",
                desc: "全受験者の中であなたは何位？同世代と比較した順位もわかる。",
                accent: "#FFB84E",
              },
              {
                title: "あなたの世界とキャラクター",
                desc: "4つの世界 × 4キャラクター = 全16タイプ。あなたの人生パターンをキャラクターで表現。",
                accent: "#90C6CF",
              },
              {
                title: "改善クエスト",
                desc: "各科目の弱点に応じた具体的な改善アクションを提案。何から始めればいいかが見える。",
                accent: "#43756B",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="fade-in-content overflow-hidden rounded-2xl bg-white p-6 shadow-sm"
                style={{ borderBottom: `4px solid ${item.accent}` }}
              >
                <h3 className="text-lg font-bold text-[var(--theme-text)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-sub)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          セクション：こんな方におすすめ
          ====================================================== */}
      <section id="section-recommend" className="lp-content-section bg-[#F7E9C6] py-20 md:py-28">
        <div className="mx-auto max-w-2xl px-6">
          <h2
            className="fade-in-content text-center font-bold text-[var(--theme-text)]"
            style={{ fontSize: "clamp(22px, 4vw, 32px)" }}
          >
            こんな方におすすめ
          </h2>
          <div className="fade-in-content mx-auto mt-4 h-0.5 w-12" style={{ background: "var(--theme-accent-gold)" }} />

          <div className="mt-10 space-y-5">
            {[
              "自分の人生を客観的に数値化したい方",
              "同世代と比べて自分がどの位置にいるか知りたい方",
              "お金だけでなく、時間や健康も含めた「本当の豊かさ」を知りたい方",
              "何を優先的に改善すべきか、ヒントがほしい方",
              "診断結果をSNSでシェアして友達と比べたい方",
            ].map((text) => (
              <div
                key={text}
                className="fade-in-content flex items-start gap-3 rounded-xl border border-[var(--theme-border)] bg-white px-5 py-4"
              >
                <span className="mt-0.5 text-lg" style={{ color: "var(--theme-accent-gold)" }}>✓</span>
                <p className="text-[15px] font-medium text-[var(--theme-text)]">{text}</p>
              </div>
            ))}
          </div>

          <div className="fade-in-content mt-12 text-center">
            <CtaButton href={startHref} />
          </div>
        </div>
      </section>

      {/* ======================================================
          最終CTA
          ====================================================== */}
      <section id="section-final-cta" className="top-page-section section min-h-screen bg-white">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <p className="fade-in-content font-bold text-[var(--theme-text)]" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
            あなたはどの世界の住人？
          </p>
          <p className="fade-in-content mt-5 text-[var(--theme-text)]" style={{ fontSize: 18, lineHeight: 1.7, opacity: 0.9 }}>
            今すぐ診断して、あなたの人生ランクを確かめよう
          </p>

          <div className="fade-in-content mt-6 flex items-center gap-3">
            {["3分", "25問", "無料"].map((label) => (
              <span
                key={label}
                className="rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={{
                  borderColor: "var(--theme-accent-gold)",
                  color: "var(--theme-accent-gold)",
                  background: "rgba(245,117,80,0.08)",
                }}
              >
                {label}
              </span>
            ))}
          </div>

          <CtaButton href={startHref} className="fade-in-content mt-8" />

          <p className="fade-in-content mt-6 text-sm text-[var(--theme-text-sub)]">
            年齢・職業を問わず、すべての人に。
          </p>
        </div>
      </section>
    </div>
  );
}
