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

const recommendationResponse = {
  recommendations: [
    {
      book: {
        googleBooksId: "midnight-library",
        title: "A biblioteca da meia-noite",
        authors: ["Matt Haig"],
        description: null,
        coverUrl: null,
        language: "pt-BR",
        pageCount: 240,
      },
      justification: "Uma história envolvente sobre escolhas e possibilidades.",
    },
    {
      book: {
        googleBooksId: "ocean-at-the-end",
        title: "O oceano no fim do caminho",
        authors: ["Neil Gaiman"],
        description: null,
        coverUrl: null,
        language: "pt-BR",
        pageCount: 208,
      },
      justification: "Fantasia contemplativa com atmosfera acolhedora.",
    },
    {
      book: {
        googleBooksId: "invisible-life-addie-larue",
        title: "A vida invisível de Addie LaRue",
        authors: ["V. E. Schwab"],
        description: null,
        coverUrl: null,
        language: "pt-BR",
        pageCount: 560,
      },
      justification: "Uma leitura emocional sobre memória e identidade.",
    },
  ],
};

async function mockSession(page: Page, status = 200) {
  await page.route(`${apiUrl}/auth/me`, async (route) => {
    await route.fulfill({
      status,
      json:
        status === 200
          ? publicUser
          : { code: "UNAUTHENTICATED", message: "Não autenticado." },
    });
  });
}

async function openQuiz(page: Page) {
  await mockSession(page);
  await page.goto("/recommendations/quiz");
  await expect(
    page.getByRole("heading", { name: "Descubra sua próxima leitura" }),
  ).toBeVisible();
}

async function answerCurrentStep(page: Page, options: string[]) {
  for (const option of options) {
    await page.getByRole("button", { name: option, exact: true }).click();
  }
}

async function completeQuiz(page: Page) {
  const answers = [
    ["Fantasia", "Romance"],
    ["Relaxar"],
    ["Curto"],
    ["Ágil"],
    ["Leve", "Inspirador"],
    ["Aventura"],
    ["Séries"],
  ];

  for (const [index, options] of answers.entries()) {
    await answerCurrentStep(page, options ?? []);
    await page
      .getByRole("button", {
        name: index === answers.length - 1 ? "Concluir quiz" : "Continuar",
      })
      .click();
  }
}

test("protects quiz route when the session is unauthenticated", async ({
  page,
}) => {
  await mockSession(page, 401);
  await page.goto("/recommendations/quiz");
  await expect(page).toHaveURL(/\/login$/);
});

test("opens quiz through the dashboard CTA", async ({ page }) => {
  await mockSession(page);
  await page.route(`${apiUrl}/dashboard`, async (route) => {
    await route.fulfill({ status: 200, json: emptyDashboard });
  });
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Começar quiz" }).click();

  await expect(page).toHaveURL(/\/recommendations\/quiz$/);
  await expect(
    page.getByRole("heading", { name: "Descubra sua próxima leitura" }),
  ).toBeVisible();
});

test("validates required choices and enforces per-step selection limits", async ({
  page,
}) => {
  await openQuiz(page);

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Selecione pelo menos uma opção.",
  );

  await answerCurrentStep(page, ["Fantasia", "Romance", "Mistério e suspense"]);
  await page.getByRole("button", { name: "Terror", exact: true }).click();

  await expect(page.getByRole("button", { name: "Terror" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByRole("alert")).toContainText(
    "Você pode selecionar no máximo 3 opções.",
  );
});

test("preserves selected answers when moving forward and backward", async ({
  page,
}) => {
  await openQuiz(page);

  await answerCurrentStep(page, ["Fantasia"]);
  await page.getByRole("button", { name: "Continuar" }).click();
  await answerCurrentStep(page, ["Relaxar"]);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Voltar" }).click();

  await expect(page.getByRole("button", { name: "Relaxar" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("button", { name: "Fantasia" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("validates and sends the complete contract payload, then shows success", async ({
  page,
}) => {
  const requestBodies: unknown[] = [];
  let finishRequest!: () => void;
  const requestGate = new Promise<void>((resolve) => {
    finishRequest = resolve;
  });

  await openQuiz(page);
  await page.route(`${apiUrl}/recommendations`, async (route) => {
    requestBodies.push(route.request().postDataJSON());
    await requestGate;
    await route.fulfill({ status: 200, json: recommendationResponse });
  });

  try {
    await completeQuiz(page);
    const submitButton = page.getByRole("button", {
      name: "Concluir quiz",
    });
    await expect(submitButton).toBeDisabled();
    await expect(
      page.getByRole("status").filter({
        hasText: "Enviando suas respostas…",
      }),
    ).toBeVisible();
    await submitButton.click({ force: true });
    expect(requestBodies).toHaveLength(1);
  } finally {
    finishRequest();
  }

  await expect(
    page.getByRole("heading", { name: "Seu perfil foi enviado" }),
  ).toBeVisible();
  expect(requestBodies[0]).toEqual({
    genres: ["FANTASY", "ROMANCE"],
    goal: "RELAX",
    bookLength: "SHORT",
    pace: "FAST",
    moods: ["LIGHT", "INSPIRING"],
    themes: ["ADVENTURE"],
    avoid: ["SERIES"],
  });
});

test("keeps the draft and retries the same payload after provider failure", async ({
  page,
}) => {
  const requestBodies: unknown[] = [];

  await openQuiz(page);
  await page.route(`${apiUrl}/recommendations`, async (route) => {
    requestBodies.push(route.request().postDataJSON());

    if (requestBodies.length === 1) {
      await route.fulfill({
        status: 502,
        json: {
          code: "INTEGRATION_ERROR",
          message: "Não foi possível gerar recomendações agora.",
        },
      });
      return;
    }

    await route.fulfill({ status: 200, json: recommendationResponse });
  });

  await completeQuiz(page);
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível gerar recomendações agora.",
  );
  await page.getByRole("button", { name: "Tentar novamente" }).click();

  await expect(
    page.getByRole("heading", { name: "Seu perfil foi enviado" }),
  ).toBeVisible();
  expect(requestBodies).toHaveLength(2);
  expect(requestBodies[1]).toEqual(requestBodies[0]);
  await page.getByRole("button", { name: "Revisar respostas" }).click();
  await expect(page.getByRole("button", { name: "Fantasia" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
