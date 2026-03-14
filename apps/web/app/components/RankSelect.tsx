"use client";

import type { Rank } from "@/lib/life-diagnosis";
import { RANKS } from "@/lib/life-diagnosis";

const RANK_CLASS: Record<Rank, string> = {
  S: "grade-s",
  A: "grade-a",
  B: "grade-b",
  C: "grade-c",
  D: "grade-d",
  E: "grade-e",
  F: "grade-f",
};

interface RankSelectProps {
  label: string;
  name: string;
  value: Rank | undefined;
  onChange: (rank: Rank) => void;
  "aria-label"?: string;
}

export default function RankSelect({
  label,
  name,
  value,
  onChange,
  "aria-label": ariaLabel,
}: RankSelectProps) {
  return (
    <div
      className="flex flex-col gap-2"
      role="group"
      aria-label={ariaLabel ?? label}
    >
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {RANKS.map((rank) => {
          const isSelected = value === rank;
          const colorClass = RANK_CLASS[rank];
          return (
            <button
              key={rank}
              type="button"
              name={name}
              onClick={() => onChange(rank)}
              className={`min-w-[2.25rem] rounded-lg border-2 px-3 py-2 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] ${colorClass} ${
                isSelected
                  ? "border-current bg-current/15 shadow-md"
                  : "border-[var(--card-border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--muted)] hover:bg-[var(--surface-subtle)]"
              }`}
              aria-pressed={isSelected}
              aria-label={`${label}: ${rank}`}
            >
              {rank}
            </button>
          );
        })}
      </div>
    </div>
  );
}
