/**
 * OGP画像一括生成スクリプト
 *
 * 実行方法（dev サーバーを起動した状態で）:
 *   npm run generate:ogp
 *
 * 生成先: public/ogp/{characterId}.png（16枚）
 */
import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const CHARACTER_IDS = [
  "amaterasu",
  "king",
  "lion",
  "kaiko",
  "tsukuyomi",
  "noble",
  "namakemono",
  "snail",
  "dwarf_king",
  "knight",
  "tanuki",
  "beetle",
  "goblin_king",
  "serf",
  "hyena",
  "mosquito",
] as const;

const OUTPUT_DIR = path.join(process.cwd(), "public/ogp");

test.describe("OGP画像生成", () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  for (const id of CHARACTER_IDS) {
    test(id, async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 630 });
      await page.goto(`/ogp-gen/${id}`, { waitUntil: "networkidle" });

      // フォント・画像の読み込みを待機
      await page.waitForLoadState("networkidle");

      const outputPath = path.join(OUTPUT_DIR, `${id}.png`);
      await page.screenshot({
        path: outputPath,
        clip: { x: 0, y: 0, width: 1200, height: 630 },
      });

      console.log(`✓ public/ogp/${id}.png`);
    });
  }
});
