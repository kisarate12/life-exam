/**
 * 5資本フィードバック（強み・弱み・改善余地・コメント）
 * ルールベース定型文。生成AIなし。将来差し替え可能な構造。
 */

export type CapitalKey =
  | "financial"
  | "human"
  | "social"
  | "time"
  | "psychological";

export type ScoreRange = "high" | "mid" | "low";

/** スコアからレンジを返す。High: 70-100, Mid: 50-69, Low: 0-49 */
export function getRange(score: number): ScoreRange {
  if (score >= 70) return "high";
  if (score >= 50) return "mid";
  return "low";
}

/** subject_id → capital key（DBの並び 1=financial, 2=human, 3=social, 4=time, 5=psychological） */
export const SUBJECT_ID_TO_KEY: Record<number, CapitalKey> = {
  1: "financial",
  2: "human",
  3: "social",
  4: "time",
  5: "psychological",
};

export function getCapitalLabel(key: CapitalKey): string {
  const labels: Record<CapitalKey, string> = {
    financial: "資産",
    human: "収入",
    social: "人間関係",
    time: "時間",
    psychological: "健康",
  };
  return labels[key];
}

/** 総合スコア用の重み（流用） */
export const CAPITAL_WEIGHTS: Record<CapitalKey, number> = {
  financial: 0.3,
  human: 0.25,
  social: 0.2,
  time: 0.15,
  psychological: 0.1,
};

/** スコアが最大の資本＝強み、最小＝弱み */
export function getStrengthWeakness(scores: Record<CapitalKey, number>): {
  strengthKey: CapitalKey;
  weaknessKey: CapitalKey;
} {
  const entries = Object.entries(scores) as [CapitalKey, number][];
  if (entries.length === 0)
    return { strengthKey: "financial", weaknessKey: "financial" };
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  return {
    strengthKey: sorted[0][0],
    weaknessKey: sorted[sorted.length - 1][0],
  };
}

/** leverage = weight * (100 - score)。最大の資本を改善余地とする */
export function getLeverage(
  scores: Record<CapitalKey, number>,
  weights: Record<CapitalKey, number>
): { leverageKey: CapitalKey; leverageValue: number } {
  let maxKey: CapitalKey = "financial";
  let maxVal = 0;
  for (const key of Object.keys(scores) as CapitalKey[]) {
    const w = weights[key] ?? 0;
    const lev = w * (100 - (scores[key] ?? 0));
    if (lev > maxVal) {
      maxVal = lev;
      maxKey = key;
    }
  }
  return { leverageKey: maxKey, leverageValue: maxVal };
}

/** 強みの「維持の指針」（レンジ別1文） */
export const STRENGTH_MAINTAIN_GUIDE: Record<ScoreRange, string> = {
  high:
    "現状水準を維持すれば合格圏の土台として機能する。無理な削りを避ける。",
  mid: "平均以上まで伸びている。さらに伸ばせば差別化要因になる。",
  low: "他より相対的に高いだけであり、油断するとすぐに逆転される。",
};

/** 弱みの「放置リスク」（レンジ別1文） */
export const WEAKNESS_RISK: Record<ScoreRange, string> = {
  high: "他科目より低いが水準はある。放置するとボーダーで泣く可能性。",
  mid: "平均前後。ここを放置すると合格まで届かない構造になりやすい。",
  low: "構造的な穴になっている。放置すると他資本の成果も相殺されやすい。",
};

/** 5資本×3レンジのコメント（現状評価・リスク・次の一手・改善アクション3つ） */
export interface CapitalCommentSet {
  summary: string;
  risk: string;
  action: string;
  actions: [string, string, string];
}

export const CAPITAL_COMMENTS: Record<
  CapitalKey,
  Record<ScoreRange, CapitalCommentSet>
> = {
  financial: {
    high: {
      summary: "資産は水準を満たしている。",
      risk: "構造的には貯蓄・収入の余裕が合格圏を支えている。",
      action: "維持を前提に、浪費ポイントだけ点検する。",
      actions: [
        "固定費を見直し、月1回の収支確認を習慣化する",
        "目標貯蓄率を決め、手取りの〇％を先取りする",
        "インフレ・リスク分散を意識した資産配分を検討する",
      ],
    },
    mid: {
      summary: "資産は平均前後。伸びしろがある。",
      risk: "このままでは合格圏で「お金」がボトルネックになりうる。",
      action: "収入の柱を増やすか、支出の構造を変える。",
      actions: [
        "副業・スキル売却など収入の第二の柱を1つ検討する",
        "固定費・サブスクを洗い出し、削減可能な項目を絞る",
        "半年〜1年単位の資金計画を数字で書き出す",
      ],
    },
    low: {
      summary: "資産は不足気味。数値で把握することが先決。",
      risk: "構造的に不安が残ると、他資本への投資も鈍りやすい。",
      action: "まず可視化し、小さくでも改善の一手を打つ。",
      actions: [
        "収入・支出・貯蓄を1ヶ月分でいいので書き出し可視化する",
        "借金がある場合は返済計画を立て、実行可能な最小額から始める",
        "生活防衛資金の目標額を決め、そこに向けた逆算を1年単位で行う",
      ],
    },
  },
  human: {
    high: {
      summary: "収入は十分に積み上がっている。",
      risk: "健康・スキル・キャリアのいずれかが合格圏の基盤になっている。",
      action: "維持と更新のバランスを取る。学びを止めない。",
      actions: [
        "年1回は健康診断・歯科など予防的メンテナンスを入れる",
        "業界・職種の変化に合わせて学び直しのテーマを1つ決める",
        "キャリアの次のマイルストーンを言語化し、必要なスキルをリストする",
      ],
    },
    mid: {
      summary: "収入は平均前後。伸ばす余地が明確にある。",
      risk: "放置するとスキル・健康のどちらかがボトルネック化しやすい。",
      action: "健康とスキルの両方を「少しずつ」投資する。",
      actions: [
        "睡眠・運動・食事のうち1つだけでも数値目標を立てて改善する",
        "業務で使える資格・スキルを1つ選び、受験または学習計画を立てる",
        "信頼できる上司・メンターにキャリアの見通しを一度相談する",
      ],
    },
    low: {
      summary: "収入は投資が足りていない状態。",
      risk: "構造的に健康・スキル・キャリアのいずれかが穴になっている。",
      action: "まずは「1つ」に集中して手を打つ。",
      actions: [
        "健康面で気になっていることを1つ挙げ、病院・検診で確認する",
        "仕事に直結するスキルを1つ選び、3ヶ月で習得する計画を立てる",
        "転職・副業・学びのいずれかを「情報収集」レベルでよいので始める",
      ],
    },
  },
  social: {
    high: {
      summary: "人間関係は水準を満たしている。",
      risk: "つながり・信頼・情報経路が合格圏を支えている。",
      action: "与えすぎず、頼りすぎず。関係性の質を維持する。",
      actions: [
        "困ったときに相談できる人を3人以上、意識的に維持する",
        "地域・コミュニティのイベントに年2回以上参加する",
        "自分が「紹介できる人」になるよう、専門性を1つ磨く",
      ],
    },
    mid: {
      summary: "人間関係は平均前後。ネットワークの幅か深さに偏りがありうる。",
      risk: "このままだと情報・機会・支援が届きにくい構造になりやすい。",
      action: "弱いつながりと強いつながりの両方を意識して増やす。",
      actions: [
        "業界・職種が違う人と月1回以上、情報交換の場を持つ",
        "地域の会合・オンラインコミュニティに1つ加入してみる",
        "自分が「頼れる人」として何ができるか、言語化して伝える機会を増やす",
      ],
    },
    low: {
      summary: "人間関係は薄い。孤立しやすい構造。",
      risk: "構造的に情報・機会・支援が届きにくく、他資本も伸ばしづらい。",
      action: "まずは「1つの場」に参加し、関係の種をまく。",
      actions: [
        "興味のあるコミュニティ・勉強会・オンラインサロンを1つ選び参加する",
        "昔の同僚・同級生に連絡を取り、近況を交換する機会を1回つくる",
        "自分が提供できる価値（スキル・情報・時間）を1文で言えるようにする",
      ],
    },
  },
  time: {
    high: {
      summary: "時間は確保できている。",
      risk: "時間の余白が選択肢と再投資を生み、合格圏を支えている。",
      action: "余白の使い道を意識する。消費で終わらせない。",
      actions: [
        "週のうち「投資用」の時間ブロックを決め、カレンダーに固定する",
        "睡眠・休息の時間を削らないルールを1つ決めて守る",
        "やりたいことリストから1つ選び、その時間を今月から確保する",
      ],
    },
    mid: {
      summary: "時間は平均前後。余白が不足気味。",
      risk: "このままでは時間不足がストレスと非効率を増幅しやすい。",
      action: "削るより「ブロック化」と「断る」で余白をつくる。",
      actions: [
        "週次で「やらないこと」を1つ決め、時間を空ける",
        "重要なタスクに集中する時間帯を決め、その間は通知を切る",
        "家事・雑務のうち外注・省略できるものを1つ選んで試す",
      ],
    },
    low: {
      summary: "時間は逼迫している。構造的な時間不足。",
      risk: "時間が足りないと他資本への投資も後回しになりやすい。",
      action: "まずは睡眠と休息を最優先し、そのうえで削れる無駄を1つ切る。",
      actions: [
        "睡眠時間を1週間記録し、最低確保したい時間を数値で決める",
        "「やめてよいこと」を3つ書き出し、1つは今月からやめる",
        "仕事・家事のうち効率化できる手順を1つだけ変えてみる",
      ],
    },
  },
  psychological: {
    high: {
      summary: "健康は水準を満たしている。",
      risk: "メンタルの安定が判断と行動の質を支え、合格圏に寄与している。",
      action: "無理を重ねない。休息と意味の再確認を習慣化する。",
      actions: [
        "ストレスがたまったときの「切り替え」を1つ決めておく",
        "週1回、自分がやっていることの意味を短く言語化する",
        "褒める・認める機会を自分と他者に意識的に増やす",
      ],
    },
    mid: {
      summary: "健康は平均前後。波がありうる。",
      risk: "放置するとストレスや自己否定が行動を鈍らせやすい。",
      action: "感情より「構造」を変える。睡眠・運動・他者との対話を増やす。",
      actions: [
        "不調のサインを3つ決め、出たら休息か相談を取るルールにする",
        "週に1回、自分ができたことを3つ書き出して振り返る",
        "信頼できる人に「今の状態」を話す機会を月1回以上つくる",
      ],
    },
    low: {
      summary: "健康は消耗気味。まずは休息と安全基地の確保。",
      risk: "構造的にメンタルが削られると、他資本への投資意欲も落ちやすい。",
      action: "無理にポジティブにせず、負荷を下げる一手を優先する。",
      actions: [
        "「やらなくてよいこと」を1つ決め、今月は手を付けない",
        "専門家（カウンセリング・産業医等）に相談する選択肢を検討する",
        "自分を責めず「状態」として捉え、小さな改善を1つだけ試す",
      ],
    },
  },
};

export function getCapitalComment(
  capitalKey: CapitalKey,
  range: ScoreRange
): CapitalCommentSet {
  return CAPITAL_COMMENTS[capitalKey][range];
}
