import { expect, test } from "@playwright/test";

const apiUrl = "http://127.0.0.1:3000";

const publicUser = {
  id: "4a8a4d44-9639-4b19-8709-6915cc94623e",
  email: "reader@example.com",
  name: "Leitor",
  avatarUrl: null,
};

test.describe("Shell responsivo", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${apiUrl}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, json: publicUser });
    });
  });

  test("mostra somente a sidebar desktop em viewport grande", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard");

    const navigation = page.locator('nav[aria-label="Navegação principal"]');

    await expect(navigation).toHaveCount(1);
    await expect(navigation).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("button[aria-controls]")).toBeHidden();
    await expect(page.getByRole("button", { name: "Sair" })).toBeDisabled();

    const sidebar = await page.getByRole("banner").boundingBox();
    const content = await page.locator("#main-content").boundingBox();

    expect(sidebar?.width).toBe(256);
    expect(sidebar?.x).toBe(0);
    expect(content?.x).toBe(256);
    expect(content?.y).toBe(0);
    expect(sidebar?.height).toBeGreaterThanOrEqual(800);
  });

  for (const width of [320, 640, 768]) {
    test(`abre uma única navegação em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/dashboard");

      const navigation = page.locator('nav[aria-label="Navegação principal"]');

      await expect(navigation).toHaveCount(1);
      await expect(navigation).toBeHidden();
      await expect(page.getByRole("banner")).toBeVisible();
      await page.getByRole("button", { name: "Abrir menu de navegação" }).click();

      await expect(navigation).toBeVisible();
      await expect(page.getByRole("button", { name: "Sair" })).toBeDisabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
});
