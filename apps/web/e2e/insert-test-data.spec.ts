/**
 * テストデータ挿入スクリプト
 * DEVボタンを使って1件の診断データを自動挿入する
 *
 * 実行方法（dev サーバーを起動した状態で）:
 *   npm run insert:test-data
 */
import { test, expect } from "@playwright/test";

test("テストデータ挿入", async ({ page }) => {
  // 基本情報ページ
  await page.goto("/life-exam/new", { waitUntil: "networkidle" });
  await page.waitForLoadState("networkidle");

  // DEVボタンが出るまで待つ
  const devBtn = page.locator("text=DEV: サンプル入力してスキップ");
  await devBtn.waitFor({ timeout: 10000 });
  await devBtn.click();

  // 試験ページへ遷移するまで待つ
  await page.waitForURL("**/exam/**", { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // 全科目オート提出ボタン
  const submitBtn = page.locator("text=DEV: 全科目オート提出");
  await submitBtn.waitFor({ timeout: 10000 });
  await submitBtn.click();

  // 結果ページへ遷移するまで待つ
  await page.waitForURL("**/result/**", { timeout: 30000 });

  const url = page.url();
  console.log(`✓ テストデータ挿入完了: ${url}`);
  expect(url).toContain("/result/");
});
