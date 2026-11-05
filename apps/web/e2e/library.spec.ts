import { expect, type Page, type Route, test } from "@playwright/test";

const apiUrl = "http://127.0.0.1:3000";

const publicUser = {
  id: "4a8a4d44-9639-4b19-8709-6915cc94623e",
  email: "reader@example.com",
  name: "Leitor",
  avatarUrl: null,
};

type EntryFixture = {
  id: string;
  status: string;
  currentPage: number;
  progressPercent: number | null;
  rating: number | null;
  review: string | null;
  book: {
    googleBooksId: string | null;
    title: string;
    authors: string[];
    description: string | null;
    coverUrl: string | null;
    language: string | null;
    pageCount: number | null;
  };
  createdAt: string;
  updatedAt: string;
};

type ManualBookPayload = {
  source: "MANUAL";
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  language?: string;
  pageCount?: number;
};

function entry(
  id: number,
  title = `Livro ${id}`,
  status = "READING",
  rating: number | null = null,
  bookOverrides: Partial<EntryFixture["book"]> = {},
): EntryFixture {
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    status,
    currentPage: 25,
    progressPercent: 25,
    rating,
    review: null,
    book: {
      googleBooksId: `google-${id}`,
      title,
      authors: [`Autor ${id}`],
      description: null,
      coverUrl: null as string | null,
      language: "pt-BR",
      pageCount: 100,
      ...bookOverrides,
    },
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-02T12:00:00.000Z",
  };
}

function listResponse({
  items,
  page = 1,
  totalItems = items.length,
  pageSize = 8,
  countsByStatus = { WANT_TO_READ: 2, READING: 3, READ: 1 },
}: {
  items: EntryFixture[];
  page?: number;
  totalItems?: number;
  pageSize?: number;
  countsByStatus?: { WANT_TO_READ: number; READING: number; READ: number };
}) {
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    countsByStatus,
  };
}

async function mockSession(page: Page) {
  await page.route(`${apiUrl}/auth/me`, async (route) => {
    await route.fulfill({ status: 200, json: publicUser });
  });
}

async function mockLibrary(
  page: Page,
  handler: (route: Route, url: URL) => Promise<void>,
) {
  await page.route(`${apiUrl}/library**`, async (route) => {
    if (
      route.request().method() !== "GET" ||
      new URL(route.request().url()).pathname !== "/library"
    ) {
      await route.continue();
      return;
    }

    await handler(route, new URL(route.request().url()));
  });
}

function manualEntry(id: number, payload: ManualBookPayload): EntryFixture {
  const created = entry(id, payload.title, "WANT_TO_READ", null, {
    googleBooksId: null,
    authors: payload.authors,
    description: payload.description ?? null,
    coverUrl: payload.coverUrl ?? null,
    language: payload.language ?? null,
    pageCount: payload.pageCount ?? null,
  });

  return { ...created, currentPage: 0, progressPercent: null };
}

async function mockManualLibrary(
  page: Page,
  onCreate?: (
    route: Route,
    payload: ManualBookPayload,
    entries: EntryFixture[],
  ) => Promise<void>,
) {
  const entries: EntryFixture[] = [];
  const requests: ManualBookPayload[] = [];

  await page.route(`${apiUrl}/library**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname !== "/library") {
      await route.continue();
      return;
    }

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        json: listResponse({
          items: [...entries],
          totalItems: entries.length,
          countsByStatus: {
            WANT_TO_READ: entries.filter(
              (item) => item.status === "WANT_TO_READ",
            ).length,
            READING: entries.filter((item) => item.status === "READING").length,
            READ: entries.filter((item) => item.status === "READ").length,
          },
        }),
      });
      return;
    }

    if (request.method() === "POST") {
      const payload = request.postDataJSON() as ManualBookPayload;
      requests.push(payload);

      if (onCreate) {
        await onCreate(route, payload, entries);
        return;
      }

      await route.fulfill({
        status: 500,
        json: { code: "INTERNAL_ERROR", message: "Criação não simulada." },
      });
      return;
    }

    await route.continue();
  });

  return { entries, requests };
}

test("searches, filters, sorts, paginates, and switches views from shared server data", async ({
  page,
}) => {
  const requests: URL[] = [];
  await page.clock.install();
  await mockSession(page);
  await mockLibrary(page, async (route, url) => {
    requests.push(url);
    const currentPage = Number(url.searchParams.get("page"));
    const pageSize = Number(url.searchParams.get("pageSize"));
    const firstItem = (currentPage - 1) * pageSize + 1;
    const itemCount = Math.min(pageSize, 12 - firstItem + 1);
    const items = Array.from({ length: itemCount }, (_, index) => {
      const itemNumber = firstItem + index;
      return entry(itemNumber, `Duna ${itemNumber}`);
    });
    await route.fulfill({
      status: 200,
      json: listResponse({
        items,
        page: currentPage,
        pageSize,
        totalItems: 12,
      }),
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "Minha biblioteca" }),
  ).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /Duna 1/ })).toBeVisible();
  await expect(page.getByRole("option", { name: "Lendo (3)" })).toBeAttached();
  await expect(
    page.getByRole("table", { name: "Livros na biblioteca" }).getByRole("row"),
  ).toHaveCount(9);
  expect(requests[0]?.searchParams.get("pageSize")).toBe("8");

  const search = page.getByRole("searchbox", { name: "Buscar na biblioteca" });
  const requestsBeforeShortSearch = requests.length;
  await search.fill("D");
  await page.clock.runFor(350);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Digite pelo menos 2 caracteres" }),
  ).toContainText("Digite pelo menos 2 caracteres");
  expect(requests.filter((url) => url.searchParams.has("q"))).toHaveLength(0);
  expect(requests.length).toBe(requestsBeforeShortSearch);

  await search.fill("  Duna  ");
  await page.clock.runFor(350);
  await expect
    .poll(() => requests.some((url) => url.searchParams.get("q") === "Duna"))
    .toBe(true);
  await expect(page.getByRole("option", { name: "Lendo (3)" })).toBeAttached();
  const searchRequest = requests
    .filter((url) => url.searchParams.get("q") === "Duna")
    .at(-1);
  expect(searchRequest?.searchParams.get("page")).toBe("1");

  await page.getByLabel("Filtrar por status").selectOption("READING");
  await expect
    .poll(() => requests.at(-1)?.searchParams.get("status"))
    .toBe("READING");
  await expect(
    page.getByRole("option", { name: "Quero ler (2)" }),
  ).toBeAttached();
  await page.getByLabel("Ordenar por").selectOption("createdAt");
  await expect
    .poll(() => requests.at(-1)?.searchParams.get("sortBy"))
    .toBe("createdAt");

  await page.getByRole("button", { name: "Próxima página" }).click();
  await expect(page.getByRole("rowheader", { name: /Duna 9/ })).toBeVisible();
  expect(requests.at(-1)?.searchParams.get("page")).toBe("2");
  await expect(page.getByText("Página 2 de 2")).toBeVisible();

  const requestCountBeforeSwitch = requests.length;
  await page.getByRole("button", { name: "Visualização em cards" }).click();
  await expect(
    page.getByRole("button", { name: "Visualização em cards" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Duna 9" })).toBeVisible();
  expect(requests).toHaveLength(requestCountBeforeSwitch);

  await page.getByRole("button", { name: "Visualização em tabela" }).click();
  await expect(
    page.getByRole("table", { name: "Livros na biblioteca" }),
  ).toBeVisible();
});

test("renders the editorial library table with book details, status chips, star ratings, and icon actions", async ({
  page,
}) => {
  const ratedBook = {
    ...entry(1, "Cem Anos de Solidão", "READ"),
    rating: 5,
    createdAt: "2025-01-12T12:00:00.000Z",
    updatedAt: "2026-01-02T12:00:00.000Z",
    book: {
      ...entry(1).book,
      title: "Cem Anos de Solidão",
      authors: ["Gabriel García Márquez"],
      coverUrl: "https://covers.example.test/cem-anos.jpg",
    },
  };
  const fourStarBook = {
    ...entry(2, "O Morro dos Ventos Uivantes", "READING"),
    rating: 4,
    book: {
      ...entry(2).book,
      title: "O Morro dos Ventos Uivantes",
      authors: ["Emily Brontë"],
    },
  };
  const unratedBook = entry(3, "Duna", "WANT_TO_READ");

  await mockSession(page);
  await mockLibrary(page, async (route) => {
    await route.fulfill({
      status: 200,
      json: listResponse({
        items: [ratedBook, fourStarBook, unratedBook],
        countsByStatus: { WANT_TO_READ: 1, READING: 1, READ: 1 },
      }),
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/library");

  const table = page.getByRole("table", { name: "Livros na biblioteca" });
  await expect(table.getByRole("columnheader")).toHaveText([
    "Livro",
    "Adicionado",
    "Estado",
    "Nota",
    "Ações",
  ]);

  const cemAnosRow = table.getByRole("row", { name: /Cem Anos de Solidão/ });
  await expect(cemAnosRow.getByRole("rowheader")).toContainText(
    "Gabriel García Márquez",
  );
  await expect(
    cemAnosRow.getByRole("img", {
      name: "Capa de Cem Anos de Solidão, por Gabriel García Márquez",
    }),
  ).toBeVisible();
  await expect(
    cemAnosRow.getByText("12 jan 2025", { exact: true }),
  ).toBeVisible();
  await expect(
    cemAnosRow.getByRole("cell").nth(1).getByText("Lido", { exact: true }),
  ).toBeVisible();
  const fiveStarRating = cemAnosRow.getByRole("img", {
    name: "Avaliação 5 de 5",
  });
  await expect(fiveStarRating.locator("svg")).toHaveCount(5);
  await expect(fiveStarRating.locator('svg[fill="currentColor"]')).toHaveCount(
    5,
  );
  await expect(
    cemAnosRow.getByRole("button", {
      name: "Editar status de Cem Anos de Solidão",
    }),
  ).toBeVisible();
  await expect(
    cemAnosRow.getByRole("button", {
      name: "Remover Cem Anos de Solidão da biblioteca",
    }),
  ).toBeVisible();

  const fourStarRow = table.getByRole("row", {
    name: /O Morro dos Ventos Uivantes/,
  });
  const fourStarRating = fourStarRow.getByRole("img", {
    name: "Avaliação 4 de 5",
  });
  await expect(fourStarRating.locator('svg[fill="currentColor"]')).toHaveCount(
    4,
  );
  await expect(fourStarRating.locator('svg[fill="none"]')).toHaveCount(1);
  const fourStarStatusCell = fourStarRow.getByRole("cell").nth(1);
  await expect(
    fourStarStatusCell.getByText("Lendo", { exact: true }),
  ).toBeVisible();
  const wantToReadRow = table.getByRole("row", { name: /Duna/ });
  await expect(
    wantToReadRow
      .getByRole("cell")
      .nth(1)
      .getByText("Quero ler", { exact: true }),
  ).toBeVisible();
  await expect(table.getByRole("img", { name: "Sem avaliação" })).toBeVisible();
});

test("shows cards below the desktop breakpoint without horizontal overflow", async ({
  page,
}) => {
  await mockSession(page);
  await mockLibrary(page, async (route) => {
    await route.fulfill({
      status: 200,
      json: listResponse({ items: [entry(1)] }),
    });
  });

  await page.goto("/library");

  for (const width of [320, 640, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);

    if (width < 1024) {
      await expect(
        page.getByRole("table", { name: "Livros na biblioteca" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("article", { name: "Livro 1" }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("table", { name: "Livros na biblioteca" }),
      ).toBeVisible();
    }
  }
});

test("renders compact title-overlay cards with API star ratings and icon actions", async ({
  page,
}) => {
  const fourStarEntry = {
    ...entry(1, "Duna", "READ"),
    rating: 4,
    book: {
      ...entry(1, "Duna").book,
      authors: ["Frank Herbert"],
    },
  };
  const unratedEntry = entry(2, "Fundação", "WANT_TO_READ");

  await mockSession(page);
  await mockLibrary(page, async (route) => {
    await route.fulfill({
      status: 200,
      json: listResponse({ items: [fourStarEntry, unratedEntry] }),
    });
  });

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/library");

  const duneCard = page.getByRole("article", { name: "Duna" });
  await expect(duneCard.locator("img")).toBeVisible();
  await expect(duneCard.getByText("Frank Herbert")).toBeVisible();
  await expect(duneCard.getByRole("heading", { name: "Duna" })).toBeVisible();
  const detailsButton = duneCard.getByRole("button", {
    name: /Ver detalhes de Duna.*Status de leitura: Lido/,
  });
  await expect(detailsButton).toBeVisible();
  await expect(detailsButton.getByText("Lido", { exact: true })).toBeVisible();
  const cardBounds = await duneCard.boundingBox();
  expect(cardBounds).not.toBeNull();
  expect(cardBounds?.width).toBeLessThanOrEqual(288);
  await expect(
    duneCard.getByRole("button", { name: "Editar status de Duna" }),
  ).toBeVisible();
  await expect(
    duneCard.getByRole("button", { name: "Remover Duna da biblioteca" }),
  ).toBeVisible();

  const fourStars = duneCard.getByRole("img", { name: "Avaliação 4 de 5" });
  await expect(fourStars.locator('svg[fill="currentColor"]')).toHaveCount(4);
  await expect(fourStars.locator('svg[fill="none"]')).toHaveCount(1);

  const foundationCard = page.getByRole("article", { name: "Fundação" });
  const noRating = foundationCard.getByRole("img", { name: "Sem avaliação" });
  await expect(noRating.locator('svg[fill="none"]')).toHaveCount(5);
  await expect(
    foundationCard.getByText("Sem avaliação", { exact: true }),
  ).toBeVisible();
});

test("shows eight cards per page in four desktop columns", async ({ page }) => {
  await mockSession(page);
  await mockLibrary(page, async (route, url) => {
    const currentPage = Number(url.searchParams.get("page"));
    const pageSize = Number(url.searchParams.get("pageSize"));
    const totalItems = 10;
    const firstItem = (currentPage - 1) * pageSize + 1;
    const itemCount = Math.min(pageSize, totalItems - firstItem + 1);
    const items = Array.from({ length: itemCount }, (_, index) => {
      const itemNumber = firstItem + index;
      return entry(itemNumber);
    });

    await route.fulfill({
      status: 200,
      json: listResponse({
        items,
        page: currentPage,
        pageSize,
        totalItems,
      }),
    });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  const initialLibraryRequest = page.waitForRequest((request) => {
    const requestUrl = new URL(request.url());

    return (
      request.method() === "GET" &&
      requestUrl.origin === apiUrl &&
      requestUrl.pathname === "/library"
    );
  });
  await page.goto("/library");
  const request = await initialLibraryRequest;
  expect(new URL(request.url()).searchParams.get("pageSize")).toBe("8");

  await page.getByRole("button", { name: "Visualização em cards" }).click();
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(8);

  const cardYPositions = await Promise.all(
    Array.from(
      { length: 5 },
      async (_, index) => (await cards.nth(index).boundingBox())?.y,
    ),
  );
  expect(cardYPositions.slice(0, 4).every((y) => y === cardYPositions[0])).toBe(
    true,
  );
  expect(cardYPositions[4]).toBeGreaterThan(cardYPositions[0] ?? 0);

  await page.getByRole("button", { name: "Próxima página" }).click();
  await expect(cards).toHaveCount(2);
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Livro 9" })).toBeVisible();
});

test("shows empty library and links to catalog search", async ({ page }) => {
  await mockSession(page);
  await mockLibrary(page, async (route) => {
    await route.fulfill({
      status: 200,
      json: listResponse({
        items: [],
        totalItems: 0,
        countsByStatus: { WANT_TO_READ: 0, READING: 0, READ: 0 },
      }),
    });
  });

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "Sua biblioteca começa com um livro" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Buscar no catálogo" }).click();
  await expect(page).toHaveURL(/\/search$/);
});

test("shows book skeletons while the library request is pending", async ({
  page,
}) => {
  await mockSession(page);
  await mockLibrary(page, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      status: 200,
      json: listResponse({ items: [entry(1)] }),
    });
  });

  await page.goto("/library");
  await expect(
    page.getByRole("status", { name: "Carregando biblioteca" }),
  ).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /Livro 1/ })).toBeVisible();
});

test("shows filtered-empty and recoverable loading error states", async ({
  page,
}) => {
  let searchAttemptCount = 0;
  await mockSession(page);
  await mockLibrary(page, async (route, url) => {
    if (!url.searchParams.has("q")) {
      await route.fulfill({
        status: 200,
        json: listResponse({ items: [entry(1)] }),
      });
      return;
    }
    searchAttemptCount += 1;
    if (searchAttemptCount === 1) {
      await route.fulfill({
        status: 500,
        json: { code: "INTERNAL_ERROR", message: "Falha simulada" },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      json: listResponse({ items: [], totalItems: 0 }),
    });
  });

  await page.clock.install();
  await page.goto("/library");
  await page
    .getByRole("searchbox", { name: "Buscar na biblioteca" })
    .fill("Duna");
  await page.clock.runFor(300);
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Nenhum resultado encontrado" }),
  ).toBeVisible();
});

test("adds a manual book from the library and refreshes the list", async ({
  page,
}) => {
  await mockSession(page);
  const { requests } = await mockManualLibrary(
    page,
    async (route, payload, entries) => {
      const created = manualEntry(101, payload);
      entries.push(created);
      await route.fulfill({ status: 201, json: created });
    },
  );

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/library");
  await page.getByRole("button", { name: "Adicionar manualmente" }).click();

  const dialog = page.getByRole("dialog", {
    name: "Adicionar livro manualmente",
  });
  await dialog.getByLabel("Título", { exact: true }).fill("O Nome do Vento");
  await dialog
    .getByLabel("Descrição")
    .fill("Um músico busca respostas sobre seu passado.");
  await dialog.getByLabel("Idioma").fill("pt-BR");
  await dialog.getByLabel("Número de páginas").fill("662");
  await dialog
    .getByRole("button", { name: "Adicionar livro", exact: true })
    .click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("link", { name: "O Nome do Vento", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({
      hasText: "O Nome do Vento foi adicionado à biblioteca.",
    }),
  ).toBeVisible();
  expect(requests).toEqual([
    {
      source: "MANUAL",
      title: "O Nome do Vento",
      authors: [],
      description: "Um músico busca respostas sobre seu passado.",
      coverUrl: "https://covers.example.test/o-nome-do-vento.jpg",
      language: "pt-BR",
      pageCount: 662,
    },
  ]);
});

test("uploads a manual book cover as multipart form data", async ({ page }) => {
  await mockSession(page);
  const { entries, requests } = await mockManualLibrary(page);
  let requestContentType = "";
  let requestBody = "";

  await page.route(`${apiUrl}/library/manual`, async (route) => {
    requestContentType = route.request().headers()["content-type"] ?? "";
    requestBody = route.request().postDataBuffer()?.toString("latin1") ?? "";
    const created = manualEntry(151, {
      source: "MANUAL",
      title: "Livro com capa enviada",
      authors: ["Autora"],
    });
    created.book.coverUrl = "/books/covers/00000000-0000-4000-8000-000000000151.png";
    entries.push(created);
    await route.fulfill({ status: 201, json: created });
  });

  await page.goto("/library");
  await page.getByRole("button", { name: "Adicionar manualmente" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Adicionar livro manualmente",
  });
  await dialog
    .getByLabel("Título", { exact: true })
    .fill("Livro com capa enviada");
  await dialog.getByLabel("Autores").fill("Autora");
  await dialog.getByLabel("Arquivo da capa").setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01,
    ]),
  });

  await expect(dialog.getByRole("img", { name: "Prévia da capa" })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Adicionar livro", exact: true })
    .click();

  await expect(dialog).toBeHidden();
  expect(requestContentType).toMatch(/^multipart\/form-data; boundary=/);
  expect(requestBody).toContain('name="entry"');
  expect(requestBody).toContain('"title":"Livro com capa enviada"');
  expect(requestBody).toContain('name="cover"; filename="cover.png"');
  expect(requests).toHaveLength(0);
  await expect(
    page.getByRole("status").filter({
      hasText: "Livro com capa enviada foi adicionado à biblioteca.",
    }),
  ).toBeVisible();
});

test("shows clear Portuguese guidance for optional cover uploads", async ({ page }) => {
  await mockSession(page);
  await mockManualLibrary(page);
  await page.goto("/library");
  await page.getByRole("button", { name: "Adicionar manualmente" }).click();

  const dialog = page.getByRole("dialog", {
    name: "Adicionar livro manualmente",
  });
  await expect(dialog.getByLabel("URL da capa")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Selecionar imagem" })).toBeVisible();
  await expect(dialog.getByText("Nenhum arquivo selecionado")).toBeVisible();
  await expect(
    dialog.getByText("Selecione uma imagem JPEG, PNG ou WebP, com até 5 MB."),
  ).toBeVisible();
});

test("rejects a whitespace-only title without posting", async ({ page }) => {
  await mockSession(page);
  const { requests } = await mockManualLibrary(page);

  await page.goto("/library");
  await page.getByRole("button", { name: "Adicionar manualmente" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Adicionar livro manualmente",
  });
  const title = dialog.getByLabel("Título", { exact: true });
  await title.fill("   ");
  await dialog
    .getByRole("button", { name: "Adicionar livro", exact: true })
    .click();

  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toBeFocused();
  expect(requests).toHaveLength(0);
});

test("retries a failed manual create without losing form values", async ({
  page,
}) => {
  await mockSession(page);
  let attempts = 0;
  const { entries, requests } = await mockManualLibrary(
    page,
    async (route, payload, createdEntries) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({
          status: 500,
          json: { code: "INTERNAL_ERROR", message: "Falha temporária." },
        });
        return;
      }

      const created = manualEntry(102, payload);
      createdEntries.push(created);
      await route.fulfill({ status: 201, json: created });
    },
  );

  await page.goto("/library");
  await page.getByRole("button", { name: "Adicionar manualmente" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Adicionar livro manualmente",
  });
  await dialog.getByLabel("Título", { exact: true }).fill("A Vida Invisível");
  await dialog.getByLabel("Autores").fill("Martha Wells");
  await dialog.getByLabel("Descrição").fill("Descrição para preservar.");
  await dialog.getByLabel("Idioma").fill("pt-BR");
  await dialog.getByLabel("Número de páginas").fill("224");
  await dialog
    .getByRole("button", { name: "Adicionar livro", exact: true })
    .click();

  await expect(dialog.getByRole("alert")).toContainText("Falha temporária.");
  await expect(dialog.getByLabel("Título", { exact: true })).toHaveValue(
    "A Vida Invisível",
  );
  await expect(dialog.getByLabel("Autores")).toHaveValue("Martha Wells");
  await expect(dialog.getByLabel("Descrição")).toHaveValue(
    "Descrição para preservar.",
  );
  await expect(dialog.getByLabel("Idioma")).toHaveValue("pt-BR");
  await expect(dialog.getByLabel("Número de páginas")).toHaveValue("224");
  await dialog.getByRole("button", { name: "Tentar novamente" }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("link", { name: "A Vida Invisível", exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(entries).toHaveLength(1);
});

test("allows repeated manual books with the same title", async ({ page }) => {
  await mockSession(page);
  let nextId = 103;
  const { entries } = await mockManualLibrary(
    page,
    async (route, payload, createdEntries) => {
      const created = manualEntry(nextId++, payload);
      createdEntries.push(created);
      await route.fulfill({ status: 201, json: created });
    },
  );

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/library");

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "Adicionar manualmente" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Adicionar livro manualmente",
    });
    await dialog.getByLabel("Título", { exact: true }).fill("Livro Repetido");
    await dialog
      .getByRole("button", { name: "Adicionar livro", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => entries.length).toBe(attempt + 1);
  }

  const table = page.getByRole("table", { name: "Livros na biblioteca" });
  await expect(
    table.getByRole("row").filter({ hasText: "Livro Repetido" }),
  ).toHaveCount(2);
  expect(new Set(entries.map((item) => item.id)).size).toBe(2);
});

test("canceling manual creation sends no request and reopening clears the draft", async ({
  page,
}) => {
  await mockSession(page);
  const { requests } = await mockManualLibrary(page);

  await page.goto("/library");
  await page.getByRole("button", { name: "Adicionar manualmente" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Adicionar livro manualmente",
  });
  await dialog.getByLabel("Título", { exact: true }).fill("Rascunho local");
  await dialog.getByLabel("Autores").fill("Autor de teste");
  await dialog.getByLabel("Descrição").fill("Não deve persistir.");
  await dialog.getByLabel("Arquivo da capa").setInputFiles({
    name: "rascunho.png",
    mimeType: "image/png",
    buffer: Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01,
    ]),
  });
  await expect(dialog.getByText("rascunho.png")).toBeVisible();
  await dialog.getByLabel("Idioma").fill("pt-BR");
  await dialog.getByLabel("Número de páginas").fill("100");
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Adicionar manualmente" }).click();
  await expect(dialog.getByLabel("Título", { exact: true })).toHaveValue("");
  await expect(dialog.getByLabel("Autores")).toHaveValue("");
  await expect(dialog.getByLabel("Descrição")).toHaveValue("");
  await expect(dialog.getByText("Nenhum arquivo selecionado")).toBeVisible();
  await expect(dialog.getByLabel("Idioma")).toHaveValue("");
  await expect(dialog.getByLabel("Número de páginas")).toHaveValue("");
});

test("keeps manual and catalog add actions usable at 320px", async ({
  page,
}) => {
  await mockSession(page);
  await mockManualLibrary(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/library");

  const catalogLink = page.getByRole("link", { name: "Buscar no catálogo" });
  const manualButton = page.getByRole("button", {
    name: "Adicionar manualmente",
  });
  await expect(catalogLink).toBeVisible();
  await expect(catalogLink).toHaveAttribute("href", "/search");
  await expect(manualButton).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);

  await manualButton.click();
  const dialog = page.getByRole("dialog", {
    name: "Adicionar livro manualmente",
  });
  await expect(dialog).toBeVisible();
  expect((await dialog.boundingBox())?.width).toBeLessThanOrEqual(288);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test("updates status, retries a failed update, confirms deletion, and recovers from delete failure", async ({
  page,
}) => {
  let currentEntry: ReturnType<typeof entry> | null = entry(
    7,
    "Livro gerenciado",
  );
  let patchAttempts = 0;
  let deleteAttempts = 0;
  const patchBodies: unknown[] = [];

  await mockSession(page);
  await page.route(`${apiUrl}/library**`, async (route) => {
    const method = route.request().method();
    const requestUrl = new URL(route.request().url());
    if (method === "GET" && requestUrl.pathname === "/library") {
      const items = currentEntry ? [currentEntry] : [];
      await route.fulfill({
        status: 200,
        json: listResponse({
          items,
          totalItems: items.length,
          countsByStatus: {
            WANT_TO_READ: currentEntry?.status === "WANT_TO_READ" ? 1 : 0,
            READING: currentEntry?.status === "READING" ? 1 : 0,
            READ: currentEntry?.status === "READ" ? 1 : 0,
          },
        }),
      });
      return;
    }

    if (method === "PATCH") {
      patchAttempts += 1;
      patchBodies.push(route.request().postDataJSON());
      if (patchAttempts === 1) {
        await route.fulfill({
          status: 500,
          json: { code: "INTERNAL_ERROR", message: "Falha ao atualizar" },
        });
        return;
      }
      if (!currentEntry) {
        await route.fulfill({ status: 404 });
        return;
      }
      currentEntry = { ...currentEntry, status: "READ" };
      await route.fulfill({ status: 200, json: currentEntry });
      return;
    }

    if (method === "DELETE") {
      deleteAttempts += 1;
      if (deleteAttempts === 1) {
        await route.fulfill({
          status: 500,
          json: { code: "INTERNAL_ERROR", message: "Falha ao remover" },
        });
        return;
      }
      currentEntry = null;
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.continue();
  });

  await page.goto("/library");
  await expect(
    page.getByRole("rowheader", { name: /Livro gerenciado/ }),
  ).toBeVisible();
  const managedRow = page.getByRole("row", { name: /Livro gerenciado/ });
  await managedRow
    .getByRole("button", { name: "Editar status de Livro gerenciado" })
    .click();
  const editDialog = page.getByRole("dialog", {
    name: "Alterar status",
  });
  await expect(
    editDialog.getByText("Livro gerenciado", { exact: true }),
  ).toBeVisible();
  const editDialogBounds = await editDialog.boundingBox();
  expect(editDialogBounds?.width).toBeLessThanOrEqual(448);
  const statusSelect = editDialog.getByLabel("Novo status");
  await statusSelect.selectOption("READ");
  await editDialog.getByRole("button", { name: "Salvar status" }).click();
  await expect(editDialog.getByRole("alert")).toContainText(
    "Falha ao atualizar",
  );
  await expect(statusSelect).toHaveValue("READ");
  await editDialog.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(editDialog).toBeHidden();
  await expect(
    managedRow.getByRole("cell").nth(1).getByText("Lido", { exact: true }),
  ).toBeVisible();
  expect(patchBodies).toEqual([{ status: "READ" }, { status: "READ" }]);

  await page
    .getByRole("button", { name: "Remover Livro gerenciado da biblioteca" })
    .click();
  const dialog = page.getByRole("dialog");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(deleteAttempts).toBe(0);

  await page
    .getByRole("button", { name: "Remover Livro gerenciado da biblioteca" })
    .click();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  expect(deleteAttempts).toBe(0);

  await page
    .getByRole("button", { name: "Remover Livro gerenciado da biblioteca" })
    .click();
  await dialog
    .getByRole("button", { name: "Remover livro", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Falha ao remover");
  await dialog.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Sua biblioteca começa com um livro" }),
  ).toBeVisible();
  expect(deleteAttempts).toBe(2);
});

test("moves back to the last valid page after deleting its only entry", async ({
  page,
}) => {
  let entries = Array.from({ length: 9 }, (_, index) => entry(index + 1));
  const requestedPages: number[] = [];

  await mockSession(page);
  await page.route(`${apiUrl}/library**`, async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    if (method === "GET" && url.pathname === "/library") {
      const requestedPage = Number(url.searchParams.get("page"));
      const pageSize = Number(url.searchParams.get("pageSize"));
      const totalPages = Math.ceil(entries.length / pageSize);
      const responsePage = Math.min(requestedPage, totalPages || 1);
      requestedPages.push(requestedPage);
      const items = entries.slice(
        (responsePage - 1) * pageSize,
        responsePage * pageSize,
      );
      await route.fulfill({
        status: 200,
        json: listResponse({
          items,
          page: responsePage,
          pageSize,
          totalItems: entries.length,
          countsByStatus: { WANT_TO_READ: 0, READING: entries.length, READ: 0 },
        }),
      });
      return;
    }

    if (method === "DELETE") {
      const id = url.pathname.split("/").at(-1);
      entries = entries.filter((item) => item.id !== id);
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.continue();
  });

  await page.goto("/library");
  await page.getByRole("button", { name: "Próxima página" }).click();
  await expect(page.getByRole("rowheader", { name: /Livro 9/ })).toBeVisible();
  await expect(page.getByText("Página 2 de 2")).toBeVisible();

  await page
    .getByRole("button", { name: "Remover Livro 9 da biblioteca" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Remover livro", exact: true })
    .click();

  await expect(page.getByRole("rowheader", { name: /Livro 8/ })).toBeVisible();
  await expect(page.getByText("Página 1 de 1")).toBeVisible();
  expect(requestedPages).toContain(2);
  expect(requestedPages.at(-1)).toBe(1);
});
