import { ImageResponse } from "next/og";

export const alt = "人生診断の結果";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const WORLD_CONFIG: Record<string, { label: string; bg: string; accent: string }> = {
  空: { label: "空の世界", bg: "#0f1c35", accent: "#4A90D9" },
  海: { label: "海の世界", bg: "#0a1e2e", accent: "#2B8FBF" },
  地上: { label: "地上の世界", bg: "#0f1f0f", accent: "#3A9A3A" },
  冥界: { label: "闇の世界", bg: "#180d28", accent: "#9B2CC9" },
};

async function loadJapaneseFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(4000),
      }
    ).then((r) => r.text());

    // /* japanese */ ブロックを優先
    const blocks = css.split("@font-face");
    let fontUrl: string | null = null;
    for (const block of blocks) {
      if (block.includes("japanese")) {
        const match = block.match(/src: url\(([^)]+)\)/);
        if (match?.[1]) { fontUrl = match[1]; break; }
      }
    }
    if (!fontUrl) {
      const fallback = css.match(/src: url\(([^)]+)\)/);
      fontUrl = fallback?.[1] ?? null;
    }
    if (!fontUrl) return null;

    return await fetch(fontUrl, { signal: AbortSignal.timeout(4000) }).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let characterName = "人生診断";
  let worldShort = "";
  let totalScore: number | null = null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/life_exam_ranking_entries?attempt_id=eq.${id}&select=character_name,world,total_score`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        signal: AbortSignal.timeout(4000),
      }
    );
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      characterName = data[0].character_name ?? characterName;
      worldShort = data[0].world ?? "";
      totalScore = data[0].total_score ?? null;
    }
  } catch {
    // fallback
  }

  const worldCfg = WORLD_CONFIG[worldShort] ?? {
    label: "",
    bg: "#111120",
    accent: "#F57550",
  };

  const fontData = await loadJapaneseFont();

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: `linear-gradient(145deg, ${worldCfg.bg} 0%, #080810 100%)`,
            padding: "52px 72px",
            fontFamily: fontData ? "'Noto Sans JP', sans-serif" : "sans-serif",
            position: "relative",
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              background: worldCfg.accent,
            }}
          />

          {/* Decorative circle */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              right: -120,
              top: -120,
              width: 480,
              height: 480,
              borderRadius: "50%",
              background: `${worldCfg.accent}18`,
            }}
          />

          {/* Service name */}
          <div style={{ display: "flex", marginBottom: 40 }}>
            <span
              style={{
                fontSize: 20,
                color: worldCfg.accent,
                fontWeight: 700,
              }}
            >
              人生診断
            </span>
          </div>

          {/* Main content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
            }}
          >
            {worldShort !== "" && (
              <div style={{ display: "flex", marginBottom: 24 }}>
                <span
                  style={{
                    fontSize: 20,
                    color: "rgba(255,255,255,0.65)",
                    border: `1px solid ${worldCfg.accent}99`,
                    padding: "5px 18px",
                    borderRadius: 4,
                  }}
                >
                  {worldCfg.label}の住人
                </span>
              </div>
            )}

            <div style={{ display: "flex" }}>
              <span
                style={{
                  fontSize: characterName.length > 6 ? 72 : 88,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  lineHeight: 1.1,
                }}
              >
                {characterName}
              </span>
            </div>

            {totalScore != null && (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <span style={{ fontSize: 20, color: "rgba(255,255,255,0.45)" }}>
                  総合スコア
                </span>
                <span
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    color: worldCfg.accent,
                  }}
                >
                  {totalScore}
                </span>
                <span style={{ fontSize: 20, color: "rgba(255,255,255,0.45)" }}>
                  点
                </span>
              </div>
            )}
          </div>

          {/* Bottom */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <span style={{ fontSize: 17, color: "rgba(255,255,255,0.35)" }}>
              あなたの人生を、相対評価する。
            </span>
            <span
              style={{
                fontSize: 17,
                color: worldCfg.accent,
                fontWeight: 700,
              }}
            >
              #人生診断
            </span>
          </div>
        </div>
      ),
      {
        ...size,
        ...(fontData
          ? {
              fonts: [
                {
                  name: "Noto Sans JP",
                  data: fontData,
                  weight: 700,
                  style: "normal",
                },
              ],
            }
          : {}),
      }
    );
  } catch {
    // 最終フォールバック：シンプルな画像
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#111120",
          }}
        >
          <span style={{ fontSize: 48, color: "#F57550", fontWeight: 700 }}>
            人生診断
          </span>
        </div>
      ),
      size
    );
  }
}
