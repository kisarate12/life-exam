/**
 * 人生診断：世界ラベルの表示用定数
 * 結果ページ・ランキング表示で共通利用
 */

/** 内部世界キー（DB/API）→ 短縮名（world_stats のキーと一致） */
export const WORLD_SHORT: Record<string, string> = {
  "空の世界の住人": "空",
  "海の世界の住人": "海",
  "地上の世界の住人": "地上",
  "やみのせかいの住人": "闇",
};

/** 内部世界キー → 画面表示用フルラベル（漢字表記） */
export const WORLD_LABEL_DISPLAY: Record<string, string> = {
  "やみのせかいの住人": "闇の世界の住人",
};

/** 世界キー → 表示名・アイコン（「同世界（〇〇）」などで使用） */
export const WORLD_DISPLAY: Record<string, { name: string; icon: string }> = {
  "空の世界の住人": { name: "空の世界", icon: "☀️" },
  "海の世界の住人": { name: "海の世界", icon: "🌊" },
  "地上の世界の住人": { name: "地上の世界", icon: "🌿" },
  "やみのせかいの住人": { name: "闇の世界", icon: "💀" },
};

/** 世界キー → テーマカラー（シェアカード等で使用） */
export const WORLD_COLOR: Record<string, string> = {
  "空の世界の住人": "#F5A623",   // 金・太陽
  "海の世界の住人": "#3A8FBF",   // 深い海青
  "地上の世界の住人": "#5A9E6F", // 森緑
  "やみのせかいの住人": "#8B5CF6", // 闇紫
};

export function getWorldColor(worldKey: string): string {
  return WORLD_COLOR[worldKey] ?? "#706860";
}

export function getWorldLabelDisplay(worldKey: string): string {
  return WORLD_LABEL_DISPLAY[worldKey] ?? worldKey;
}

export function getWorldDisplay(worldKey: string): { name: string; icon: string } {
  return WORLD_DISPLAY[worldKey] ?? { name: worldKey, icon: "🌍" };
}

export function getWorldShort(worldKey: string): string {
  return WORLD_SHORT[worldKey] ?? "?";
}
