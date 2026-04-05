"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Radar } from "react-chartjs-2";
import { supabase } from "@/lib/supabase";
import Nav from "../../components/Nav";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  RadialLinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler,
);

interface CharacterStat {
  character_name: string;
  world: string;
  count: number;
  financial_avg: number;
  human_avg: number;
  social_avg: number;
  time_avg: number;
  health_avg: number;
}

interface StatsData {
  total: number;
  characters: CharacterStat[];
  worlds: { world: string; count: number }[];
  age_bands: { age_band: string; count: number }[];
}

const WORLD_COLORS: Record<string, string> = { 空: "#F5A623", 地上: "#5A9E6F", 海: "#3A8FBF", 闇: "#8B5CF6" };
const WORLD_ORDER = ["空", "地上", "海", "闇"];
const AGE_ORDER = ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64"];

const RADAR_COLORS = [
  { bg: "rgba(245,166,35,0.2)", border: "#F5A623" },
  { bg: "rgba(245,117,80,0.2)", border: "#F57550" },
  { bg: "rgba(58,143,191,0.2)", border: "#3A8FBF" },
  { bg: "rgba(139,92,246,0.2)", border: "#8B5CF6" },
];

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("life_exam_get_public_stats");
      if (error || !data) { setLoading(false); return; }
      const d = data as StatsData;
      d.characters = (d.characters || []).map((c) => ({
        ...c,
        count: Number(c.count),
        financial_avg: Number(c.financial_avg),
        human_avg: Number(c.human_avg),
        social_avg: Number(c.social_avg),
        time_avg: Number(c.time_avg),
        health_avg: Number(c.health_avg),
      }));
      d.worlds = (d.worlds || []).map((w) => ({ ...w, count: Number(w.count) }));
      d.age_bands = (d.age_bands || []).map((a) => ({ ...a, count: Number(a.count) }));
      d.total = Number(d.total);
      setStats(d);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen relative z-10">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full border-4 border-[#F0EBE3] border-t-[#F57550]" style={{ animation: "spin 0.8s linear infinite" }} />
            <p className="text-sm text-[#9A9290]">データを読み込んでいます...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>
    );
  }

  if (!stats || !stats.characters.length) {
    return (
      <div className="min-h-screen relative z-10">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="text-[#9A9290]">データがまだありません</p>
        </main>
      </div>
    );
  }

  const { total, characters, worlds, age_bands } = stats;

  // 世界別集計
  const worldMap = Object.fromEntries(worlds.map((w) => [w.world, w.count]));
  const worldLabels = WORLD_ORDER.filter((w) => worldMap[w]);

  // 年代
  const ageMap = Object.fromEntries(age_bands.map((a) => [a.age_band, a.count]));
  const ageLabels = AGE_ORDER.filter((a) => ageMap[a]);

  // 世界別レーダー（加重平均）
  const worldRadarDS = worldLabels.map((w, i) => {
    const chars = characters.filter((c) => c.world === w);
    const wTotal = chars.reduce((s, c) => s + c.count, 0);
    const wavg = (k: keyof CharacterStat) =>
      Math.round((chars.reduce((s, c) => s + Number(c[k]) * c.count, 0) / wTotal) * 10) / 10;
    return {
      label: w + "の世界",
      data: [wavg("financial_avg"), wavg("human_avg"), wavg("social_avg"), wavg("time_avg"), wavg("health_avg")],
      backgroundColor: RADAR_COLORS[i].bg,
      borderColor: WORLD_COLORS[w],
      borderWidth: 2,
    };
  });

  // 上位4キャラレーダー
  const topChars = characters.slice(0, 4);
  const topRadarDS = topChars.map((c, i) => ({
    label: c.character_name,
    data: [c.financial_avg, c.human_avg, c.social_avg, c.time_avg, c.health_avg],
    backgroundColor: RADAR_COLORS[i].bg,
    borderColor: RADAR_COLORS[i].border,
    borderWidth: 2,
  }));

  // 最多世界
  const topWorld = worldLabels.reduce((a, b) => ((worldMap[a] || 0) >= (worldMap[b] || 0) ? a : b), worldLabels[0]);
  const topWorldPct = Math.round(((worldMap[topWorld] || 0) / total) * 100);

  return (
    <div className="min-h-screen relative z-10">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-20">
        <h1 className="mb-1 text-center text-xl font-bold text-[#333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
          受験者データ
        </h1>
        <p className="mb-6 text-center text-xs text-[#9A9290]">
          {total.toLocaleString()}名の診断結果
        </p>

        {/* サマリー */}
        <section className="card-rpg mb-5 p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[#f5f0eb] p-3 text-center">
              <p className="text-2xl font-extrabold text-[#F57550]">{total.toLocaleString()}</p>
              <p className="text-[10px] text-[#9A9290]">受験者数</p>
            </div>
            <div className="rounded-xl bg-[#f5f0eb] p-3 text-center">
              <p className="text-2xl font-extrabold text-[#F57550]">{characters.length}</p>
              <p className="text-[10px] text-[#9A9290]">キャラ種類</p>
            </div>
            <div className="rounded-xl bg-[#f5f0eb] p-3 text-center">
              <p className="text-2xl font-extrabold text-[#F57550]">{characters[0].character_name}</p>
              <p className="text-[10px] text-[#9A9290]">最多キャラ</p>
            </div>
            <div className="rounded-xl bg-[#f5f0eb] p-3 text-center">
              <p className="text-2xl font-extrabold text-[#F57550]">{topWorldPct}%</p>
              <p className="text-[10px] text-[#9A9290]">{topWorld}の世界</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[#f0e6d0] bg-[#fffbf0] p-3 text-xs leading-relaxed text-[#665]">
            最も多いキャラクターは<strong className="text-[#F57550]">{characters[0].character_name}</strong>（{characters[0].count.toLocaleString()}名 / {Math.round((characters[0].count / total) * 100)}%）。
            {topWorld}の世界が全体の<strong className="text-[#F57550]">{topWorldPct}%</strong>を占めています。
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* キャラクター分布 */}
          <section className="card-rpg p-5">
            <h2 className="mb-3 text-sm font-bold text-[#555]" style={{ borderLeft: "4px solid #F57550", paddingLeft: 10 }}>
              キャラクター分布
            </h2>
            <Bar
              data={{
                labels: characters.map((c) => c.character_name),
                datasets: [{
                  data: characters.map((c) => c.count),
                  backgroundColor: characters.map((c) => WORLD_COLORS[c.world] || "#ccc"),
                  borderRadius: 6,
                }],
              }}
              options={{ indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }}
            />
          </section>

          {/* 世界分布 */}
          <section className="card-rpg p-5">
            <h2 className="mb-3 text-sm font-bold text-[#555]" style={{ borderLeft: "4px solid #F57550", paddingLeft: 10 }}>
              世界分布
            </h2>
            <Doughnut
              data={{
                labels: worldLabels.map((w) => `${w}の世界 (${Math.round(((worldMap[w] || 0) / total) * 100)}%)`),
                datasets: [{ data: worldLabels.map((w) => worldMap[w] || 0), backgroundColor: worldLabels.map((w) => WORLD_COLORS[w]) }],
              }}
              options={{ plugins: { legend: { position: "bottom" } } }}
            />
          </section>

          {/* 年代分布 */}
          <section className="card-rpg p-5">
            <h2 className="mb-3 text-sm font-bold text-[#555]" style={{ borderLeft: "4px solid #F57550", paddingLeft: 10 }}>
              年代分布
            </h2>
            <Bar
              data={{
                labels: ageLabels.map((l) => l.replace(/(\d+)-(\d+)/, "$1〜$2歳")),
                datasets: [{ data: ageLabels.map((l) => ageMap[l] || 0), backgroundColor: "#3A8FBF", borderRadius: 6 }],
              }}
              options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
            />
          </section>

          {/* 世界別レーダー */}
          <section className="card-rpg p-5">
            <h2 className="mb-3 text-sm font-bold text-[#555]" style={{ borderLeft: "4px solid #F57550", paddingLeft: 10 }}>
              世界別 5科目平均
            </h2>
            <Radar
              data={{ labels: ["資産", "収入", "社会", "時間", "健康"], datasets: worldRadarDS }}
              options={{
                scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } },
                plugins: { legend: { position: "bottom", labels: { font: { size: 10 } } } },
              }}
            />
          </section>

          {/* 上位キャラレーダー */}
          <section className="card-rpg p-5 sm:col-span-2">
            <h2 className="mb-3 text-sm font-bold text-[#555]" style={{ borderLeft: "4px solid #F57550", paddingLeft: 10 }}>
              上位キャラ 5科目平均
            </h2>
            <div className="mx-auto" style={{ maxWidth: 480 }}>
              <Radar
                data={{ labels: ["資産", "収入", "社会", "時間", "健康"], datasets: topRadarDS }}
                options={{
                  scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } },
                  plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
                }}
              />
            </div>
          </section>

          {/* 全キャラ一覧 */}
          <section className="card-rpg p-5 sm:col-span-2">
            <h2 className="mb-3 text-sm font-bold text-[#555]" style={{ borderLeft: "4px solid #F57550", paddingLeft: 10 }}>
              全キャラクター一覧
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-[#E8DDD0]">
                    <th className="bg-[#f5f0eb] px-2 py-2 text-left font-semibold text-[#666]">キャラクター</th>
                    <th className="bg-[#f5f0eb] px-2 py-2 text-left font-semibold text-[#666]">世界</th>
                    <th className="bg-[#f5f0eb] px-2 py-2 text-right font-semibold text-[#666]">人数</th>
                    <th className="bg-[#f5f0eb] px-2 py-2 text-right font-semibold text-[#666]">割合</th>
                    <th className="bg-[#f5f0eb] px-2 py-2 text-right font-semibold text-[#666]">資産</th>
                    <th className="bg-[#f5f0eb] px-2 py-2 text-right font-semibold text-[#666]">収入</th>
                    <th className="bg-[#f5f0eb] px-2 py-2 text-right font-semibold text-[#666]">社会</th>
                    <th className="bg-[#f5f0eb] px-2 py-2 text-right font-semibold text-[#666]">時間</th>
                    <th className="bg-[#f5f0eb] px-2 py-2 text-right font-semibold text-[#666]">健康</th>
                  </tr>
                </thead>
                <tbody>
                  {characters.map((c) => (
                    <tr key={c.character_name} className="border-b border-[#f0ebe3] hover:bg-[#faf8f5]">
                      <td className="px-2 py-2 font-medium">{c.character_name}</td>
                      <td className="px-2 py-2">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ background: WORLD_COLORS[c.world] || "#ccc" }}
                        >
                          {c.world}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{c.count.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{((c.count / total) * 100).toFixed(1)}%</td>
                      <td className="px-2 py-2 text-right tabular-nums">{c.financial_avg}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{c.human_avg}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{c.social_avg}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{c.time_avg}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{c.health_avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
