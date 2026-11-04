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
      title: "A biblioteca da meia-noite",
      author: "Matt Haig",
      justification: "Uma história envolvente sobre escolhas e possibilidades.",
    },
    {
      title: "O oceano no fim do caminho",
      author: "Neil Gaiman",
      justification: "Fantasia contemplativa com atmosfera acolhedora.",
    },
    {
      title: "A vida invisível de Addie LaRue",
      author: "V. E. Schwab",
      justification: "Uma leitura emocional sobre memória e identidade.",
    },
  ],
};
function savedLibraryEntry(title: string) {
  const suggestion = recommendationResponse.recommendations.find(
    (item) => item.title === title,
  );
  if (!suggestion) throw new Error("Unknown test book");
  return {
    id: "29c9b5b5-1f4d-4a9d-a59b-d095ad08f27c",
    status: "WANT_TO_READ",
    currentPage: 0,
    progressPercent: null,
    rating: null,
    review: null,
    book: {
      googleBooksId: null,
      title: suggestion.title,
      authors: [suggestion.author],
      description: null,
      coverUrl: null,
      language: null,
      pageCount: null,
    },
    createdAt: "2026-11-03T12:00:00.000Z",
    updatedAt: "2026-11-03T12:00:00.000Z",
  };
}

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
  await expect(page.getByRole("heading", { name: "Quiz de IA" })).toBeVisible();
}

async function chooseOption(page: Page, option: string) {
  await page.locator("label").filter({ hasText: option }).click();
}

async function answerCurrentStep(page: Page, options: string[]) {
  for (const option of options) await chooseOption(page, option);
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

test("renders the first quiz step accessibly and supports keyboard selection on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockSession(page);
  await page.route(`${apiUrl}/dashboard`, async (route) => {
    await route.fulfill({ status: 200, json: emptyDashboard });
  });
  await page.goto("/recommendations/quiz");

  await expect(page.getByRole("heading", { name: "Quiz de IA" })).toBeVisible();
  await expect(
    page.getByText("Pergunta 1 de 7", { exact: true }),
  ).toBeVisible();

  const fantasyOption = page.locator(
    'input[type="checkbox"][name="genres"][value="FANTASY"]',
  );
  await fantasyOption.evaluate((element: HTMLInputElement) => element.focus());
  await expect(fantasyOption).toBeFocused();
  await page.keyboard.press("Space");
  await expect(fantasyOption).toBeChecked();

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
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
  await expect(page.getByRole("heading", { name: "Quiz de IA" })).toBeVisible();
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
  await chooseOption(page, "Terror");

  await expect(
    page.getByRole("checkbox", { name: "Terror", exact: true }),
  ).not.toBeChecked();
  await expect(page.getByRole("alert")).toContainText(
    "Você pode selecionar no máximo 3 opções.",
  );
  await chooseOption(page, "Sem preferência");
  await expect(
    page.getByRole("checkbox", { name: "Sem prefer\u00eancia", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Fantasia", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Romance", exact: true }),
  ).not.toBeChecked();

  await chooseOption(page, "Romance");
  await expect(
    page.getByRole("checkbox", { name: "Sem prefer\u00eancia", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Romance", exact: true }),
  ).toBeChecked();
});

test("keeps NONE exclusive from common restrictions", async ({ page }) => {
  await openQuiz(page);

  for (const options of [
    ["Fantasia"],
    ["Relaxar"],
    ["Curto"],
    ["\u00C1gil"],
    ["Leve"],
    ["Aventura"],
  ]) {
    await answerCurrentStep(page, options);
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  const series = page.getByRole("checkbox", {
    name: "S\u00E9ries",
    exact: true,
  });
  const none = page.getByRole("checkbox", {
    name: "Nada espec\u00EDfico",
    exact: true,
  });
  await chooseOption(page, "Séries");
  await chooseOption(page, "Nada específico");

  await expect(none).toBeChecked();
  await expect(series).not.toBeChecked();

  await chooseOption(page, "Séries");

  await expect(series).toBeChecked();
  await expect(none).not.toBeChecked();
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

  await expect(
    page.getByRole("radio", { name: "Relaxar", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Fantasia", exact: true }),
  ).toBeChecked();
});

test("renders three recommendation cards with public book details", async ({
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
    page.getByRole("heading", { name: "Encontramos estas obras para você" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Encontramos estas obras para você" }),
  ).toBeFocused();
  const recommendations = page.getByRole("region", {
    name: "Livros recomendados",
  });
  await expect(recommendations.getByRole("article")).toHaveCount(3);
  await expect(
    recommendations.getByRole("heading", {
      name: "A biblioteca da meia-noite",
    }),
  ).toBeVisible();
  await expect(
    recommendations.getByText(
      "Uma história envolvente sobre escolhas e possibilidades.",
    ),
  ).toBeVisible();
  await expect(
    recommendations.getByRole("img", {
      name: "Capa indisponível para A biblioteca da meia-noite",
    }),
  ).toHaveAttribute("src", /book-cover-placeholder\.jpg$/);
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

test("saves selected recommendation and isolates success to its card", async ({
  page,
}) => {
  const libraryRequests: unknown[] = [];

  await openQuiz(page);
  await page.route(`${apiUrl}/recommendations`, async (route) => {
    await route.fulfill({ status: 200, json: recommendationResponse });
  });
  await page.route(`${apiUrl}/library`, async (route) => {
    const payload = route.request().postDataJSON() as {
      source: string;
      title: string;
      authors: string[];
    };
    libraryRequests.push(payload);
    await route.fulfill({
      status: 201,
      json: savedLibraryEntry(payload.title),
    });
  });

  await completeQuiz(page);

  const recommendations = page.getByRole("region", {
    name: "Livros recomendados",
  });
  const firstCard = recommendations
    .getByRole("article")
    .filter({ hasText: "A biblioteca da meia-noite" });
  const secondCard = recommendations
    .getByRole("article")
    .filter({ hasText: "O oceano no fim do caminho" });

  await firstCard
    .getByRole("button", { name: "Adicionar à biblioteca" })
    .click();

  await expect(
    firstCard.getByRole("button", { name: "Na biblioteca · Quero ler" }),
  ).toBeDisabled();
  await expect(
    secondCard.getByRole("button", { name: "Adicionar à biblioteca" }),
  ).toBeEnabled();
  expect(libraryRequests).toEqual([
    {
      source: "MANUAL",
      title: "A biblioteca da meia-noite",
      authors: ["Matt Haig"],
    },
  ]);
});

test("retries a transient error when saving a recommendation", async ({
  page,
}) => {
  const libraryRequests: unknown[] = [];

  await openQuiz(page);
  await page.route(`${apiUrl}/recommendations`, async (route) => {
    await route.fulfill({ status: 200, json: recommendationResponse });
  });
  await page.route(`${apiUrl}/library`, async (route) => {
    const payload = route.request().postDataJSON() as {
      source: string;
      title: string;
      authors: string[];
    };
    libraryRequests.push(payload);

    if (libraryRequests.length === 1) {
      await route.fulfill({
        status: 502,
        json: {
          code: "INTEGRATION_ERROR",
          message: "Não foi possível adicionar este livro agora.",
        },
      });
      return;
    }

    await route.fulfill({
      status: 201,
      json: savedLibraryEntry(payload.title),
    });
  });

  await completeQuiz(page);

  const recommendations = page.getByRole("region", {
    name: "Livros recomendados",
  });
  const firstCard = recommendations
    .getByRole("article")
    .filter({ hasText: "A biblioteca da meia-noite" });
  await firstCard
    .getByRole("button", { name: "Adicionar à biblioteca" })
    .click();
  await expect(firstCard.getByRole("alert")).toContainText(
    "Não foi possível adicionar este livro agora.",
  );

  await firstCard.getByRole("button", { name: "Tentar novamente" }).click();

  await expect(
    firstCard.getByRole("button", { name: "Na biblioteca · Quero ler" }),
  ).toBeDisabled();
  expect(libraryRequests).toHaveLength(2);
  expect(libraryRequests[1]).toEqual(libraryRequests[0]);
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
    page.getByRole("heading", { name: "Encontramos estas obras para você" }),
  ).toBeVisible();
  expect(requestBodies).toHaveLength(2);
  expect(requestBodies[1]).toEqual(requestBodies[0]);
  await page.getByRole("button", { name: "Refazer quiz" }).click();
  await expect(
    page.getByText("Pergunta 1 de 7", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quiz de IA" })).toBeFocused();
  await expect(
    page.getByRole("checkbox", { name: "Fantasia", exact: true }),
  ).not.toBeChecked();
});
