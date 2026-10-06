import type { DashboardSummaryResponse } from "@library/contracts";
import { mapLibraryEntryToPublicResponse } from "../library/libraryMapper";
import { readingGoalService } from "../readingGoal/readingGoalService";
import { dashboardRepository } from "./dashboardRepository";

export const dashboardService = {
  async getDashboard(userId: string) {
    const [recents, counts, avg] = await Promise.all([
      dashboardRepository.getLibrarysEntries(userId),
      dashboardRepository.getLibraryEntriesStatusCount(userId),
      dashboardRepository.getAvgRating(userId),
    ]);
    const [wantToRead = 0, reading = 0, read = 0] = counts;
    const countByStatus = {
      WANT_TO_READ: wantToRead,
      READING: reading,
      READ: read,
    };

    const totalBooks = counts.reduce((total, count) => total + count, 0);

    const recentsMapped = recents.map((recent) => {
      return mapLibraryEntryToPublicResponse(recent);
    });

    const { rating } = avg._avg;

    const readingGoal = await readingGoalService.getReadingGoal(userId);

    const dashboard: DashboardSummaryResponse = {
      totalBooks,
      recentEntries: recentsMapped,
      countsByStatus: {
        WANT_TO_READ: countByStatus.WANT_TO_READ,
        READING: countByStatus.READING,
        READ: countByStatus.READ,
      },
      averageRating: rating,
      readingGoal: readingGoal ?? null,
    };
    return dashboard;
  },
};
