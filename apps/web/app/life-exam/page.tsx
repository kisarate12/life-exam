"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import Nav from "../components/Nav";

/** 世界背景画像（public/top-worlds/ または public/images/ に配置） */
const WORLD_BG = {
  sky: "/top-worlds/sky.png",
  sea: "/top-worlds/sea.png",
  ground: "/top-worlds/ground.png",
  underworld: "/top-worlds/underworld.png",
};

/** 各世界のキャラクター画像（public/life-diagnosis/characters/） */
const WORLD_CHARS = {
  sky: ["アマテラス", "大将軍", "獅子", "カイコ"],
  sea: ["ツクヨミ", "下流貴族", "亀", "カタツムリ"],
  ground: ["ドワーフの王", "騎士", "タヌキ", "フンコロガシ"],
  underworld: ["ゴブリンキング", "農奴", "ハイエナ", "蚊"],
} as const;

const SECTION_IDS = ["section-1", "section-2", "section-3", "section-4", "section-5", "section-6"] as const;

/** 表示されたセクションの背景のみ読み込む（初期負荷軽減） */
const WORLD_SECTION_IDS = ["section-2", "section-3", "section-4", "section-5"] as const;

export default function LifeExamPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleBgs, setVisibleBgs] = useState<Record<string, boolean>>({});
  /** 初回表示ではヒーロー＋CTAのみ描画し、アイドル後に世界セクションを描画して初期負荷を削減 */
  const [showWorldSections, setShowWorldSections] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShowWorldSections(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!showWorldSections) return;
    const sections = WORLD_SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).id;
          setVisibleBgs((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
        }
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [loading, showWorldSections]);

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
    if (loading || !showWorldSections) return;
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;
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
      { root: null, rootMargin: "-20% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [loading, showWorldSections]);

  const startHref = "/life-exam/new";

  return (
    <div className="life-exam-top-page relative z-10 bg-white">
      <Nav />
      {/* 1本の長いページで body のみスクロール → スクロールバー1本 */}
      {/* セクション①：ヒーロー（白背景で文字を見やすく） */}
      <section id="section-1" className="top-page-section section min-h-screen bg-white pt-[73px]">
          <div className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
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
            <Link
              href={startHref}
              className="fade-in-content mt-10 rounded-xl font-bold text-white shadow-lg transition hover:opacity-95 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(145deg, var(--theme-accent-gold), var(--brand-primary-hover))",
                padding: "18px 48px",
                fontSize: 18,
                boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
              }}
            >
              診断を受ける
            </Link>
            <p
              className="animate-bounce-soft absolute bottom-10 right-6 text-[var(--theme-text-sub)] md:right-10"
              style={{ fontSize: 15 }}
            >
              ↓ スクロールして世界を見る
            </p>
          </div>
      </section>

      {/* 世界セクションは初回描画後に表示（初期負荷・離脱防止） */}
      {!showWorldSections ? (
        <div aria-hidden className="min-h-[400vh]" style={{ minHeight: "400dvh" }} />
      ) : (
        <>
      {/* セクション②：空の世界 */}
      <section id="section-2" className="top-page-section section relative min-h-screen">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: visibleBgs["section-2"] ? `url(${WORLD_BG.sky})` : undefined }}
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
            <div className="world-card fade-in-content rounded-2xl border border-white/20 px-6 py-4 shadow-xl md:px-10 md:py-5" style={{ background: "rgba(12,18,32,0.55)" }}>
              <h2 className="world-card-title text-center" style={{ fontSize: "clamp(26px, 4vw, 44px)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                空の世界
              </h2>
            </div>
            <div className="fade-in-content flex flex-wrap justify-center gap-4 md:gap-6">
              {WORLD_CHARS.sky.map((name) => (
                <div key={name} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/25 shadow-lg md:h-[120px] md:w-[120px]" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <img src={`/life-diagnosis/characters/${encodeURIComponent(name)}.png`} alt="" className="h-full w-full object-contain" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
      </section>

      {/* セクション③：海の世界 */}
      <section id="section-3" className="top-page-section section relative min-h-screen">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: visibleBgs["section-3"] ? `url(${WORLD_BG.sea})` : undefined }}
          />
          <div className="absolute inset-0 bg-[rgba(0,15,40,0.6)]" />
          <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
            <div className="world-card fade-in-content rounded-2xl border border-white/20 px-6 py-4 shadow-xl md:px-10 md:py-5" style={{ background: "rgba(8,18,35,0.55)" }}>
              <h2 className="world-card-title text-center" style={{ fontSize: "clamp(26px, 4vw, 44px)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                海の世界
              </h2>
            </div>
            <div className="fade-in-content flex flex-wrap justify-center gap-4 md:gap-6">
              {WORLD_CHARS.sea.map((name) => (
                <div key={name} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/25 shadow-lg md:h-[120px] md:w-[120px]" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <img src={`/life-diagnosis/characters/${encodeURIComponent(name)}.png`} alt="" className="h-full w-full object-contain" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
      </section>

      {/* セクション④：地上の世界 */}
      <section id="section-4" className="top-page-section section relative min-h-screen">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: visibleBgs["section-4"] ? `url(${WORLD_BG.ground})` : undefined }}
          />
          <div className="absolute inset-0 bg-[rgba(0,25,0,0.58)]" />
          <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
            <div className="world-card fade-in-content rounded-2xl border border-white/20 px-6 py-4 shadow-xl md:px-10 md:py-5" style={{ background: "rgba(10,22,12,0.55)" }}>
              <h2 className="world-card-title text-center" style={{ fontSize: "clamp(26px, 4vw, 44px)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                地上の世界
              </h2>
            </div>
            <div className="fade-in-content flex flex-wrap justify-center gap-4 md:gap-6">
              {WORLD_CHARS.ground.map((name) => (
                <div key={name} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/25 shadow-lg md:h-[120px] md:w-[120px]" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <img src={`/life-diagnosis/characters/${encodeURIComponent(name)}.png`} alt="" className="h-full w-full object-contain" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
      </section>

      {/* セクション⑤：闇の世界 */}
      <section id="section-5" className="top-page-section section relative min-h-screen">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: visibleBgs["section-5"] ? `url(${WORLD_BG.underworld})` : undefined }}
          />
          <div className="absolute inset-0 bg-[rgba(18,0,35,0.62)]" />
          <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
            <div className="world-card fade-in-content rounded-2xl border border-white/20 px-6 py-4 shadow-xl md:px-10 md:py-5" style={{ background: "rgba(18,8,28,0.55)" }}>
              <h2 className="world-card-title text-center" style={{ fontSize: "clamp(26px, 4vw, 44px)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                闇の世界
              </h2>
            </div>
            <div className="fade-in-content flex flex-wrap justify-center gap-4 md:gap-6">
              {WORLD_CHARS.underworld.map((name) => (
                <div key={name} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/25 shadow-lg md:h-[120px] md:w-[120px]" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <img src={`/life-diagnosis/characters/${encodeURIComponent(name)}.png`} alt="" className="h-full w-full object-contain" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
      </section>
        </>
      )}

      {/* セクション⑥：最終CTA（白背景で文字を見やすく） */}
      <section id="section-6" className="top-page-section section min-h-screen bg-white">
          <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <p className="fade-in-content font-bold text-[var(--theme-text)]" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
              あなたはどの世界の住人？
            </p>
            <p className="fade-in-content mt-5 text-[var(--theme-text)]" style={{ fontSize: 18, lineHeight: 1.7, opacity: 0.9 }}>
              今すぐ診断して、あなたの人生ランクを確かめよう
            </p>
            <Link
              href={startHref}
              className="fade-in-content mt-10 inline-block rounded-xl font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              style={{
                background: "linear-gradient(145deg, var(--theme-accent-gold), var(--brand-primary-hover))",
                padding: "18px 52px",
                fontSize: 18,
                boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
              }}
            >
              診断を受ける
            </Link>
          </div>
      </section>
    </div>
  );
}
