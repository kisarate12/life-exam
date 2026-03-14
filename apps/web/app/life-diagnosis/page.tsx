"use client";

import { useState } from "react";
import Nav from "../components/Nav";
import RankSelect from "../components/RankSelect";
import {
  runDiagnosis,
  type LifeStats,
  type Rank,
  type CharacterResult,
} from "@/lib/life-diagnosis";

const DEFAULT_STATS: LifeStats = {
  income: "C",
  asset: "C",
  health: "C",
  relationship: "C",
  time: "C",
};

export default function LifeDiagnosisPage() {
  const [stats, setStats] = useState<LifeStats>(DEFAULT_STATS);
  const [result, setResult] = useState<CharacterResult | null>(null);
  const [imageError, setImageError] = useState(false);

  const updateStat = <K extends keyof LifeStats>(key: K, value: Rank) => {
    setStats((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImageError(false);
    setResult(runDiagnosis(stats));
  };

  const handleReset = () => {
    setResult(null);
    setStats(DEFAULT_STATS);
    setImageError(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <section className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
            人生診断
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)] sm:text-base">
            5つのステータスを選んで、あなたのキャラクターを診断
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--elevation-card)] sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
              ステータスを選択
            </h2>
            <div className="grid gap-5 sm:grid-cols-1">
              <RankSelect
                label="収入"
                name="income"
                value={stats.income}
                onChange={(r) => updateStat("income", r)}
              />
              <RankSelect
                label="資産"
                name="asset"
                value={stats.asset}
                onChange={(r) => updateStat("asset", r)}
              />
              <RankSelect
                label="健康"
                name="health"
                value={stats.health}
                onChange={(r) => updateStat("health", r)}
              />
              <RankSelect
                label="人間関係"
                name="relationship"
                value={stats.relationship}
                onChange={(r) => updateStat("relationship", r)}
              />
              <RankSelect
                label="時間"
                name="time"
                value={stats.time}
                onChange={(r) => updateStat("time", r)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="submit"
              className="cta-button-tokens min-h-[52px] rounded-xl px-8 py-3 text-base font-semibold"
            >
              診断する
            </button>
            {result && (
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[52px] rounded-xl border-2 border-[var(--card-border)] bg-[var(--card)] px-8 py-3 text-base font-medium text-[var(--foreground)] transition hover:border-[var(--muted)] hover:bg-[var(--surface-subtle)]"
              >
                やり直す
              </button>
            )}
          </div>
        </form>

        {result && (
          <section
            className="mt-10 transition-opacity duration-300"
            aria-live="polite"
          >
            <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--elevation-panel)]">
              <div className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-3 text-center">
                <span className="text-sm font-medium text-[var(--muted)]">
                  {result.world}
                </span>
              </div>

              {/* キャラクター画像スロット（画像は public/life-diagnosis/characters/{id}.png で配置） */}
              <div className="relative flex min-h-[200px] items-center justify-center bg-[var(--surface-subtle)] p-6 sm:min-h-[260px]">
                <div className="relative h-40 w-40 overflow-hidden rounded-2xl bg-[var(--card-border)]/50 sm:h-52 sm:w-52">
                  {!imageError ? (
                    <img
                      src={result.imagePath}
                      alt={`${result.name}のイラスト`}
                      className="h-full w-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center bg-[var(--card-border)]/30 text-[var(--muted)] text-sm"
                      aria-hidden
                    >
                      画像を配置
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <h3 className="text-center text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
                  {result.name}
                </h3>
                <p className="mt-4 whitespace-pre-line leading-relaxed text-[var(--foreground)]">
                  {result.description}
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
