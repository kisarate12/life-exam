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

// ── ポイント → ラベル変換 ──
function assetLabel(pts: number): string {
  if (pts >= 100) return "1億円以上";
  if (pts >= 90) return "5000万〜9999万円";
  if (pts >= 80) return "3000万〜4999万円";
  if (pts >= 70) return "2000万〜2999万円";
  if (pts >= 60) return "1000万〜1999万円";
  if (pts >= 45) return "500万〜999万円";
  if (pts >= 30) return "100万〜499万円";
  if (pts >= 15) return "0〜99万円";
  return "0円未満";
}
function incomeLabel(pts: number): string {
  if (pts >= 100) return "3000万円以上";
  if (pts >= 90) return "2000〜2999万円";
  if (pts >= 80) return "1500〜1999万円";
  if (pts >= 68) return "1000〜1499万円";
  if (pts >= 58) return "800〜999万円";
  if (pts >= 52) return "700〜799万円";
  if (pts >= 46) return "600〜699万円";
  if (pts >= 38) return "500〜599万円";
  if (pts >= 30) return "400〜499万円";
  if (pts >= 20) return "300〜399万円";
  if (pts >= 10) return "200〜299万円";
  if (pts >= 4) return "200万円未満";
  return "無収入";
}

interface StatsRow {
  character_name: string;
  world: string;
  asset: string;
  income: string;
  age_band: string | null;
  financial_score: number;
  human_score: number;
  social_score: number;
  time_score: number;
  health_score: number;
}

const WORLD_COLORS: Record<string, string> = { 空: "#F5A623", 地上: "#5A9E6F", 海: "#3A8FBF", 闇: "#8B5CF6" };
const INCOME_ORDER = [
  "無収入", "200万円未満", "200〜299万円", "300〜399万円", "400〜499万円",
  "500〜599万円", "600〜699万円", "700〜799万円", "800〜999万円",
  "1000〜1499万円", "1500〜1999万円", "2000〜2999万円", "3000万円以上",
];
const ASSET_ORDER = [
  "0円未満", "0〜99万円", "100万〜499万円", "500万〜999万円",
  "1000万〜1999万円", "2000万〜2999万円", "3000万〜4999万円",
  "5000万〜9999万円", "1億円以上",
];

function countBy(arr: StatsRow[], key: keyof StatsRow): Record<string, number> {
  const m: Record<string, number> = {};
  arr.forEach((d) => {
    const v = String(d[key]);
    m[v] = (m[v] || 0) + 1;
  });
  return m;
}

export default function StatsPage() {
  const [rows, setRows] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("life_exam_get_public_stats");
      if (error || !data) { setLoading(false); return; }
      const raw = data as Array<{
        character_name: string; world: string; age_band: string | null;
        asset_points: number | null; income_points: number | null;
        financial_score: number; human_score: number; social_score: number;
        time_score: number; health_score: number;
      }>;
      setRows(
        raw.map((r) => ({
          character_name: r.character_name,
          world: r.world,
          asset: assetLabel(r.asset_points ?? 0),
          income: incomeLabel(r.income_points ?? 0),
          age_band: r.age_band,
          financial_score: Number(r.financial_score),
          human_score: Number(r.human_score),
          social_score: Number(r.social_score),
          time_score: Number(r.time_score),
          health_score: Number(r.health_score),
        }))
      );
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

  if (!rows.length) {
    return (
      <div className="min-h-screen relative z-10">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="text-[#9A9290]">データがまだありません</p>
        </main>
      </div>
    );
  }

  // ── 集計 ──
  const charCount = countBy(rows, "character_name");
  const charLabels = Object.keys(charCount).sort((a, b) => charCount[b] - charCount[a]);
  const worldCount = countBy(rows, "world");
  const worldLabels = ["空", "地上", "海", "闇"].filter((w) => worldCount[w]);
  const incomeCount = countBy(rows, "income");
  const incomeLabels = INCOME_ORDER.filter((l) => incomeCount[l]);
  const assetCount = countBy(rows, "asset");
  const assetLabelsFiltered = ASSET_ORDER.filter((l) => assetCount[l]);
  const ageCount = countBy(rows, "age_band");
  const ageOrder = ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64"];
  const ageLabels = ageOrder.filter((l) => ageCount[l]);

  // レーダー用（上位4キャラ）
  const topChars = charLabels.slice(0, 4);
  const radarColors = [
    { bg: "rgba(245,166,35,0.2)", border: "#F5A623" },
    { bg: "rgba(245,117,80,0.2)", border: "#F57550" },
    { bg: "rgba(58,143,191,0.2)", border: "#3A8FBF" },
    { bg: "rgba(139,92,246,0.2)", border: "#8B5CF6" },
  ];
  const radarDatasets = topChars.map((ch, i) => {
    const r = rows.filter((d) => d.character_name === ch);
    const avg = (k: keyof StatsRow) => Math.round((r.reduce((s, d) => s + Number(d[k]), 0) / r.length) * 10) / 10;
    return {
      label: ch,
      data: [avg("financial_score"), avg("human_score"), avg("social_score"), avg("time_score"), avg("health_score")],
      backgroundColor: radarColors[i].bg,
      borderColor: radarColors[i].border,
      borderWidth: 2,
    };
  });

  // 年収の最頻値
  const topIncome = incomeLabels.reduce((a, b) => ((incomeCount[a] || 0) >= (incomeCount[b] || 0) ? a : b), incomeLabels[0]);
  const topAsset = assetLabelsFiltered.reduce((a, b) => ((assetCount[a] || 0) >= (assetCount[b] || 0) ? a : b), assetLabelsFiltered[0]);
  const skyCount = rows.filter((r) => r.world === "空").length;
  const skyPct = Math.round((skyCount / rows.length) * 100);

  return (
    <div className="min-h-screen relative z-10">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-20">
        <h1 className="mb-1 text-center text-xl font-bold text-[#333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
          受験者データ
        </h1>
        <p className="mb-6 text-center text-xs text-[#9A9290]">
          受験者 {rows.length}名のリアルデータ
        </p>

        {/* サマリー */}
        <section className="card-rpg mb-5 p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[#f5f0eb] p-3 text-center">
              <p className="text-2xl font-extrabold text-[#F57550]">{rows.length}</p>
              <p className="text-[10px] text-[#9A9290]">受験者数</p>
            </div>
            <div className="rounded-xl bg-[#f5f0eb] p-3 text-center">
              <p className="text-2xl font-extrabold text-[#F57550]">{charLabels.length}</p>
              <p className="text-[10px] text-[#9A9290]">キャラ種類</p>
            </div>
            <div className="rounded-xl bg-[#f5f0eb] p-3 text-center">
              <p className="text-lg font-extrabold text-[#F57550]">{topIncome}</p>
              <p className="text-[10px] text-[#9A9290]">年収 最頻値</p>
            </div>
            <div className="rounded-xl bg-[#f5f0eb] p-3 text-center">
              <p className="text-lg font-extrabold text-[#F57550]">{topAsset}</p>
              <p className="text-[10px] text-[#9A9290]">資産 最頻値</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[#f0e6d0] bg-[#fffbf0] p-3 text-xs leading-relaxed text-[#665]">
            受験者の<strong className="text-[#F57550]">{skyPct}%</strong>が空の世界の住人。
            年収は{topIncome}帯、資産は{topAsset}帯に集中しています。
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
                labels: charLabels,
                datasets: [{ data: charLabels.map((l) => charCount[l]), backgroundColor: charLabels.map((l) => { const r = rows.find((d) => d.character_name === l); return r ? (WORLD_COLORS[r.world] || "#ccc") : "#ccc"; }), borderRadius: 6 }],
              }}
              options={{ indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }}
            />
          </section>

          {/* 世界分布 */}
          <section className="card-rpg p-5">
            <h2 className="mb-3 text-sm font-bold text-[#555]" style={{ borderLeft: "4px solid #F57550", paddingLeft: 10 }}>
              世界分布
            </h2>
            <Doughnut
              data={{
                labels: worldLabels.map((w) => w + "の世界"),
                datasets: [{ data: worldLabels.map((w) => worldCount[w]), backgroundColor: worldLabels.map((w) => WORLD_COLORS[w]) }],
              }}
              options={{ plugins: { legend: { position: "bottom" } } }}
            />
          </section>

          {/* 年収分布 */}
          <section className="card-rpg p-5">
            <h2 className="mb-3 text-sm font-bold text-[#555]" style={{ borderLeft: "4px solid #F57550", paddingLeft: 10 }}>
              年収分布
            </h2>
            <Bar
              data={{
                labels: incomeLabels,
                datasets: [{ data: incomeLabels.map((l) => incomeCount[l] || 0), backgroundColor: "#F57550", borderRadius: 6 }],
              }}
              options={{ plugins: { legend: { display: false } }, scales: { x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } }, y: { beginAtZero: true, ticks: { stepSize: 2 } } } }}
            />
          </section>

          {/* 資産分布 */}
          <section className="card-rpg p-5">
            <h2 className="mb-3 text-sm font-bold text-[#555]" style={{ borderLeft: "4px solid #F57550", paddingLeft: 10 }}>
              資産分布
            </h2>
            <Bar
              data={{
                labels: assetLabelsFiltered,
                datasets: [{ data: assetLabelsFiltered.map((l) => assetCount[l] || 0), backgroundColor: "#FFB84E", borderRadius: 6 }],
              }}
              options={{ plugins: { legend: { display: false } }, scales: { x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } }, y: { beginAtZero: true, ticks: { stepSize: 2 } } } }}
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
                datasets: [{ data: ageLabels.map((l) => ageCount[l] || 0), backgroundColor: "#3A8FBF", borderRadius: 6 }],
              }}
              options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 2 } } } }}
            />
          </section>

          {/* レーダー */}
          <section className="card-rpg p-5">
            <h2 className="mb-3 text-sm font-bold text-[#555]" style={{ borderLeft: "4px solid #F57550", paddingLeft: 10 }}>
              キャラ別 5科目平均
            </h2>
            <Radar
              data={{
                labels: ["資産", "収入", "社会", "時間", "健康"],
                datasets: radarDatasets,
              }}
              options={{
                scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } },
                plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
              }}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
