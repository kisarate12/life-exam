/**
 * 人生診断 Ver2: 5科目別設問・選択肢と点数
 * subject_id: 1=金融, 2=人的, 3=社会, 4=時間, 5=健康
 */

import type { SubjectCode } from "./types";

export type { SubjectCode };
export interface QuestionOption {
  label: string;
  points: number;
}

export interface QuestionDef {
  label: string;
  options: QuestionOption[];
}

/** subject_id → 科目コード */
export const SUBJECT_ID_TO_CODE: Record<number, SubjectCode> = {
  1: "financial",
  2: "human",
  3: "social",
  4: "time",
  5: "psychological",
};

/** 科目ごとの設問定義（sort_order 1-based で対応） */
export const EXAM_V2_QUESTIONS: Record<SubjectCode, QuestionDef[]> = {
  financial: [
    {
      label: "現在の保有資産はいくらですか？（金融資産・不動産などすべての資産の合計）",
      options: [
        { label: "1億円以上", points: 100 },
        { label: "5000万〜9999万円", points: 90 },
        { label: "3000万〜4999万円", points: 80 },
        { label: "2000万〜2999万円", points: 70 },
        { label: "1000万〜1999万円", points: 60 },
        { label: "500万〜999万円", points: 45 },
        { label: "100万〜499万円", points: 30 },
        { label: "0〜99万円", points: 15 },
        { label: "0円未満", points: 0 },
      ],
    },
    {
      label: "現在の借金はいくらですか？（住宅ローン・カードローン等含む）",
      options: [
        { label: "0円", points: 40 },
        { label: "1〜299万円", points: 32 },
        { label: "300〜999万円", points: 22 },
        { label: "1000〜2999万円", points: 10 },
        { label: "3000万円以上", points: 0 },
      ],
    },
    {
      label: "あなたの金融資産のうちすぐ現金化できる割合はどの程度ですか？",
      options: [
        { label: "90%以上", points: 30 },
        { label: "70〜89%", points: 24 },
        { label: "50〜69%", points: 18 },
        { label: "30〜49%", points: 8 },
        { label: "30%未満", points: 0 },
      ],
    },
    {
      label: "収入がゼロになった場合、現在の資産で何ヶ月生活できますか？",
      options: [
        { label: "5年以上（60ヶ月以上）", points: 30 },
        { label: "2〜5年（24〜59ヶ月）", points: 24 },
        { label: "1〜2年（12〜23ヶ月）", points: 16 },
        { label: "6〜11ヶ月", points: 8 },
        { label: "3〜5ヶ月", points: 3 },
        { label: "3ヶ月未満", points: 0 },
      ],
    },
  ],
  human: [
    {
      label: "あなたの現在の個人年収はいくらですか？",
      options: [
        { label: "3000万円以上", points: 100 },
        { label: "2000〜2999万円", points: 90 },
        { label: "1500〜1999万円", points: 80 },
        { label: "1000〜1499万円", points: 68 },
        { label: "800〜999万円", points: 58 },
        { label: "700〜799万円", points: 52 },
        { label: "600〜699万円", points: 46 },
        { label: "500〜599万円", points: 38 },
        { label: "400〜499万円", points: 30 },
        { label: "300〜399万円", points: 20 },
        { label: "200〜299万円", points: 10 },
        { label: "200万円未満", points: 4 },
        { label: "無収入", points: 0 },
      ],
    },
    {
      label: "今後5年で年収が大きく伸びる可能性はどの程度ありますか？",
      options: [
        { label: "ほぼ確実に大幅増", points: 30 },
        { label: "高い確率で増加", points: 22 },
        { label: "緩やかに増加", points: 14 },
        { label: "横ばい", points: 7 },
        { label: "減少可能性あり", points: 0 },
      ],
    },
    {
      label: "あなたのスキルの希少性はどの程度ですか？",
      options: [
        { label: "極めて希少（国内でも少数）", points: 30 },
        { label: "高度専門職レベル", points: 22 },
        { label: "専門職レベル", points: 15 },
        { label: "汎用職レベル", points: 7 },
        { label: "代替可能性が高い", points: 0 },
      ],
    },
    {
      label: "収入源はいくつありますか？",
      options: [
        { label: "3つ以上", points: 20 },
        { label: "2つ", points: 14 },
        { label: "1つのみ", points: 7 },
        { label: "なし", points: 0 },
      ],
    },
    {
      label: "収入を自分の裁量で増減できますか？",
      options: [
        { label: "自由に増減できる（価格決定権あり）", points: 20 },
        { label: "副業などで増やせる", points: 15 },
        { label: "残業などで増やせる", points: 10 },
        { label: "会社依存", points: 5 },
        { label: "ほぼ不可能", points: 0 },
      ],
    },
  ],
  social: [
    // ── 恋愛（50pt）──
    {
      label: "【恋愛Q1】現在の恋愛・パートナー関係の状況は？",
      options: [
        { label: "長期的に安定している", points: 20 },
        { label: "交際中（安定傾向）", points: 16 },
        { label: "交際中（不安定）", points: 8 },
        { label: "独身だが積極的に求めている", points: 6 },
        { label: "独身で当面望まない", points: 4 },
      ],
    },
    {
      label: "【恋愛Q2】最も親密な関係で、本音や弱みを見せられますか？（対象：パートナー・最も近い異性）",
      options: [
        { label: "完全に見せられる", points: 15 },
        { label: "ある程度見せられる", points: 10 },
        { label: "あまり見せられない", points: 5 },
        { label: "見せられない", points: 0 },
      ],
    },
    {
      label: "【恋愛Q3】恋愛・パートナーシップに関する孤独感や不満を感じますか？",
      options: [
        { label: "ほぼ感じない", points: 15 },
        { label: "時々ある", points: 8 },
        { label: "頻繁にある", points: 0 },
      ],
    },
    // ── 友人（50pt）──
    {
      label: "【友人Q1】何でも本音で相談できる友人は何人いますか？",
      options: [
        { label: "3人以上", points: 20 },
        { label: "2人", points: 15 },
        { label: "1人", points: 8 },
        { label: "0人", points: 0 },
      ],
    },
    {
      label: "【友人Q2】緊急時に無条件で助けてくれる友人はいますか？",
      options: [
        { label: "複数いる", points: 15 },
        { label: "1人いる", points: 8 },
        { label: "いない", points: 0 },
      ],
    },
    {
      label: "【友人Q3】友人との関係の深さ・頻度はどうですか？",
      options: [
        { label: "定期的に深く交流している", points: 15 },
        { label: "時々深く交流している", points: 10 },
        { label: "浅い交流のみ", points: 5 },
        { label: "ほぼ交流なし", points: 0 },
      ],
    },
    // ── 家族（50pt）──
    {
      label: "【家族Q1】家族（親・兄弟・配偶者・子など）との関係は？",
      options: [
        { label: "非常に良好", points: 20 },
        { label: "概ね良好", points: 15 },
        { label: "普通", points: 8 },
        { label: "疎遠・不安定", points: 0 },
      ],
    },
    {
      label: "【家族Q2】困ったとき、家族に本音で頼れますか？",
      options: [
        { label: "迷わず頼れる", points: 15 },
        { label: "ある程度頼れる", points: 10 },
        { label: "あまり頼れない", points: 5 },
        { label: "頼れない", points: 0 },
      ],
    },
    {
      label: "【家族Q3】家族から精神的サポートを受けていると感じますか？",
      options: [
        { label: "強く感じる", points: 15 },
        { label: "ある程度感じる", points: 10 },
        { label: "あまり感じない", points: 5 },
        { label: "感じない", points: 0 },
      ],
    },
    // ── ブリッジング（50pt）──
    {
      label: "【ブリッジングQ1】会社・学校以外で継続的に関わるコミュニティはありますか？",
      options: [
        { label: "3つ以上", points: 15 },
        { label: "2つ", points: 10 },
        { label: "1つ", points: 5 },
        { label: "ない", points: 0 },
      ],
    },
    {
      label: "【ブリッジングQ2】自分とは異なる業界・価値観の人と定期的に交流がありますか？",
      options: [
        { label: "頻繁にある", points: 15 },
        { label: "時々ある", points: 8 },
        { label: "ほとんどない", points: 0 },
      ],
    },
    {
      label: "【ブリッジングQ3】新しい出会いはどの程度ありますか？",
      options: [
        { label: "毎月ある", points: 10 },
        { label: "数ヶ月に1回", points: 5 },
        { label: "ほとんどない", points: 0 },
      ],
    },
    {
      label: "【ブリッジングQ4】あなたは他者に新しい情報や機会を提供できますか？",
      options: [
        { label: "頻繁にある", points: 10 },
        { label: "時々ある", points: 5 },
        { label: "ほとんどない", points: 0 },
      ],
    },
  ],
  time: [
    {
      label: "【可処分Q1】週の労働時間（残業含む）",
      options: [
        { label: "20時間未満", points: 25 },
        { label: "20〜34時間", points: 22 },
        { label: "35〜40時間", points: 18 },
        { label: "41〜45時間", points: 12 },
        { label: "46〜55時間", points: 5 },
        { label: "56時間以上", points: 0 },
      ],
    },
    {
      label: "【可処分Q2】平日の自由時間（仕事・家事以外）",
      options: [
        { label: "3時間以上", points: 25 },
        { label: "2〜3時間", points: 20 },
        { label: "1〜2時間", points: 10 },
        { label: "1時間未満", points: 0 },
      ],
    },
    {
      label: "【可処分Q3】平均睡眠時間",
      options: [
        { label: "7時間以上", points: 20 },
        { label: "6〜6.9時間", points: 15 },
        { label: "5〜5.9時間", points: 5 },
        { label: "5時間未満", points: 0 },
      ],
    },
    {
      label: "【可処分Q4】1日の通勤時間（往復）",
      options: [
        { label: "30分未満", points: 10 },
        { label: "30〜59分", points: 5 },
        { label: "60分以上", points: 0 },
      ],
    },
    {
      label: "【裁量Q1】現在の忙しさは自分で選んでいますか？",
      options: [
        { label: "完全に自分で選択している", points: 40 },
        { label: "ある程度選択できている", points: 30 },
        { label: "あまり選べていない", points: 10 },
        { label: "選べない", points: 0 },
      ],
    },
    {
      label: "【裁量Q2】収入を維持したまま労働時間を減らせますか？",
      options: [
        { label: "可能", points: 30 },
        { label: "ある程度可能", points: 20 },
        { label: "難しい", points: 10 },
        { label: "不可能", points: 0 },
      ],
    },
    {
      label: "【裁量Q3】働く時間帯を自分で決められますか？",
      options: [
        { label: "完全に決められる", points: 20 },
        { label: "ある程度決められる", points: 15 },
        { label: "ほぼ固定", points: 5 },
        { label: "完全固定", points: 0 },
      ],
    },
    {
      label: "【裁量Q4】突発的な拘束（急な呼び出しなど）",
      options: [
        { label: "ほぼない", points: 15 },
        { label: "時々ある", points: 10 },
        { label: "頻繁にある", points: 5 },
        { label: "常にある", points: 0 },
      ],
    },
    {
      label: "【裁量Q5】長期休暇（1週間以上）を自分の意思で取得できますか？",
      options: [
        { label: "自由に取得可能", points: 15 },
        { label: "調整すれば可能", points: 10 },
        { label: "難しい", points: 5 },
        { label: "不可能", points: 0 },
      ],
    },
  ],
  psychological: [
    {
      label: "【身体Q1】現在の自己評価の健康状態",
      options: [
        { label: "非常に健康", points: 20 },
        { label: "概ね健康", points: 15 },
        { label: "やや不安あり", points: 5 },
        { label: "慢性的な不調あり", points: 0 },
      ],
    },
    {
      label: "【身体Q2】週の運動習慣",
      options: [
        { label: "週3回以上", points: 15 },
        { label: "週1〜2回", points: 10 },
        { label: "月数回", points: 5 },
        { label: "ほぼなし", points: 0 },
      ],
    },
    {
      label: "【身体Q3】食生活の管理度",
      options: [
        { label: "かなり意識している", points: 10 },
        { label: "ある程度意識している", points: 7 },
        { label: "あまり意識していない", points: 3 },
        { label: "ほぼ無関心", points: 0 },
      ],
    },
    {
      label: "【身体Q4】喫煙習慣",
      options: [
        { label: "吸わない", points: 5 },
        { label: "過去に吸っていたが現在は吸わない", points: 3 },
        { label: "現在吸っている", points: 0 },
      ],
    },
    {
      label: "【精神Q1】日常的な気分の安定度",
      options: [
        { label: "非常に安定している", points: 15 },
        { label: "概ね安定している", points: 10 },
        { label: "不安定な時がある", points: 5 },
        { label: "不安定である", points: 0 },
      ],
    },
    {
      label: "【精神Q2】強いストレスを感じる頻度",
      options: [
        { label: "ほぼない", points: 15 },
        { label: "時々ある", points: 10 },
        { label: "頻繁にある", points: 5 },
        { label: "常にある", points: 0 },
      ],
    },
    {
      label: "【精神Q3】困難からの回復力（レジリエンス）",
      options: [
        { label: "高い", points: 10 },
        { label: "普通", points: 7 },
        { label: "やや弱い", points: 3 },
        { label: "弱い", points: 0 },
      ],
    },
    {
      label: "【精神Q4】人生に意味や目的を感じていますか？",
      options: [
        { label: "強く感じている", points: 10 },
        { label: "ある程度感じている", points: 7 },
        { label: "あまり感じない", points: 3 },
        { label: "感じない", points: 0 },
      ],
    },
  ],
};

/** 科目ごとの満点（合計）。正規化時に使用 */
export const EXAM_V2_SUBJECT_MAX_POINTS: Record<SubjectCode, number> = {
  financial: 200,   // 100+40+30+30
  human: 200,       // 100+30+30+20+20
  social: 200,      // 恋愛50+友人50+家族50+ブリッジング50
  time: 200,        // 可処分80+裁量120
  psychological: 100, // 身体50+精神50
};

export const EXAM_V2_SUBJECT_ORDER: SubjectCode[] = [
  "financial",
  "human",
  "social",
  "time",
  "psychological",
];
