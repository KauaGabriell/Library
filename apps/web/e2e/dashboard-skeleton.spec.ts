import { expect, test } from "@playwright/test";

const apiUrl = "http://127.0.0.1:3000";

const publicUser = {
  id: "4a8a4d44-9639-4b19-8709-6915cc94623e",
  email: "reader@example.com",
  name: "Leitor",
  avatarUrl: null,
};

const dashboardResponse = {
  totalBooks: 0,
  countsByStatus: { WANT_TO_READ: 0, READING: 0, READ: 0 },
  averageRating: null,
  recentEntries: [],
  readingGoal: null,
  betterRating: null,
};

test("preserves dashboard layout with book skeletons while loading", async ({
  page,
}) => {
  let finishDashboardRequest!: () => void;
  const dashboardRequestGate = new Promise<void>((resolve) => {
    finishDashboardRequest = resolve;
  });

  await page.route(`${apiUrl}/auth/me`, async (route) => {
    await route.fulfill({ status: 200, json: publicUser });
  });
  await page.route(`${apiUrl}/dashboard`, async (route) => {
    await dashboardRequestGate;
    await route.fulfill({ status: 200, json: dashboardResponse });
  });

  try {
    await page.goto("/dashboard");

    await expect(page.getByRole("status")).toHaveText("Carregando painel...");
    await expect(
      page.getByRole("heading", { name: "Atividade recente" }),
    ).toBeVisible();
    await expect(page.getByTestId("book-skeleton")).toHaveCount(3);

    const bookSkeletonCover = page.getByTestId("book-skeleton-cover").first();
    await expect
      .poll(() =>
        bookSkeletonCover.evaluate(
          (element) => getComputedStyle(element).animationName,
        ),
      )
      .toBe("pulse");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect
      .poll(() =>
        bookSkeletonCover.evaluate(
          (element) => getComputedStyle(element).animationName,
        ),
      )
      .toBe("none");
  } finally {
    finishDashboardRequest();
  }

  await expect(page.getByRole("status")).toHaveCount(0);
});

test("renders the best-rated book and rating returned by the API", async ({
  page,
}) => {
  const dashboardWithBestRating = {
    ...dashboardResponse,
    totalBooks: 1,
    countsByStatus: { WANT_TO_READ: 0, READING: 0, READ: 1 },
    averageRating: 4,
    betterRating: {
      book: {
        googleBooksId: null,
        title: "Duna",
        authors: ["Frank Herbert"],
        description: null,
        coverUrl: null,
        language: "pt-BR",
        pageCount: 412,
      },
      rating: 4,
    },
  };

  await page.route(`${apiUrl}/auth/me`, async (route) => {
    await route.fulfill({ status: 200, json: publicUser });
  });
  await page.route(`${apiUrl}/dashboard`, async (route) => {
    await route.fulfill({ status: 200, json: dashboardWithBestRating });
  });

  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Melhor avaliado" }),
  ).toBeVisible();
  await expect(page.getByText("Duna")).toBeVisible();
  await expect(page.getByText("Frank Herbert")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "4 de 5 estrelas" }),
  ).toBeVisible();
});

test("links recent activity to the library and marks the quiz as upcoming", async ({
  page,
}) => {
  await page.route(`${apiUrl}/auth/me`, async (route) => {
    await route.fulfill({ status: 200, json: publicUser });
  });
  await page.route(`${apiUrl}/dashboard`, async (route) => {
    await route.fulfill({ status: 200, json: dashboardResponse });
  });

  await page.goto("/dashboard");

  await page.getByRole("link", { name: "Ver todas" }).click();
  await expect(page).toHaveURL(/\/library$/);

  await page.goto("/dashboard");
  await expect(page.getByText("Disponível em breve")).toBeVisible();
  await expect(page.getByRole("button", { name: "Começar quiz" })).toHaveCount(
    0,
  );
});

test("shows the update date for recent activity and falls back when a cover fails", async ({
  page,
}) => {
  const entry = {
    id: "9f2d0c63-1c44-42f0-b159-f1c5f36049c2",
    status: "READING",
    currentPage: 20,
    progressPercent: 10,
    rating: null,
    review: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-03T00:00:00.000Z",
    book: {
      googleBooksId: null,
      title: "Livro atualizado",
      authors: ["Autora"],
      description: null,
      coverUrl: null,
      language: "pt-BR",
      pageCount: 200,
    },
  };
  const dashboardWithRecentActivity = {
    ...dashboardResponse,
    totalBooks: 1,
    countsByStatus: { WANT_TO_READ: 0, READING: 1, READ: 0 },
    recentEntries: [entry],
    betterRating: {
      book: {
        ...entry.book,
        title: "Livro com capa inválida",
        coverUrl: "https://covers.example/broken.jpg",
      },
      rating: 5,
    },
  };

  await page.route(`${apiUrl}/auth/me`, async (route) => {
    await route.fulfill({ status: 200, json: publicUser });
  });
  await page.route(`${apiUrl}/dashboard`, async (route) => {
    await route.fulfill({ status: 200, json: dashboardWithRecentActivity });
  });
  await page.route("https://covers.example/broken.jpg", async (route) => {
    await route.abort();
  });

  await page.goto("/dashboard");

  await expect(
    page.getByText(/Atualizado 3(?: de)? jan(?: de)? 2025/),
  ).toBeVisible();
  const cover = page.getByRole("img", {
    name: "Capa de Livro com capa inválida",
  });
  await expect(cover).not.toHaveAttribute(
    "src",
    "https://covers.example/broken.jpg",
  );
  await expect
    .poll(() =>
      cover.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
});
