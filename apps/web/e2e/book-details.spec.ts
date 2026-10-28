import { expect, type Page, test } from "@playwright/test";

const apiUrl = "http://127.0.0.1:3000";
const libraryId = "00000000-0000-4000-8000-000000000201";
const noteId = "00000000-0000-4000-8000-000000000301";

const publicUser = {
  id: "4a8a4d44-9639-4b19-8709-6915cc94623e",
  email: "reader@example.com",
  name: "Leitor",
  avatarUrl: null,
};

type ReadingState = "WANT_TO_READ" | "READING" | "READ";

type DetailNote = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type DetailEntry = {
  id: string;
  status: ReadingState;
  currentPage: number;
  progressPercent: number | null;
  rating: number | null;
  review: string | null;
  book: {
    googleBooksId: string;
    title: string;
    authors: string[];
    description: string | null;
    coverUrl: string | null;
    language: string | null;
    pageCount: number | null;
  };
  createdAt: string;
  updatedAt: string;
  notes: DetailNote[];
};

function createEntry({
  status = "WANT_TO_READ",
  pageCount = 120,
  currentPage = 0,
  rating = null,
  review = "Resenha preservada entre estados.",
  notes = [],
}: {
  status?: ReadingState;
  pageCount?: number | null;
  currentPage?: number;
  rating?: number | null;
  review?: string | null;
  notes?: DetailNote[];
} = {}): DetailEntry {
  return {
    id: libraryId,
    status,
    currentPage,
    progressPercent:
      status === "READ"
        ? 100
        : status === "READING" && pageCount !== null
          ? Math.floor((currentPage / pageCount) * 100)
          : null,
    rating,
    review,
    book: {
      googleBooksId: "google-dune",
      title: "Duna",
      authors: ["Frank Herbert"],
      description: "Uma jornada por Arrakis.",
      coverUrl: null,
      language: "pt-BR",
      pageCount,
    },
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-02T12:00:00.000Z",
    notes,
  };
}

async function mockSession(page: Page) {
  await page.route(`${apiUrl}/auth/me`, async (route) => {
    await route.fulfill({ status: 200, json: publicUser });
  });
}

async function mockDetailApi(page: Page, initialEntry: DetailEntry) {
  let currentEntry = structuredClone(initialEntry);
  const libraryPatches: Record<string, unknown>[] = [];
  const noteCreates: string[] = [];
  const notePatches: { id: string; content: string }[] = [];
  const noteDeletes: string[] = [];

  await page.route(`${apiUrl}/library/${libraryId}`, async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({ status: 200, json: currentEntry });
      return;
    }

    if (request.method() === "PATCH") {
      const patch = request.postDataJSON() as Partial<
        Pick<DetailEntry, "status" | "currentPage" | "rating" | "review">
      >;
      libraryPatches.push(patch);
      currentEntry = {
        ...currentEntry,
        ...patch,
        updatedAt: "2026-01-03T12:00:00.000Z",
      };
      const pageCount = currentEntry.book.pageCount;
      currentEntry.progressPercent =
        currentEntry.status === "READ"
          ? 100
          : currentEntry.status === "READING" && pageCount !== null
            ? Math.floor((currentEntry.currentPage / pageCount) * 100)
            : null;

      const { notes: _notes, ...publicEntry } = currentEntry;
      await route.fulfill({ status: 200, json: publicEntry });
      return;
    }

    await route.continue();
  });

  await page.route(`${apiUrl}/library/${libraryId}/notes`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    const { content } = route.request().postDataJSON() as { content: string };
    noteCreates.push(content);
    const note: DetailNote = {
      id: "00000000-0000-4000-8000-000000000302",
      content,
      createdAt: "2026-01-04T12:00:00.000Z",
      updatedAt: "2026-01-04T12:00:00.000Z",
    };
    currentEntry.notes = [note, ...currentEntry.notes];
    await route.fulfill({ status: 201, json: note });
  });

  await page.route(`${apiUrl}/notes/${noteId}`, async (route) => {
    const request = route.request();

    if (request.method() === "PATCH") {
      const { content } = request.postDataJSON() as { content: string };
      notePatches.push({ id: noteId, content });
      currentEntry.notes = currentEntry.notes.map((note) =>
        note.id === noteId ? { ...note, content } : note,
      );
      await route.fulfill({
        status: 200,
        json: currentEntry.notes.find((note) => note.id === noteId),
      });
      return;
    }

    if (request.method() === "DELETE") {
      noteDeletes.push(noteId);
      currentEntry.notes = currentEntry.notes.filter(
        (note) => note.id !== noteId,
      );
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.continue();
  });

  return { libraryPatches, noteCreates, notePatches, noteDeletes };
}

async function changeStatus(page: Page, status: ReadingState) {
  await page.getByRole("button", { name: "Editar status de Duna" }).click();
  await page.getByLabel("Novo status").selectOption(status);
  await page.getByRole("button", { name: "Salvar status" }).click();
  const statusLabel =
    status === "READING" ? "Lendo" : status === "READ" ? "Lido" : "Quero ler";
  const statusSection = page
    .getByText("Estado de leitura", { exact: true })
    .locator("xpath=..");

  await expect(
    statusSection.getByText(statusLabel, { exact: true }),
  ).toBeVisible();
}

test("starts reading, saves progress and note, then rates and reviews the book", async ({
  page,
}) => {
  const preservedNote: DetailNote = {
    id: noteId,
    content: "Anotação que deve sobreviver à mudança de status.",
    createdAt: "2026-01-02T12:00:00.000Z",
    updatedAt: "2026-01-02T12:00:00.000Z",
  };

  await mockSession(page);
  const mutations = await mockDetailApi(
    page,
    createEntry({ notes: [preservedNote] }),
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/library/${libraryId}`);

  await expect(
    page.getByRole("navigation", { name: "Navegação principal" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sua resenha" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Nova anotação" })).toHaveCount(
    0,
  );
  await expect(page.getByText(preservedNote.content)).toBeVisible();

  await changeStatus(page, "READING");
  await page.getByRole("button", { name: "Editar páginas lidas" }).click();
  await page.getByLabel("Página atual").fill("30");
  await page.getByRole("button", { name: "Salvar páginas lidas" }).click();
  await expect(page.getByText("30 / 120")).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Progresso de leitura" }),
  ).toHaveAttribute("aria-valuenow", "25");

  await page.getByRole("button", { name: "Nova anotação" }).click();
  await page
    .getByRole("dialog", { name: "Nova anotação" })
    .getByLabel("Anotação")
    .fill("Ideia importante do capítulo.");
  await page.getByRole("button", { name: "Salvar anotação" }).click();
  await expect(page.getByText("Ideia importante do capítulo.")).toBeVisible();

  await changeStatus(page, "READ");
  await expect(
    page.getByRole("heading", { name: "Sua resenha" }),
  ).toBeVisible();
  await expect(
    page.getByText("Resenha preservada entre estados.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar resenha" }).click();
  await expect(page.getByLabel("Resenha do livro")).toHaveValue(
    "Resenha preservada entre estados.",
  );

  await page.getByRole("button", { name: "4 estrelas" }).click();
  await expect(
    page.getByRole("button", { name: "4 estrelas" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Resenha do livro").fill("Uma leitura marcante.");
  await page.getByRole("button", { name: "Salvar resenha" }).click();
  await expect(
    page.getByText("Uma leitura marcante.", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Excluir resenha" }).click();
  const deleteReviewDialog = page.getByRole("dialog", {
    name: "Excluir resenha?",
  });
  await expect(deleteReviewDialog).toBeVisible();
  await deleteReviewDialog
    .getByRole("button", { name: "Excluir resenha" })
    .click();
  await expect(
    page.getByRole("button", { name: "Escrever resenha" }),
  ).toBeVisible();
  await expect(
    page.getByText("Uma leitura marcante.", { exact: true }),
  ).toHaveCount(0);

  expect(mutations.libraryPatches).toEqual([
    { status: "READING" },
    { currentPage: 30 },
    { status: "READ" },
    { rating: 4 },
    { review: "Uma leitura marcante." },
    { review: null },
  ]);
  expect(mutations.noteCreates).toEqual(["Ideia importante do capítulo."]);
  await expect(page.getByText(preservedNote.content)).toBeVisible();
});

test("hides progress editing without page count and keeps WANT_TO_READ notes read-only", async ({
  page,
}) => {
  const preservedNote: DetailNote = {
    id: noteId,
    content: "Nota permanece salva enquanto não estou lendo.",
    createdAt: "2026-01-02T12:00:00.000Z",
    updatedAt: "2026-01-02T12:00:00.000Z",
  };

  await mockSession(page);
  await mockDetailApi(
    page,
    createEntry({ pageCount: null, notes: [preservedNote] }),
  );
  await page.goto(`/library/${libraryId}`);

  await expect(
    page.getByRole("button", { name: "Editar páginas lidas" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("progressbar", { name: "Progresso de leitura" }),
  ).toHaveCount(0);
  await expect(page.getByText("0% completo", { exact: true })).toHaveCount(0);
  await expect(page.getByText(preservedNote.content)).toBeVisible();
  await expect(page.getByRole("button", { name: "Nova anotação" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Editar anotação" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Excluir anotação" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Sua avaliação" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sua resenha" })).toHaveCount(
    0,
  );
});

test("keeps reading status controls separated on narrow mobile screens", async ({
  page,
}) => {
  await mockSession(page);
  await mockDetailApi(page, createEntry({ status: "READING" }));
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`/library/${libraryId}`);

  const editButton = page.getByRole("button", {
    name: "Editar status de Duna",
  });
  const deleteButton = page.getByRole("button", {
    name: "Remover Duna da biblioteca",
  });
  const statusLabel = page.getByText("Estado de leitura", { exact: true });
  const pagesLabel = page.getByText("Páginas", { exact: true });
  const pageCountValue = page.getByText("120", { exact: true });
  const languageLabel = page.getByText("Idioma", { exact: true });
  await expect(statusLabel).toBeVisible();
  await expect(pagesLabel).toBeVisible();
  await expect(pageCountValue).toBeVisible();
  await expect(languageLabel).toBeVisible();
  await expect(editButton).toBeVisible();
  await expect(deleteButton).toBeVisible();

  const editBounds = await editButton.boundingBox();
  const deleteBounds = await deleteButton.boundingBox();
  const pageBounds = await pagesLabel.boundingBox();
  const pageCountBounds = await pageCountValue.boundingBox();
  const languageBounds = await languageLabel.boundingBox();
  const statusCardBounds = await statusLabel
    .locator("xpath=../..")
    .boundingBox();
  if (
    !editBounds ||
    !deleteBounds ||
    !pageBounds ||
    !pageCountBounds ||
    !languageBounds ||
    !statusCardBounds
  ) {
    throw new Error("Os controles de status precisam estar visíveis.");
  }

  expect(languageBounds.y).toBeGreaterThan(pageBounds.y);
  expect(statusCardBounds.y).toBeGreaterThan(
    pageCountBounds.y + pageCountBounds.height,
  );
  expect(Math.abs(statusCardBounds.x - pageBounds.x)).toBeLessThanOrEqual(1);
  expect(editBounds.width).toBeGreaterThanOrEqual(44);
  expect(deleteBounds.width).toBeGreaterThanOrEqual(44);
  expect(editBounds.x).toBeGreaterThanOrEqual(statusCardBounds.x);
  expect(deleteBounds.x + deleteBounds.width).toBeLessThanOrEqual(
    statusCardBounds.x + statusCardBounds.width,
  );
  expect(editBounds.x + editBounds.width).toBeLessThanOrEqual(
    deleteBounds.x + 1,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("edits and deletes a note with confirmation", async ({ page }) => {
  const note: DetailNote = {
    id: noteId,
    content: "Texto inicial da anotação.",
    createdAt: "2026-01-02T12:00:00.000Z",
    updatedAt: "2026-01-02T12:00:00.000Z",
  };

  await mockSession(page);
  const mutations = await mockDetailApi(
    page,
    createEntry({ status: "READING", currentPage: 20, notes: [note] }),
  );
  await page.goto(`/library/${libraryId}`);

  await page.getByRole("button", { name: "Editar anotação" }).click();
  await page
    .getByRole("dialog", { name: "Editar anotação" })
    .getByLabel("Anotação")
    .fill("Texto atualizado da anotação.");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Texto atualizado da anotação.")).toBeVisible();

  await page.getByRole("button", { name: "Excluir anotação" }).click();
  await expect(
    page.getByRole("heading", { name: "Excluir anotação?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Excluir anotação", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("Nenhuma anotação salva para este livro."),
  ).toBeVisible();

  expect(mutations.notePatches).toEqual([
    { id: noteId, content: "Texto atualizado da anotação." },
  ]);
  expect(mutations.noteDeletes).toEqual([noteId]);
});
