"use client";

import { useState } from "react";
import Link from "next/link";
import { CHARACTER_DEFINITIONS, CHARACTER_IMAGE_BASE } from "@/lib/life-diagnosis/characters";
import type { CharacterId } from "@/lib/life-diagnosis/types";

// 4問の設問定義
const QUESTIONS = [
  {
    key: "money",
    label: "お金",
    icon: "💰",
    question: "今の収入・資産に、ある程度満足している",
    yes: "M",
    no: "P",
    yesLabel: "はい",
    noLabel: "いいえ",
  },
  {
    key: "time",
    label: "時間",
    icon: "⏰",
    question: "自分の自由な時間が十分にある",
    yes: "T",
    no: "B",
    yesLabel: "はい",
    noLabel: "いいえ",
  },
  {
    key: "connect",
    label: "つながり",
    icon: "🤝",
    question: "信頼できる人間関係がある",
    yes: "C",
    no: "L",
    yesLabel: "はい",
    noLabel: "いいえ",
  },
  {
    key: "health",
    label: "健康",
    icon: "💪",
    question: "心身ともに健康だと感じる",
    yes: "H",
    no: "S",
    yesLabel: "はい",
    noLabel: "いいえ",
  },
] as const;

// MTCH形式コード → キャラクターID
const CODE_TO_CHARACTER: Record<string, CharacterId> = {
  MTCH: "amaterasu",
  MTCS: "kaiko",
  MTLH: "lion",
  MTLS: "king",
  MBCH: "dwarf_king",
  MBCS: "knight",
  MBLH: "tanuki",
  MBLS: "beetle",
  PTCH: "noble",
  PTCS: "turtle",
  PTLH: "tsukuyomi",
  PTLS: "snail",
  PBCH: "goblin_king",
  PBCS: "serf",
  PBLH: "hyena",
  PBLS: "mosquito",
};

const WORLD_COLOR: Record<string, { bg: string; text: string; badge: string }> = {
  "空の世界の住人": { bg: "#EBF4FF", text: "#1A5FA8", badge: "#4A90D9" },
  "海の世界の住人": { bg: "#E8F5FB", text: "#0F4F6E", badge: "#1B6B93" },
  "地上の世界の住人": { bg: "#EDF7ED", text: "#1B531B", badge: "#2D7D2D" },
  "やみのせかいの住人": { bg: "#F3EDF9", text: "#3D1A6E", badge: "#6B3FA0" },
};

const WORLD_LABEL: Record<string, string> = {
  "空の世界の住人": "空の世界",
  "海の世界の住人": "海の世界",
  "地上の世界の住人": "地上の世界",
  "やみのせかいの住人": "闇の世界",
};

export default function QuickDiagnosisPage() {
  const [step, setStep] = useState<"intro" | "quiz" | "result">("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const handleAnswer = (value: string) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);
    if (currentQ + 1 < QUESTIONS.length) {
      setCurrentQ(currentQ + 1);
    } else {
      setStep("result");
    }
  };

  const restart = () => {
    setStep("quiz");
    setCurrentQ(0);
    setAnswers([]);
  };

  if (step === "intro") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-xs font-semibold tracking-widest text-[var(--theme-text-sub)] uppercase mb-4">
            4問でわかる
          </p>
          <h1
            className="font-bold text-[var(--theme-text)] leading-tight"
            style={{ fontSize: "clamp(28px, 7vw, 38px)" }}
          >
            あなたの
            <br />
            人生タイプ診断
          </h1>
          <p className="mt-4 text-sm text-[var(--theme-text-sub)] leading-relaxed">
            YES / NO の4問に答えるだけで
            <br />
            16タイプから あなたのキャラクターがわかる
          </p>

          <div className="mt-8 flex justify-center gap-4">
            {["4問", "30秒", "無料"].map((label) => (
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

          <button
            onClick={() => setStep("quiz")}
            className="mt-8 w-full rounded-2xl py-5 text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(145deg, var(--theme-accent-gold), var(--brand-primary-hover))",
              boxShadow: "0 4px 20px rgba(245,117,80,0.3)",
            }}
          >
            診断スタート →
          </button>

          <p className="mt-6 text-xs text-[var(--theme-text-sub)]">
            より詳しく知りたい方は
            <Link href="/life-exam/new" className="underline ml-1" style={{ color: "var(--theme-accent-gold)" }}>
              25問の本診断へ
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (step === "quiz") {
    const q = QUESTIONS[currentQ];
    const progress = ((currentQ) / QUESTIONS.length) * 100;

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* プログレスバー */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--theme-accent-gold), var(--brand-primary-hover))",
            }}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {/* 問番号 */}
            <p className="text-center text-xs font-semibold text-[var(--theme-text-sub)] tracking-wider">
              第 {currentQ + 1} 問 / {QUESTIONS.length} 問
            </p>

            {/* アイコン + カテゴリ */}
            <div className="mt-4 flex flex-col items-center">
              <span className="text-5xl">{q.icon}</span>
              <span
                className="mt-2 rounded-full px-4 py-1 text-xs font-bold"
                style={{
                  background: "rgba(245,117,80,0.12)",
                  color: "var(--theme-accent-gold)",
                }}
              >
                {q.label}
              </span>
            </div>

            {/* 設問 */}
            <h2
              className="mt-6 text-center font-bold text-[var(--theme-text)] leading-snug"
              style={{ fontSize: "clamp(18px, 5vw, 22px)" }}
            >
              {q.question}
            </h2>

            {/* YES / NO ボタン */}
            <div className="mt-10 grid grid-cols-2 gap-4">
              <button
                onClick={() => handleAnswer(q.yes)}
                className="rounded-2xl border-2 py-5 text-lg font-bold transition hover:-translate-y-0.5 active:scale-95"
                style={{
                  borderColor: "#22C55E",
                  color: "#16A34A",
                  background: "rgba(34,197,94,0.06)",
                }}
              >
                ✓ {q.yesLabel}
              </button>
              <button
                onClick={() => handleAnswer(q.no)}
                className="rounded-2xl border-2 py-5 text-lg font-bold transition hover:-translate-y-0.5 active:scale-95"
                style={{
                  borderColor: "#F87171",
                  color: "#DC2626",
                  background: "rgba(248,113,113,0.06)",
                }}
              >
                ✗ {q.noLabel}
              </button>
            </div>

            {/* 4ステップドット */}
            <div className="mt-10 flex justify-center gap-2">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === currentQ ? 24 : 8,
                    height: 8,
                    background:
                      i < currentQ
                        ? "var(--theme-accent-gold)"
                        : i === currentQ
                          ? "var(--theme-accent-gold)"
                          : "#E5E7EB",
                    opacity: i === currentQ ? 1 : i < currentQ ? 0.6 : 0.4,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // result
  const code = answers.join("");
  const characterId = CODE_TO_CHARACTER[code] ?? "mosquito";
  const character = CHARACTER_DEFINITIONS[characterId];
  const worldColors = WORLD_COLOR[character.world] ?? WORLD_COLOR["やみのせかいの住人"];
  const worldLabel = WORLD_LABEL[character.world] ?? character.world;
  const imageUrl = `${CHARACTER_IMAGE_BASE}/${encodeURIComponent(character.name)}.png`;
  const quickShareUrl = typeof window !== "undefined" ? `${window.location.origin}/life-exam/quick?ref=challenge` : "https://shindan.life/life-exam/quick";
  const quickShareText = `4問診断やったら「${character.name}」(${worldLabel})でした！\nあなたは何タイプ？→ ${quickShareUrl}\n#人生診断`;
  const quickShareXUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(quickShareText)}`;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs font-semibold tracking-widest text-[var(--theme-text-sub)] uppercase">
          診断結果
        </p>

        {/* キャラクター画像 */}
        <div
          className="mt-4 mx-auto w-40 h-40 rounded-3xl overflow-hidden border-4 shadow-lg flex items-center justify-center"
          style={{
            borderColor: worldColors.badge,
            background: worldColors.bg,
          }}
        >
          <img
            src={imageUrl}
            alt={character.name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* 世界バッジ */}
        <div className="mt-4 flex justify-center">
          <span
            className="rounded-full px-5 py-1.5 text-xs font-bold text-white"
            style={{ background: worldColors.badge }}
          >
            {worldLabel}の住人
          </span>
        </div>

        {/* コード */}
        <p
          className="mt-2 text-center font-mono text-xs font-bold tracking-widest"
          style={{ color: worldColors.badge, opacity: 0.7 }}
        >
          [{code}]
        </p>

        {/* キャラクター名 */}
        <h1
          className="mt-1 text-center font-bold text-[var(--theme-text)]"
          style={{ fontSize: "clamp(24px, 7vw, 32px)" }}
        >
          {character.name}
        </h1>

        {/* 説明文 */}
        <p
          className="mt-4 text-center text-sm text-[var(--theme-text-sub)] leading-relaxed"
          style={{ whiteSpace: "pre-line" }}
        >
          {character.description}
        </p>

        {/* シェアボタン */}
        <div className="mt-6">
          <a
            href={quickShareXUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            style={{ background: "#000000" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.737l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Xでシェアする（友達に挑戦状）
          </a>
        </div>

        {/* 区切り */}
        <div className="mt-6 border-t border-gray-100 pt-6">
          <p className="text-center text-xs text-[var(--theme-text-sub)] mb-4">
            5科目・25問の本診断で、偏差値・全国順位・改善クエストまで詳しくわかります
          </p>

          {/* 本診断CTA */}
          <Link
            href="/life-exam/new"
            className="block w-full rounded-2xl py-4 text-center text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(145deg, var(--theme-accent-gold), var(--brand-primary-hover))",
              boxShadow: "0 4px 20px rgba(245,117,80,0.3)",
            }}
          >
            本診断（25問）でもっと詳しく →
          </Link>

          {/* やり直し */}
          <button
            onClick={restart}
            className="mt-3 w-full rounded-2xl border py-3 text-sm font-semibold text-[var(--theme-text-sub)] transition hover:bg-gray-50"
            style={{ borderColor: "#E5E7EB" }}
          >
            もう一度診断する
          </button>
        </div>
      </div>
    </div>
  );
}
