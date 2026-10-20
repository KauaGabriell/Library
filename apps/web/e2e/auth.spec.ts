import { expect, type Page, test } from "@playwright/test";

const apiUrl = "http://127.0.0.1:3000";

const publicUser = {
  id: "4a8a4d44-9639-4b19-8709-6915cc94623e",
  email: "reader@example.com",
  name: "Leitor",
  avatarUrl: null,
};

const emptyDashboard = {
  totalBooks: 0,
  countsByStatus: { WANT_TO_READ: 0, READING: 0, READ: 0 },
  averageRating: null,
  recentEntries: [],
  readingGoal: null,
  betterRating: null,
};

async function mockDashboard(page: Page) {
  await page.route(`${apiUrl}/dashboard`, async (route) => {
    await route.fulfill({ status: 200, json: emptyDashboard });
  });
}

async function expectDashboardLoaded(page: Page, userName: string) {
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: `Bem-vindo de volta, ${userName}!` }),
  ).toBeVisible();
}

test.describe("Login", () => {
  test("alterna visibilidade da senha com teclado e clique", async ({
    page,
  }) => {
    await page.goto("/login");

    const passwordInput = page.getByLabel("Senha", { exact: true });
    const visibilityButton = page.getByRole("button", {
      name: "Alternar visibilidade da senha",
    });

    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(visibilityButton).toHaveAttribute("aria-pressed", "false");

    await visibilityButton.focus();
    await page.keyboard.press("Space");

    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(visibilityButton).toHaveAttribute("aria-pressed", "true");

    await visibilityButton.click();

    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(visibilityButton).toHaveAttribute("aria-pressed", "false");
  });

  test("mostra erros de validação nos campos antes da requisição", async ({
    page,
  }) => {
    let loginRequestCount = 0;
    await page.route(`${apiUrl}/auth/login`, async (route) => {
      loginRequestCount += 1;
      await route.fulfill({ status: 200, json: publicUser });
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByLabel("E-mail")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(loginRequestCount).toBe(0);
  });

  test("envia credenciais e navega após login válido", async ({ page }) => {
    await page.route(`${apiUrl}/auth/login`, async (route) => {
      await route.fulfill({ status: 200, json: publicUser });
    });
    await page.route(`${apiUrl}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, json: publicUser });
    });
    await mockDashboard(page);

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(publicUser.email);
    await page.getByLabel("Senha", { exact: true }).fill("valid-password-123");

    const loginRequest = page.waitForRequest(
      (request) =>
        request.url() === `${apiUrl}/auth/login` && request.method() === "POST",
    );
    await page.getByRole("button", { name: "Entrar" }).click();

    expect((await loginRequest).postDataJSON()).toEqual({
      email: publicUser.email,
      password: "valid-password-123",
    });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expectDashboardLoaded(page, publicUser.name);
  });

  test("mostra erro recuperável quando credenciais são inválidas", async ({
    page,
  }) => {
    await page.route(`${apiUrl}/auth/login`, async (route) => {
      await route.fulfill({
        status: 401,
        json: {
          code: "UNAUTHENTICATED",
          message: "E-mail ou senha inválidos.",
        },
      });
    });

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(publicUser.email);
    await page.getByLabel("Senha", { exact: true }).fill("wrong-password-123");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "E-mail ou senha inválidos.",
    );
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("Google OAuth", () => {
  test("aponta o link para o endpoint que inicia o OAuth", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("link", { name: "Continuar com Google" }),
    ).toHaveAttribute("href", `${apiUrl}/auth/google`);
  });

  test("confirma a sessão e abre o dashboard após o callback", async ({
    page,
  }) => {
    let finishAuthRequest!: () => void;
    const authRequestGate = new Promise<void>((resolve) => {
      finishAuthRequest = resolve;
    });

    await page.route(`${apiUrl}/auth/me`, async (route) => {
      expect(route.request().method()).toBe("GET");
      await authRequestGate;
      await route.fulfill({ status: 200, json: publicUser });
    });
    await mockDashboard(page);

    await page.goto("/auth/google/callback");
    await expect(page.getByText("Confirmando sua sessão...")).toBeVisible();

    finishAuthRequest();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expectDashboardLoaded(page, publicUser.name);
  });

  test("mostra falha e permite repetir a confirmação da sessão", async ({
    page,
  }) => {
    let authAttemptCount = 0;

    await page.route(`${apiUrl}/auth/me`, async (route) => {
      authAttemptCount += 1;

      if (authAttemptCount === 1) {
        await route.fulfill({
          status: 500,
          json: {
            code: "INTERNAL_ERROR",
            message: "Falha ao confirmar sessão.",
          },
        });
        return;
      }

      await route.fulfill({ status: 200, json: publicUser });
    });
    await mockDashboard(page);

    await page.goto("/auth/google/callback");

    await expect(page.getByRole("alert")).toContainText(
      "Falha ao confirmar sessão.",
    );
    await page.getByRole("button", { name: "Tentar novamente" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expectDashboardLoaded(page, publicUser.name);
    expect(authAttemptCount).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Cadastro", () => {
  test("mostra erros de validação nos campos antes da requisição", async ({
    page,
  }) => {
    let registerRequestCount = 0;
    await page.route(`${apiUrl}/auth/register`, async (route) => {
      registerRequestCount += 1;
      await route.fulfill({ status: 201, json: publicUser });
    });

    await page.goto("/register");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page.getByLabel("E-mail")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(registerRequestCount).toBe(0);
  });

  test("envia os dados e navega após cadastro válido", async ({ page }) => {
    const registeredUser = {
      ...publicUser,
      email: "new-reader@example.com",
      name: "Nova leitora",
    };

    await page.route(`${apiUrl}/auth/register`, async (route) => {
      await route.fulfill({ status: 201, json: registeredUser });
    });
    await page.route(`${apiUrl}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, json: registeredUser });
    });
    await mockDashboard(page);

    await page.goto("/register");
    await page.getByLabel("Nome (opcional)").fill(registeredUser.name);
    await page.getByLabel("E-mail").fill(registeredUser.email);
    await page.getByLabel("Senha", { exact: true }).fill("valid-password-123");

    const registerRequest = page.waitForRequest(
      (request) =>
        request.url() === `${apiUrl}/auth/register` &&
        request.method() === "POST",
    );
    await page.getByRole("button", { name: "Criar conta" }).click();

    expect((await registerRequest).postDataJSON()).toEqual({
      name: registeredUser.name,
      email: registeredUser.email,
      password: "valid-password-123",
    });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expectDashboardLoaded(page, registeredUser.name);
  });

  test("mostra erro do servidor e permite tentar novamente", async ({
    page,
  }) => {
    const registeredUser = {
      ...publicUser,
      email: "new-reader@example.com",
      name: "Nova leitora",
    };
    let registerAttempt = 0;

    await page.route(`${apiUrl}/auth/register`, async (route) => {
      registerAttempt += 1;

      if (registerAttempt === 1) {
        await route.fulfill({
          status: 409,
          json: {
            code: "CONFLICT",
            message: "Este e-mail já está cadastrado.",
          },
        });
        return;
      }

      await route.fulfill({ status: 201, json: registeredUser });
    });
    await page.route(`${apiUrl}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, json: registeredUser });
    });
    await mockDashboard(page);

    await page.goto("/register");
    await page.getByLabel("E-mail").fill("existing@example.com");
    await page.getByLabel("Senha", { exact: true }).fill("valid-password-123");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "Este e-mail já está cadastrado.",
    );
    await expect(page).toHaveURL(/\/register$/);

    await page.getByLabel("E-mail").fill(registeredUser.email);
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expectDashboardLoaded(page, registeredUser.name);
    expect(registerAttempt).toBe(2);
  });
});

test.describe("Logout", () => {
  test("encerra a sessão e impede o retorno a uma rota privada", async ({
    page,
  }) => {
    let sessionEnded = false;
    let unauthenticatedCheckCount = 0;

    await page.route(`${apiUrl}/auth/me`, async (route) => {
      if (sessionEnded) {
        unauthenticatedCheckCount += 1;
        await route.fulfill({
          status: 401,
          json: {
            code: "UNAUTHENTICATED",
            message: "Não autenticado.",
          },
        });
        return;
      }

      await route.fulfill({ status: 200, json: publicUser });
    });
    await page.route(`${apiUrl}/auth/logout`, async (route) => {
      expect(route.request().method()).toBe("POST");
      sessionEnded = true;
      await route.fulfill({ status: 204 });
    });
    await mockDashboard(page);

    await page.goto("/dashboard");
    await expectDashboardLoaded(page, publicUser.name);
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Buscar livros" })
      .click();
    await expect(page).toHaveURL(/\/search$/);

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goBack();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Literaria" }),
    ).toBeVisible();
    expect(unauthenticatedCheckCount).toBeGreaterThan(0);
  });

  test("mostra falha e permite tentar logout novamente", async ({ page }) => {
    let logoutAttemptCount = 0;

    await page.route(`${apiUrl}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, json: publicUser });
    });
    await page.route(`${apiUrl}/auth/logout`, async (route) => {
      logoutAttemptCount += 1;

      if (logoutAttemptCount === 1) {
        await route.fulfill({
          status: 500,
          json: {
            code: "INTERNAL_ERROR",
            message: "Falha ao encerrar sessão.",
          },
        });
        return;
      }

      await route.fulfill({ status: 204 });
    });

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Sair" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Falha ao encerrar sessão.",
    );
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Tentar novamente" }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(logoutAttemptCount).toBe(2);
  });
});

test.describe("Proteção de rota", () => {
  test("redireciona para login quando sessão está ausente", async ({
    page,
  }) => {
    await page.route(`${apiUrl}/auth/me`, async (route) => {
      await route.fulfill({
        status: 401,
        json: {
          code: "UNAUTHENTICATED",
          message: "Não autenticado.",
        },
      });
    });

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Literaria" }),
    ).toBeVisible();
  });
});
