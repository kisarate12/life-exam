"use client";

import { useState } from "react";
import { getWorldLabelDisplay, getWorldColor } from "@/lib/life-exam/worldDisplay";
import { CHARACTER_CODE } from "@/lib/life-diagnosis";

interface CharacterInfo {
  id: string;
  world: string;
  imagePath: string;
  name: string;
  description: string;
}

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  character: CharacterInfo;
  shareUrl: string;
}

export function ShareCardModal({ open, onClose, character, shareUrl }: ShareCardModalProps) {
  const [urlCopied, setUrlCopied] = useState(false);

  if (!open) return null;

  const worldColor = getWorldColor(character.world);
  const worldLabel = getWorldLabelDisplay(character.world);
  const code = CHARACTER_CODE[character.id as keyof typeof CHARACTER_CODE];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-start p-4 pt-14"
      style={{ background: "rgba(0,0,0,0.9)" }}
      role="dialog"
      aria-modal="true"
      aria-label="シェア"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 text-2xl leading-none hover:opacity-80"
        style={{ color: "#FFD700" }}
        aria-label="閉じる"
      >
        ✕
      </button>

      {/* カード */}
      <div className="w-full max-w-sm flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
        <div
          className="font-diagnosis-card w-full overflow-hidden rounded-2xl border border-[#E8DDD0] bg-white p-6 shadow-lg"
          style={{ transform: "scale(0.95)", transformOrigin: "top center" }}
        >
          <div className="text-center rounded-xl border border-[#E8DDD0] bg-white py-2 px-3" style={{ marginBottom: 12, borderLeft: `4px solid ${worldColor}` }}>
            <span className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{worldLabel}</span>
          </div>
          <div className="flex justify-center" style={{ marginBottom: 12 }}>
            <img
              src={character.imagePath}
              alt=""
              className="object-contain"
              style={{ maxWidth: 140, maxHeight: 140, filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.15))" }}
            />
          </div>
          <div className="text-center" style={{ marginBottom: 8 }}>
            <span
              className="inline-block rounded-full px-3 py-1 font-bold tracking-[0.25em]"
              style={{ background: `${worldColor}18`, color: worldColor, fontFamily: "monospace", fontSize: "1rem" }}
            >
              {code}
            </span>
          </div>
          <div className="text-center" style={{ marginBottom: 8 }}>
            <h2 className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: "1.35rem" }}>{character.name}</h2>
          </div>
          <div className="text-center" style={{ marginBottom: 12 }}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#555]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontWeight: 400 }}>{character.description}</p>
          </div>
          <div className="border-t border-[#E8DDD0] pt-3 text-center">
            <p className="text-[#D0C8C0]" style={{ fontSize: 11 }}>#人生診断</p>
          </div>
        </div>
      </div>

      {/* 下部：コピー＆SNS */}
      <div className="mt-4 shrink-0 w-full max-w-sm text-center">
        <p className="text-sm font-bold" style={{ color: "#FFD700" }}>スクショを撮って共有しよう</p>
        <button
          type="button"
          onClick={async () => {
            if (!shareUrl) return;
            await navigator.clipboard.writeText(shareUrl);
            setUrlCopied(true);
            setTimeout(() => setUrlCopied(false), 2000);
          }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition hover:opacity-80"
          style={{ background: urlCopied ? "#43756B" : "rgba(255,255,255,0.15)", color: urlCopied ? "#fff" : "#ccc" }}
        >
          {urlCopied ? "コピーしました!" : "診断結果のURLをコピー"}
        </button>
        <div className="mt-3 flex justify-center gap-5">
          <a href="instagram://app" className="flex flex-col items-center gap-1.5 transition hover:opacity-70">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-md">
              <img src="/icons/instagram.svg" alt="" className="h-12 w-12 object-cover" />
            </span>
            <span className="text-[10px] text-[#ccc]">Instagram</span>
          </a>
          <a href="snssdk1233://app" className="flex flex-col items-center gap-1.5 transition hover:opacity-70">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-md">
              <img src="/icons/tiktok.svg" alt="" className="h-12 w-12 object-cover" />
            </span>
            <span className="text-[10px] text-[#ccc]">TikTok</span>
          </a>
        </div>
      </div>
    </div>
  );
}
