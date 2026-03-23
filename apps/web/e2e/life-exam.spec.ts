import { test, expect } from "@playwright/test";

const BASE = "/life-exam";

/** 科目ごとの選択レベル: H=高スコア(先頭), M=中, L=低(末尾) → ランク S~B / C / D~F を狙う */
type Level = "H" | "M" | "L";

/** 結果ページに表示されうる全16キャラクター名 */
const ALL_CHARACTER_NAMES = [
  "アマテラスオオミカミ",
  "大将軍",
  "獅子",
  "カイコ",
  "ツクヨミ",
  "下流貴族",
  "ナマケモノ",
  "カタツムリ",
  "ドワーフの王",
  "騎士",
  "タヌキ",
  "フンコロガシ",
  "オークの族長",
  "農奴",
  "ハイエナ",
  "蚊",
];

/** 5科目のレベル [資産, 収入, 人間関係, 時間, 健康]。狙いのキャラはコメント参照（母集団で変動するためアサーションは「いずれかのキャラ」のみ） */
const CHARACTER_PROFILES: { label: string; profile: Level[] }[] = [
  { label: "全科目高", profile: ["H", "H", "H", "H", "H"] },
  { label: "時間のみ中", profile: ["H", "H", "H", "H", "M"] },
  { label: "人間関係低・時間中・他高", profile: ["H", "H", "L", "M", "H"] },
  { label: "人間関係・時間低・他高", profile: ["H", "H", "L", "L", "H"] },
  { label: "資産・収入中・他高", profile: ["M", "M", "H", "H", "H"] },
  { label: "資産・収入低・他高", profile: ["L", "L", "H", "H", "H"] },
  { label: "資産収入低・人間関係中・時間健康高", profile: ["L", "L", "M", "H", "H"] },
  { label: "時間のみ高・他すべて低", profile: ["L", "L", "L", "L", "H"] },
  { label: "時間のみ中・他高", profile: ["H", "H", "H", "M", "H"] },
  { label: "時間のみ低・他高", profile: ["H", "H", "H", "L", "H"] },
  { label: "人間関係・時間低・健康中", profile: ["H", "H", "L", "L", "M"] },
  { label: "健康のみ低・資産収入高", profile: ["H", "H", "L", "L", "L"] },
  { label: "資産収入中・健康低・他高", profile: ["M", "M", "H", "H", "L"] },
  { label: "資産収入低・健康低・人間関係時間高", profile: ["L", "L", "H", "H", "L"] },
  { label: "人間関係中・時間低・健康高", profile: ["L", "L", "M", "L", "H"] },
  { label: "全科目低", profile: ["L", "L", "L", "L", "L"] },
];

/** 基本情報を入力して診断開始まで進む */
async function fillBasicInfo(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/new`);
  await expect(page.getByRole("combobox").first()).toBeVisible({ timeout: 15000 });
  await page.getByRole("combobox").first().selectOption({ index: 1 });
  await page.getByRole("combobox").nth(2).selectOption({ index: 1 });
  await page.getByRole("button", { name: /次へ（診断へ）/ }).click();
}

/** レベルに応じて選択するオプションのインデックス（各問の選択肢数で割った位置） */
function optionIndexForLevel(level: Level, optionCount: number): number {
  switch (level) {
    case "H":
      return 0;
    case "L":
      return optionCount - 1;
    case "M":
      return Math.floor(optionCount / 2);
  }
}

/** 現在の科目ページで指定レベルに従い全問選択し、次へ／提出する */
async function answerSubjectWithProfile(
  page: import("@playwright/test").Page,
  level: Level,
  isLastSubject: boolean
) {
  await page.getByRole("radio").first().waitFor({ state: "visible", timeout: 10000 });
  const groups = page.locator("div.space-y-2").filter({ has: page.getByRole("radio") });
  const count = await groups.count();
  for (let i = 0; i < count; i++) {
    const group = groups.nth(i);
    const radios = group.getByRole("radio");
    const n = await radios.count();
    const idx = optionIndexForLevel(level, n);
    await radios.nth(idx).check();
  }
  const currentUrl = page.url();
  const nextBtn = page.getByRole("button", { name: /次へ|提出して採点する/ });
  await nextBtn.click();
  if (isLastSubject) {
    await page.waitForURL(new RegExp(`${BASE}/result/[a-f0-9-]+`), { timeout: 45000 });
  } else {
    await page.waitForURL((url) => url.toString() !== currentUrl, { timeout: 20000 });
  }
}

for (const { label, profile } of CHARACTER_PROFILES) {
  test(`診断フロー（${label}）で結果ページにいずれかのキャラが表示される`, async ({ page }) => {
    await fillBasicInfo(page);

    for (let subject = 0; subject < 5; subject++) {
      await expect(page).toHaveURL(new RegExp(`${BASE}/new/exam/`), { timeout: 15000 });
      await answerSubjectWithProfile(page, profile[subject], subject === 4);
    }

    await expect(page).toHaveURL(new RegExp(`${BASE}/result/[a-f0-9-]+`));
    await expect(page.getByText("世界戦闘力")).toBeVisible({ timeout: 20000 });

    const text = await page.locator("body").textContent();
    const hasAnyCharacter = ALL_CHARACTER_NAMES.some((name) => text?.includes(name));
    expect(hasAnyCharacter, "結果ページにいずれかのキャラクター名が表示されていること").toBe(true);

    if (process.env.TEST_E2E_KEEP_OPEN) {
      await page.pause();
    }
  });
}
