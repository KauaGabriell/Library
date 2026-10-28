import { expect, type Page, test } from "@playwright/test";

const apiUrl = "http://127.0.0.1:3000";

const dashboardResponse = {
  totalBooks: 0,
  countsByStatus: { WANT_TO_READ: 0, READING: 0, READ: 0 },
  averageRating: null,
  recentEntries: [],
  readingGoal: null,
  betterRating: null,
};

type ReadingGoal = {
  year: number;
  targetBooks: number;
  completedBooks: number;
  progressPercent: number;
};

async function mockDashboard(page: Page, initialGoal: ReadingGoal | null) {
  let readingGoal = initialGoal;
  let dashboardRequestCount = 0;

  await page.route(`${apiUrl}/auth/me`, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        id: "4a8a4d44-9639-4b19-8709-6915cc94623e",
        email: "reader@example.com",
        name: "Leitor",
        avatarUrl: null,
      },
    });
  });

  await page.route(`${apiUrl}/dashboard`, async (route) => {
    dashboardRequestCount += 1;
    await route.fulfill({
      status: 200,
      json: { ...dashboardResponse, readingGoal },
    });
  });

  return {
    setReadingGoal(goal: ReadingGoal | null) {
      readingGoal = goal;
    },
    get dashboardRequestCount() {
      return dashboardRequestCount;
    },
  };
}

test("opens and closes the reading goal dialog accessibly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });

  await mockDashboard(page, null);

  await page.goto("/dashboard");

  const trigger = page.getByRole("button", { name: "Definir meta" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Definir meta de leitura" });
  await expect(dialog).toBeVisible();
  const dialogBounds = await dialog.boundingBox();
  if (dialogBounds === null) {
    throw new Error("Reading goal dialog has no visible bounds.");
  }
  expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(320);
  await expect(
    dialog.getByLabel("Livros que deseja ler", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Salvar meta" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("creates a reading goal and refreshes the dashboard cache", async ({
  page,
}) => {
  const dashboard = await mockDashboard(page, null);
  const savedGoal = {
    year: 2026,
    targetBooks: 12,
    completedBooks: 2,
    progressPercent: 16,
  } satisfies ReadingGoal;

  await page.route(`${apiUrl}/reading-goal`, async (route) => {
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toEqual({ targetBooks: 12 });
    dashboard.setReadingGoal(savedGoal);
    await route.fulfill({ status: 200, json: savedGoal });
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Definir meta" }).click();
  const dialog = page.getByRole("dialog", { name: "Definir meta de leitura" });
  await dialog.getByLabel("Livros que deseja ler", { exact: true }).fill("12");

  const saveRequest = page.waitForRequest(
    (request) =>
      request.url() === `${apiUrl}/reading-goal` && request.method() === "PUT",
  );
  await dialog.getByRole("button", { name: "Salvar meta" }).click();

  expect((await saveRequest).postDataJSON()).toEqual({ targetBooks: 12 });
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "16",
  );
  await expect(
    page.getByRole("heading", { name: "Bem-vindo de volta, Leitor!" }),
  ).toBeFocused();
  await expect.poll(() => dashboard.dashboardRequestCount).toBe(2);
});

test("shows a completed current-year reading goal at 100 percent", async ({
  page,
}) => {
  await mockDashboard(page, {
    year: new Date().getFullYear(),
    targetBooks: 12,
    completedBooks: 12,
    progressPercent: 100,
  });

  await page.goto("/dashboard");

  await expect(page.getByText("12 de 12", { exact: true })).toBeVisible();
  await expect(page.getByText("livros este ano")).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Progresso da meta de leitura" }),
  ).toHaveAttribute("aria-valuenow", "100");
});

test("updates an existing reading goal and refreshes the dashboard cache", async ({
  page,
}) => {
  const dashboard = await mockDashboard(page, {
    year: 2026,
    targetBooks: 10,
    completedBooks: 3,
    progressPercent: 30,
  });
  const updatedGoal = {
    year: 2026,
    targetBooks: 20,
    completedBooks: 3,
    progressPercent: 15,
  } satisfies ReadingGoal;

  await page.route(`${apiUrl}/reading-goal`, async (route) => {
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toEqual({ targetBooks: 20 });
    dashboard.setReadingGoal(updatedGoal);
    await route.fulfill({ status: 200, json: updatedGoal });
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Editar meta" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar meta de leitura" });
  const targetInput = dialog.getByLabel("Livros que deseja ler", {
    exact: true,
  });
  await expect(targetInput).toHaveValue("10");
  await targetInput.fill("20");

  const saveRequest = page.waitForRequest(
    (request) =>
      request.url() === `${apiUrl}/reading-goal` && request.method() === "PUT",
  );
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();

  expect((await saveRequest).postDataJSON()).toEqual({ targetBooks: 20 });
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "15",
  );
  await expect.poll(() => dashboard.dashboardRequestCount).toBe(2);
});

test("removes a reading goal and refreshes the dashboard cache", async ({
  page,
}) => {
  const dashboard = await mockDashboard(page, {
    year: 2026,
    targetBooks: 10,
    completedBooks: 3,
    progressPercent: 30,
  });

  await page.route(`${apiUrl}/reading-goal`, async (route) => {
    expect(route.request().method()).toBe("DELETE");
    dashboard.setReadingGoal(null);
    await route.fulfill({ status: 204 });
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Editar meta" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar meta de leitura" });

  const deleteRequest = page.waitForRequest(
    (request) =>
      request.url() === `${apiUrl}/reading-goal` &&
      request.method() === "DELETE",
  );
  await dialog.getByRole("button", { name: "Remover meta" }).click();

  await deleteRequest;
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Defina sua meta de leitura")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect.poll(() => dashboard.dashboardRequestCount).toBe(2);
});

test("keeps the dialog open and shows an error when removing a goal fails", async ({
  page,
}) => {
  const dashboard = await mockDashboard(page, {
    year: 2026,
    targetBooks: 10,
    completedBooks: 3,
    progressPercent: 30,
  });
  let deleteAttemptCount = 0;

  await page.route(`${apiUrl}/reading-goal`, async (route) => {
    expect(route.request().method()).toBe("DELETE");
    deleteAttemptCount += 1;

    if (deleteAttemptCount === 1) {
      await route.fulfill({
        status: 500,
        json: {
          code: "INTERNAL_ERROR",
          message: "Falha ao remover a meta.",
        },
      });
      return;
    }

    dashboard.setReadingGoal(null);
    await route.fulfill({ status: 204 });
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Editar meta" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar meta de leitura" });
  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url() === `${apiUrl}/reading-goal` &&
      response.request().method() === "DELETE",
  );

  await dialog.getByRole("button", { name: "Remover meta" }).click();
  await deleteResponse;

  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("alert").getByText("Falha ao remover a meta.", {
      exact: true,
    }),
  ).toBeVisible();

  const retryRequest = page.waitForRequest(
    (request) =>
      request.url() === `${apiUrl}/reading-goal` &&
      request.method() === "DELETE",
  );
  await dialog.getByRole("button", { name: "Tentar novamente" }).click();
  await retryRequest;

  await expect(dialog).toBeHidden();
  await expect(page.getByText("Defina sua meta de leitura")).toBeVisible();
  await expect.poll(() => deleteAttemptCount).toBe(2);
});

test("shows target validation and does not send invalid goal", async ({
  page,
}) => {
  await mockDashboard(page, null);
  let saveRequestCount = 0;

  await page.route(`${apiUrl}/reading-goal`, async (route) => {
    saveRequestCount += 1;
    await route.fulfill({ status: 200, json: {} });
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Definir meta" }).click();
  const dialog = page.getByRole("dialog", { name: "Definir meta de leitura" });
  const targetInput = dialog.getByLabel("Livros que deseja ler", {
    exact: true,
  });
  await targetInput.fill("0");
  await dialog.getByRole("button", { name: "Salvar meta" }).click();

  await expect(targetInput).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByRole("alert")).toHaveText(
    "Você deve ter pelo menos 1 livro como meta",
  );
  expect(saveRequestCount).toBe(0);
});
