/**
 * 卒業大学ごとの「学歴レベル」期待偏差値。
 * 現在の人生偏差値との差分で「学歴を超えている / 未活用」などの診断に使う。
 * キーは profileOptions.UNIVERSITY_SUGGESTIONS と同一表記。
 */
export const UNIVERSITY_EXPECTED_DEVIATION: Record<string, number> = {
  "東京大学": 65,
  "京都大学": 64,
  "東京工業大学": 63,
  "一橋大学": 63,
  "慶應義塾大学": 63,
  "早稲田大学": 62,
  "大阪大学": 62,
  "名古屋大学": 61,
  "九州大学": 61,
  "東北大学": 61,
  "北海道大学": 61,
  "神戸大学": 60,
  "筑波大学": 60,
  "千葉大学": 60,
  "広島大学": 59,
  "上智大学": 59,
  "明治大学": 58,
  "青山学院大学": 58,
  "立教大学": 58,
  "中央大学": 58,
  "法政大学": 57,
  "学習院大学": 57,
  "関西大学": 57,
  "関西学院大学": 57,
  "同志社大学": 57,
  "立命館大学": 56,
  "京都産業大学": 55,
  "近畿大学": 55,
  "甲南大学": 55,
  "龍谷大学": 54,
};

const DEFAULT_EXPECTED = 50;

/**
 * 大学名から期待偏差値（学歴レベル）を返す。
 * マップにない大学は 50（平均）を返す。
 */
export function getExpectedDeviationByUniversity(university: string | null): number | null {
  if (university == null || university.trim() === "") return null;
  const trimmed = university.trim();
  if (UNIVERSITY_EXPECTED_DEVIATION[trimmed] != null) {
    return UNIVERSITY_EXPECTED_DEVIATION[trimmed];
  }
  return DEFAULT_EXPECTED;
}
