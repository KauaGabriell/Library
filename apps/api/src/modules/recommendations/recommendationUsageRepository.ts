import { getCurrentBusinessDate } from "../../helpers/getCurrentBusinessDate";
import { prisma } from "../../lib/prisma";

export const recommendationUsageRepository = {
  async consumeDailySlot(limit: number): Promise<boolean> {
    const usageDate = getCurrentBusinessDate();

    await prisma.recommendationDailyUsage.upsert({
      where: { usageDate },
      create: { usageDate },
      update: {},
    });

    const updated = await prisma.recommendationDailyUsage.updateMany({
      where: { usageDate, requestCount: { lt: limit } },
      data: { requestCount: { increment: 1 } },
    });

    return updated.count === 1;
  },
};
