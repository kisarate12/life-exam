import { notFound } from "next/navigation";
import { CHARACTER_DEFINITIONS } from "@/lib/life-diagnosis/characters";
import type { CharacterId } from "@/lib/life-diagnosis/types";

const CHARACTER_KEYWORD: Record<string, string> = {
  amaterasu: "完全自由",
  icarus: "頂点直前",
  king: "孤高の王",
  egyptian_cat: "謎の実力者",
  kaiko: "豊かな孤独",
  tsukuyomi: "時間持ち",
  noble: "文化的生活",
  namakemono: "ユルフワ人生",
  snail: "最低限生活",
  dwarf_king: "激務充実",
  knight: "休日ゼロ",
  tanuki: "要領主義",
  beetle: "仕事一筋",
  goblin_king: "心の富豪",
  wanderer: "身軽人生",
  hyena: "じり貧",
  mosquito: "崖っぷち",
};

const WORLD_COLOR: Record<string, string> = {
  "空の世界の住人": "#4A90D9",
  "海の世界の住人": "#1B6B93",
  "地上の世界の住人": "#2D7D2D",
  "やみのせかいの住人": "#6B3FA0",
};

const WORLD_NAME: Record<string, string> = {
  "空の世界の住人": "空の世界",
  "海の世界の住人": "海の世界",
  "地上の世界の住人": "地上の世界",
  "やみのせかいの住人": "闇の世界",
};

export default async function OgpGenPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const { characterId } = await params;
  const def = CHARACTER_DEFINITIONS[characterId as CharacterId];
  if (!def) notFound();

  const color = WORLD_COLOR[def.world] ?? "#F57550";
  const worldName = WORLD_NAME[def.world] ?? def.world;
  const imageSrc = `/life-diagnosis/characters/${encodeURIComponent(def.name)}.png`;
  const keyword = CHARACTER_KEYWORD[characterId] ?? "";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; }
      `}</style>
      <div
        id="ogp-card"
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "#FFFFFF",
          fontFamily: "var(--font-noto-serif-jp), 'Noto Serif JP', serif",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* 左カラム：キャラクター画像エリア */}
        <div
          style={{
            width: 380,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${color}12`,
            padding: "40px 28px",
            position: "relative",
          }}
        >
          {/* 左端アクセントバー */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 6,
              height: "100%",
              background: color,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={def.name}
            style={{
              maxWidth: 300,
              maxHeight: 520,
              objectFit: "contain",
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.18))",
            }}
          />
        </div>

        {/* 右カラム：テキストエリア */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "52px 56px 44px 52px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* 背景キーワード */}
          {keyword && (
            <div
              style={{
                position: "absolute",
                bottom: 90,
                right: -10,
                fontSize: keyword.length <= 4 ? 200 : keyword.length <= 5 ? 160 : keyword.length <= 6 ? 120 : 90,
                fontWeight: 900,
                color,
                opacity: 0.07,
                lineHeight: 1,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                userSelect: "none",
                letterSpacing: "-0.02em",
              }}
            >
              {keyword}
            </div>
          )}
          {/* 世界バッジ */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: `${color}18`,
              border: `1.5px solid ${color}55`,
              borderRadius: 6,
              padding: "5px 16px",
              marginBottom: 22,
              width: "fit-content",
            }}
          >
            <span style={{ fontSize: 15, color, fontWeight: 700 }}>
              {worldName}の住人
            </span>
          </div>

          {/* キャラクター名 */}
          <h1
            style={{
              fontSize: def.name.length > 6 ? 58 : 68,
              fontWeight: 700,
              color: "#1A1A2E",
              lineHeight: 1.15,
              margin: "0 0 24px 0",
              letterSpacing: "0.02em",
            }}
          >
            {def.name}
          </h1>

          {/* 説明文（最大4行） */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <p
              style={{
                fontSize: 19,
                color: "#555566",
                lineHeight: 1.8,
                margin: 0,
                whiteSpace: "pre-line",
                wordBreak: "break-all",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {def.description}
            </p>
          </div>

          {/* フッター */}
          <div style={{ marginTop: 20 }}>
            {/* キャッチコピー（区切り線より上） */}
            <span style={{ fontSize: 16, color, fontWeight: 800, display: "block", marginBottom: 12 }}>
              あなたもやってみる →
            </span>
            {/* 区切り線 + サイト情報 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: `1px solid #E8DDD0`,
                paddingTop: 12,
              }}
            >
              <span style={{ fontSize: 14, color: "#9A9290" }}>
                人生診断 — あなたの人生を、相対評価する。
              </span>
              <span style={{ fontSize: 15, color, fontWeight: 700 }}>
                #人生診断
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
