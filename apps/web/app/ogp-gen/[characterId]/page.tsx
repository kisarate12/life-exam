import { notFound } from "next/navigation";
import { CHARACTER_DEFINITIONS } from "@/lib/life-diagnosis/characters";
import type { CharacterId } from "@/lib/life-diagnosis/types";

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
  // 最初の文末（。）までを説明文として使用
  const shortDesc = def.description.split("\n")[0] ?? def.description;

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
          }}
        >
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

          {/* 説明文 */}
          <p
            style={{
              fontSize: 19,
              color: "#555566",
              lineHeight: 1.8,
              margin: 0,
              flex: 1,
              whiteSpace: "pre-line",
            }}
          >
            {shortDesc}
          </p>

          {/* フッター */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: `1px solid #E8DDD0`,
              paddingTop: 18,
              marginTop: 20,
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
    </>
  );
}
