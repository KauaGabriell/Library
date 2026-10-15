import { expect, test } from "@playwright/test";

const apiUrl = "http://127.0.0.1:3000";

const publicUser = {
  id: "4a8a4d44-9639-4b19-8709-6915cc94623e",
  email: "reader@example.com",
  name: "Leitor",
  avatarUrl: null,
};

test("renders book details using the Figma heading style", async ({ page }) => {
  await page.route(`${apiUrl}/auth/me`, async (route) => {
    await route.fulfill({ status: 200, json: publicUser });
  });

  await page.goto("/");

  const title = page.getByText("O Nome do Vento", { exact: true });
  await expect(title).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Capa de O Nome do Vento, por Patrick Rothfuss",
    }),
  ).toBeVisible();
  await expect(page.getByText("Quero ler", { exact: true })).toBeVisible();
  await expect(page.getByText("Adicionado 12 jan 2024")).toBeVisible();

  const typography = await title.evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
    };
  });

  expect(typography.fontFamily).toContain("EB Garamond");
  expect(typography.fontSize).toBe("20px");
  expect(typography.fontWeight).toBe("400");
  expect(typography.lineHeight).toBe("25px");
});
