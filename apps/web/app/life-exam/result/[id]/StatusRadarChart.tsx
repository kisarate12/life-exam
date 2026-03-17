"use client";

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import type { JudgementRank } from "@/lib/life-exam/judgement";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

/** ランクをレーダーチャート用数値に変換 */
const RANK_TO_VALUE: Record<JudgementRank, number> = {
  S: 100,
  A: 85,
  B: 70,
  C: 55,
  D: 40,
  E: 25,
  F: 10,
};

/** 軸の順序（五角形）：資産・収入・健康・人間関係・時間 */
const RADAR_ORDER = ["資産", "収入", "健康", "人間関係", "時間"] as const;

export type StatusRadarChartRow = { subjectName: string; rank: JudgementRank };

type Props = {
  rows: StatusRadarChartRow[];
};

export function StatusRadarChart({ rows }: Props) {
  const labelToValue = Object.fromEntries(rows.map((r) => [r.subjectName, RANK_TO_VALUE[r.rank]]));
  const labels = RADAR_ORDER.slice();
  const data = labels.map((label) => labelToValue[label] ?? 55);

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: "rgba(245, 117, 80, 0.15)",
        borderColor: "rgba(245, 117, 80, 1)",
        borderWidth: 2,
        pointBackgroundColor: "#F57550",
        pointRadius: 5,
      },
    ],
  };

  const options: ChartOptions<"radar"> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          display: false,
        },
        grid: {
          color: "#E8DDD0",
        },
        pointLabels: {
          font: {
            family: "var(--font-noto-sans-jp), Noto Sans JP, sans-serif",
            size: 13,
          },
          color: "#333333",
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw}`,
        },
      },
    },
  };

  return (
    <div
      className="mx-auto w-full max-w-[300px] aspect-square"
      style={{
        backgroundColor: "#FFFFFF",
        padding: 8,
        borderRadius: 8,
        border: "1px solid #E8DDD0",
      }}
    >
      <Radar data={chartData} options={options} />
    </div>
  );
}
