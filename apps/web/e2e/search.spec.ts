import {
  expect,
  type Page,
  type Request,
  type Route,
  test,
} from "@playwright/test";

const apiUrl = "http://127.0.0.1:3000";

const publicUser = {
  id: "4a8a4d44-9639-4b19-8709-6915cc94623e",
  email: "reader@example.com",
  name: "Leitor",
  avatarUrl: null,
};

const dune = {
  googleBooksId: "dune-1",
  title: "Duna",
  authors: ["Frank Herbert"],
  description: null,
  coverUrl: null,
  language: "pt-BR",
  pageCount: 688,
};

const foundation = {
  ...dune,
  googleBooksId: "foundation-1",
  title: "Fundação",
  authors: ["Isaac Asimov"],
};

async function mockSession(page: Page) {
  await page.route(`${apiUrl}/auth/me`, async (route) => {
    await route.fulfill({ status: 200, json: publicUser });
  });
}

async function mockSearch(
  page: Page,
  handler: (route: Route, requestUrl: URL) => Promise<void>,
) {
  await page.route(`${apiUrl}/books/search**`, async (route) => {
    await handler(route, new URL(route.request().url()));
  });
}

function getSearchUrl(request: Request) {
  return new URL(request.url());
}

test("requires two characters, debounces, sends normalized params, and renders API results", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  const requests: URL[] = [];

  page.on("pageerror", (error) => pageErrors.push(error));
  await page.clock.install();
  await mockSession(page);
  await mockSearch(page, async (route, url) => {
    requests.push(url);
    await route.fulfill({
      status: 200,
      json: { items: [dune, foundation], page: 1, nextPage: 2 },
    });
  });

  await page.goto("/search");
  const searchInput = page.getByRole("searchbox", { name: /buscar livros/i });

  await searchInput.fill("D");
  await page.clock.runFor(350);
  await expect(
    page.getByText(
      "Digite pelo menos 2 caracteres para pesquisar no catálogo.",
    ),
  ).toBeVisible();
  expect(requests).toHaveLength(0);

  await searchInput.fill("  Duna  ");
  await page.clock.runFor(299);
  expect(requests).toHaveLength(0);
  await page.clock.runFor(1);
  await expect.poll(() => requests.length).toBe(1);

  expect(requests[0]?.searchParams.get("q")).toBe("Duna");
  expect(requests[0]?.searchParams.get("page")).toBe("1");
  expect(requests[0]?.searchParams.get("pageSize")).toBe("10");
  await expect(page.getByRole("heading", { name: "Duna" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fundação" })).toBeVisible();
  await expect(page.getByText("2 resultados encontrados")).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("explains the Google Books catalog in the initial search state", async ({
  page,
}) => {
  const requests: URL[] = [];

  await mockSession(page);
  await mockSearch(page, async (route, url) => {
    requests.push(url);
    await route.fulfill({
      status: 200,
      json: { items: [], page: 1, nextPage: null },
    });
  });

  await page.goto("/search");

  await expect(
    page.getByRole("heading", { name: "Seu próximo livro está por aí" }),
  ).toBeVisible();
  await expect(
    page.getByText("Esta busca consulta o catálogo do Google Livros."),
  ).toBeVisible();

  await page.getByText("Não encontrou seu livro?").click();
  await expect(
    page.getByText(/livros disponíveis no catálogo online do Google Livros/i),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ir para minha biblioteca" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(
    page.getByRole("heading", { name: "Minha biblioteca" }),
  ).toBeVisible();
  expect(requests).toHaveLength(0);
});

test("search button submits the current term without waiting for debounce", async ({
  page,
}) => {
  const requests: URL[] = [];

  await page.clock.install();
  await mockSession(page);
  await mockSearch(page, async (route, url) => {
    requests.push(url);
    await route.fulfill({
      status: 200,
      json: { items: [dune], page: 1, nextPage: null },
    });
  });

  await page.goto("/search");
  const searchInput = page.getByRole("searchbox", { name: /buscar livros/i });
  await expect(searchInput).toBeVisible();
  const pageTime = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(pageTime + 10_000));
  await searchInput.fill("Duna");
  await page.getByRole("button", { name: "Pesquisar no catálogo" }).click();

  await expect.poll(() => requests.length, { timeout: 1_000 }).toBe(1);
  expect(requests[0]?.searchParams.get("q")).toBe("Duna");
  await page.clock.fastForward(300);
  await expect(page.getByRole("heading", { name: "Duna" })).toBeVisible();
  expect(requests).toHaveLength(1);
});

test("shows empty state when catalog returns no books", async ({ page }) => {
  await mockSession(page);
  await mockSearch(page, async (route) => {
    await route.fulfill({
      status: 200,
      json: { items: [], page: 1, nextPage: null },
    });
  });

  await page.goto("/search");
  await page
    .getByRole("searchbox", { name: /buscar livros/i })
    .fill("Inexistente");

  await expect(
    page.getByRole("heading", { name: "Nenhum livro encontrado" }),
  ).toBeVisible();
});

test("shows an error and retries catalog search when requested", async ({
  page,
}) => {
  let requestCount = 0;

  await mockSession(page);
  await mockSearch(page, async (route) => {
    requestCount += 1;
    if (requestCount === 1) {
      await route.fulfill({
        status: 502,
        json: { code: "INTEGRATION_ERROR", message: "Provider unavailable" },
      });
      return;
    }

    await route.fulfill({
      status: 200,
      json: { items: [dune], page: 1, nextPage: null },
    });
  });

  await page.goto("/search");
  await page.getByRole("searchbox", { name: /buscar livros/i }).fill("Duna");

  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível buscar livros. Tente novamente.",
  );
  expect(requestCount).toBe(1);

  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("heading", { name: "Duna" })).toBeVisible();
  expect(requestCount).toBe(2);
});

test("uses nextPage and previous page navigation without fixed page numbers", async ({
  page,
}) => {
  const requests: URL[] = [];

  await mockSession(page);
  await mockSearch(page, async (route, url) => {
    requests.push(url);
    const currentPage = Number(url.searchParams.get("page"));
    const book =
      currentPage === 3
        ? { ...dune, title: "Duna — página 3" }
        : currentPage === 2
          ? { ...dune, title: "Duna — página 2" }
          : dune;

    await route.fulfill({
      status: 200,
      json: {
        items: [book],
        page: currentPage,
        nextPage: currentPage === 1 ? 3 : null,
      },
    });
  });

  await page.goto("/search");
  const firstPageRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/books/search") &&
      getSearchUrl(request).searchParams.get("page") === "1",
  );
  await page.getByRole("searchbox", { name: /buscar livros/i }).fill("Duna");
  await firstPageRequest;

  const pagination = page.getByRole("navigation", {
    name: "Paginação dos resultados",
  });
  await expect(
    pagination.getByRole("button", { name: "Página anterior" }),
  ).toBeDisabled();
  await expect(
    pagination.getByRole("button", { name: "Próxima página" }),
  ).toBeEnabled();
  await expect(
    pagination.getByRole("button", { name: "2", exact: true }),
  ).toHaveCount(0);

  const thirdPageRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/books/search") &&
      getSearchUrl(request).searchParams.get("page") === "3",
  );
  await pagination.getByRole("button", { name: "Próxima página" }).click();
  await thirdPageRequest;
  await expect(
    page.getByRole("heading", { name: "Duna — página 3" }),
  ).toBeVisible();
  await expect(
    pagination.getByRole("button", { name: "Próxima página" }),
  ).toBeDisabled();
  await expect(
    pagination.getByRole("button", { name: "Página anterior" }),
  ).toBeEnabled();

  const secondPageRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/books/search") &&
      getSearchUrl(request).searchParams.get("page") === "2",
  );
  await pagination.getByRole("button", { name: "Página anterior" }).click();
  await secondPageRequest;
  await expect(
    page.getByRole("heading", { name: "Duna — página 2" }),
  ).toBeVisible();

  await pagination.getByRole("button", { name: "Página anterior" }).click();
  await expect(page.getByRole("heading", { name: "Duna" })).toBeVisible();
  await expect(
    pagination.getByRole("button", { name: "Página anterior" }),
  ).toBeDisabled();

  await pagination.getByRole("button", { name: "Próxima página" }).click();
  await expect(
    page.getByRole("heading", { name: "Duna — página 3" }),
  ).toBeVisible();

  const firstPageAfterNewQuery = page.waitForRequest(
    (request) =>
      request.url().includes("/books/search") &&
      getSearchUrl(request).searchParams.get("q") === "Fundação" &&
      getSearchUrl(request).searchParams.get("page") === "1",
  );
  await page
    .getByRole("searchbox", { name: /buscar livros/i })
    .fill("Fundação");
  await firstPageAfterNewQuery;
  expect(requests.at(-1)?.searchParams.get("page")).toBe("1");
});

test("adds a Google Books result to the library and marks it as added", async ({
  page,
}) => {
  let createBody: unknown;

  await mockSession(page);
  await mockSearch(page, async (route) => {
    await route.fulfill({
      status: 200,
      json: { items: [dune], page: 1, nextPage: null },
    });
  });
  await page.route(`${apiUrl}/library`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    createBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      json: {
        id: "dune-entry",
        status: "WANT_TO_READ",
        currentPage: 0,
        progressPercent: null,
        rating: null,
        review: null,
        book: dune,
        createdAt: "2026-01-01T12:00:00.000Z",
        updatedAt: "2026-01-01T12:00:00.000Z",
      },
    });
  });

  await page.goto("/search");
  await page.getByRole("searchbox", { name: /buscar livros/i }).fill("Duna");
  await expect(page.getByRole("heading", { name: "Duna" })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar à biblioteca" }).click();

  expect(createBody).toEqual({
    source: "GOOGLE_BOOKS",
    googleBooksId: dune.googleBooksId,
  });
  await expect(
    page.getByRole("button", { name: "Adicionado à biblioteca" }),
  ).toBeDisabled();
});

test("shows an added book in the library and dashboard", async ({ page }) => {
  let bookAdded = false;
  let libraryRequestCount = 0;
  let dashboardRequestCount = 0;
  const libraryEntry = {
    id: "dune-entry",
    status: "WANT_TO_READ",
    currentPage: 0,
    progressPercent: null,
    rating: null,
    review: null,
    book: dune,
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-01T12:00:00.000Z",
  };

  await mockSession(page);
  await mockSearch(page, async (route) => {
    await route.fulfill({
      status: 200,
      json: { items: [dune], page: 1, nextPage: null },
    });
  });
  await page.route(`${apiUrl}/library**`, async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());

    if (method === "GET" && url.pathname === "/library") {
      libraryRequestCount += 1;
      await route.fulfill({
        status: 200,
        json: {
          items: bookAdded ? [libraryEntry] : [],
          page: 1,
          pageSize: 8,
          totalItems: bookAdded ? 1 : 0,
          totalPages: bookAdded ? 1 : 0,
          countsByStatus: {
            WANT_TO_READ: bookAdded ? 1 : 0,
            READING: 0,
            READ: 0,
          },
        },
      });
      return;
    }

    if (method === "POST" && url.pathname === "/library") {
      bookAdded = true;
      await route.fulfill({ status: 201, json: libraryEntry });
      return;
    }

    await route.continue();
  });
  await page.route(`${apiUrl}/dashboard`, async (route) => {
    dashboardRequestCount += 1;
    await route.fulfill({
      status: 200,
      json: {
        totalBooks: bookAdded ? 1 : 0,
        countsByStatus: {
          WANT_TO_READ: bookAdded ? 1 : 0,
          READING: 0,
          READ: 0,
        },
        averageRating: null,
        recentEntries: bookAdded ? [libraryEntry] : [],
        readingGoal: null,
        betterRating: null,
      },
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "Sua biblioteca começa com um livro" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByText("Sua biblioteca ainda está vazia.")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Buscar livros" })
    .click();
  await page.getByRole("searchbox", { name: /buscar livros/i }).fill("Duna");
  await expect(page.getByRole("heading", { name: "Duna" })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar à biblioteca" }).click();
  await expect(
    page.getByRole("button", { name: "Adicionado à biblioteca" }),
  ).toBeDisabled();

  await page.getByRole("link", { name: "Minha biblioteca" }).click();
  await expect(page.getByRole("rowheader", { name: /Duna/ })).toBeVisible();
  await expect.poll(() => libraryRequestCount).toBeGreaterThan(1);

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Duna" })).toBeVisible();
  const summary = page.getByRole("region", { name: "Resumo da biblioteca" });
  await expect(summary.getByText("1", { exact: true })).toBeVisible();
  await expect.poll(() => dashboardRequestCount).toBeGreaterThan(1);
});

test("offers manual book creation when the catalog has no matching result", async ({
  page,
}) => {
  let createBody: Record<string, unknown> | undefined;

  await mockSession(page);
  await mockSearch(page, async (route) => {
    await route.fulfill({
      status: 200,
      json: { items: [], page: 1, nextPage: null },
    });
  });
  await page.route(`${apiUrl}/library`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    createBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      json: {
        id: "manual-entry",
        status: "WANT_TO_READ",
        currentPage: 0,
        progressPercent: null,
        rating: null,
        review: null,
        book: {
          googleBooksId: null,
          title: "Livro independente",
          authors: [],
          description: null,
          coverUrl: null,
          language: null,
          pageCount: null,
        },
        createdAt: "2026-01-01T12:00:00.000Z",
        updatedAt: "2026-01-01T12:00:00.000Z",
      },
    });
  });

  await page.goto("/search");
  await page
    .getByRole("searchbox", { name: /buscar livros/i })
    .fill("Livro independente");
  await expect(
    page.getByRole("heading", { name: "Nenhum livro encontrado" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Adicionar livro manualmente" })
    .click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título").fill("Livro independente");
  await dialog
    .getByRole("button", { name: "Adicionar livro", exact: true })
    .click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status")).toContainText(
    "foi adicionado à sua biblioteca",
  );
  expect(createBody).toEqual({
    source: "MANUAL",
    title: "Livro independente",
    authors: [],
  });
});

test("explains that a Google book is already in the user's library on conflict", async ({
  page,
}) => {
  await mockSession(page);
  await mockSearch(page, async (route) => {
    await route.fulfill({
      status: 200,
      json: { items: [dune], page: 1, nextPage: null },
    });
  });
  await page.route(`${apiUrl}/library`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 409,
        json: { code: "CONFLICT", message: "Entrada já existente" },
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/search");
  await page.getByRole("searchbox", { name: /buscar livros/i }).fill("Duna");
  await page.getByRole("button", { name: "Adicionar à biblioteca" }).click();
  await expect(
    page.getByText("Este livro já está na sua biblioteca."),
  ).toBeVisible();
});
