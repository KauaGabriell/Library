import {
  type DashboardSummaryResponse,
  type LibraryEntryPublicResponse,
  dashboardSummaryResponseSchema,
} from "@library/contracts";
import { describe, expect, it } from "vitest";

const recentEntry = {
  id: "7c6a3ca5-6598-4bf4-89dd-52acff6ebec6",
  status: "READ",
  currentPage: 220,
  rating: 5,
  review: null,
  book: {
    googleBooksId: "google-book-123",
    title: "Livro recente",
    authors: ["Autora"],
    description: null,
    coverUrl: null,
    language: null,
    pageCount: 220,
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
} satisfies LibraryEntryPublicResponse;

const emptyDashboard: DashboardSummaryResponse = {
  totalBooks: 0,
  countsByStatus: {
    WANT_TO_READ: 0,
    READING: 0,
    READ: 0,
  },
  averageRating: null,
  recentEntries: [],
  readingGoal: null,
};

describe("dashboard summary public exports", () => {
  it("parses summary with recent entries and annual goal", () => {
    const response = {
      totalBooks: 1,
      countsByStatus: {
        WANT_TO_READ: 0,
        READING: 0,
        READ: 1,
      },
      averageRating: 5,
      recentEntries: [recentEntry],
      readingGoal: {
        year: 2026,
        targetBooks: 12,
        completedBooks: 1,
        progressPercent: 8,
      },
    } satisfies DashboardSummaryResponse;

    expect(dashboardSummaryResponseSchema.parse(response)).toEqual(response);
  });

  it("allows no ratings and no annual goal", () => {
    expect(dashboardSummaryResponseSchema.parse(emptyDashboard)).toEqual(
      emptyDashboard,
    );
  });

  it("rejects negative status counts", () => {
    const response = {
      ...emptyDashboard,
      countsByStatus: { ...emptyDashboard.countsByStatus, WANT_TO_READ: -1 },
    };

    expect(dashboardSummaryResponseSchema.safeParse(response).success).toBe(false);
  });

  it("rejects average rating above five", () => {
    const response = { ...emptyDashboard, averageRating: 5.1 };

    expect(dashboardSummaryResponseSchema.safeParse(response).success).toBe(false);
  });
});
