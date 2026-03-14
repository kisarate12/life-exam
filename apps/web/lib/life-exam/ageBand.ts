/**
 * 年齢バンド（将来の同世代順位・偏差値集計用）
 */

const BAND_WIDTH = 5;

/** 年齢プルダウン用：最小〜最大年齢 */
export const AGE_SELECT_MIN = 18;
export const AGE_SELECT_MAX = 100;

/**
 * 生年から年齢を算出し、5歳刻みバンド文字列を返す（例: 23歳 → "20-24"）
 */
export function getAgeBandFromBirthYear(birthYear: number): string {
  const age = new Date().getFullYear() - birthYear;
  const bandStart = Math.floor(age / BAND_WIDTH) * BAND_WIDTH;
  const bandEnd = bandStart + BAND_WIDTH - 1;
  return `${bandStart}-${bandEnd}`;
}

/**
 * 年齢から生年を算出（プルダウン選択用）
 */
export function getBirthYearFromAge(age: number): number {
  return new Date().getFullYear() - age;
}

/**
 * 生年から満年齢を算出
 */
export function getAgeFromBirthYear(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}
