/**
 * 基本情報フォームの選択肢（性別・都道府県・志望タイプ・大学サジェスト用）
 */

export const GENDER_OPTIONS = [
  { value: "", label: "未回答" },
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
] as const;

/** 志望タイプ（A〜E＝志望校の役割）。教科倍率で利用 */
export const ASPIRATION_TYPE_OPTIONS = [
  { value: "", label: "選択してください" },
  { value: "A", label: "A 安定型（生活の安定・再現性）" },
  { value: "B", label: "B 高収入型（収入最大化）" },
  { value: "C", label: "C 自由型（時間の自由）" },
  { value: "D", label: "D 人間関係重視型（友人・家族・恋人）" },
  { value: "E", label: "E 自己実現型（方向性・使命・成長）" },
] as const;

export const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;

/** 卒業大学サジェスト用（国公立・関関同立・産近甲龍・G-MARCH・早慶上智など） */
export const UNIVERSITY_SUGGESTIONS = [
  "北海道大学", "東北大学", "筑波大学", "千葉大学", "東京大学", "東京工業大学",
  "一橋大学", "名古屋大学", "京都大学", "大阪大学", "神戸大学", "広島大学",
  "九州大学",
  "早稲田大学", "慶應義塾大学", "上智大学",
  "明治大学", "青山学院大学", "立教大学", "中央大学", "法政大学", "学習院大学",
  "関西大学", "関西学院大学", "同志社大学", "立命館大学",
  "京都産業大学", "近畿大学", "甲南大学", "龍谷大学",
] as const;

/** 学部サジェスト用 */
export const FACULTY_SUGGESTIONS = [
  "文学部", "教育学部", "法学部", "経済学部", "商学部", "理学部", "工学部",
  "農学部", "医学部", "歯学部", "薬学部", "保健学部", "芸術学部", "スポーツ科学部",
  "国際教養学部", "情報学部", "総合政策学部",
] as const;

/** 最終学歴（必須）。大卒/大学院卒のときのみ卒業大学・学部学科を表示 */
export const EDUCATION_LEVEL_OPTIONS = [
  { value: "", label: "選択してください" },
  { value: "high_school", label: "高卒" },
  { value: "vocational", label: "専門卒" },
  { value: "junior_college", label: "短大卒" },
  { value: "university", label: "大卒" },
  { value: "graduate_school", label: "大学院卒" },
  { value: "other", label: "その他" },
] as const;

export const IS_UNIVERSITY_OR_ABOVE = ["university", "graduate_school"] as const;
