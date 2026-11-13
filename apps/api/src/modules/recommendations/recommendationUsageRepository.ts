import { getCurrentBusinessDate } from "../../helpers/getCurrentBusinessDate";
import { prisma } from "../../lib/prisma";

const globalDailyLimitReached = new Error("global-daily-limit-reached");

export const recommendationUsageRepository = {
  async consumeDailySlots(
    userId: string,
    userDailyLimit: number,
    globalDailyLimit: number,
  ): Promise<"allowed" | "user_limit_reached" | "global_limit_reached"> {
    const usageDate = getCurrentBusinessDate();

    try {
      return await prisma.$transaction(async (transaction) => {
        await transaction.recommendationUserDailyUsage.upsert({
          where: { userId_usageDate: { userId, usageDate } },
          create: { userId, usageDate },
          update: {},
        });

        const userSlot =
          await transaction.recommendationUserDailyUsage.updateMany({
            where: {
              userId,
              usageDate,
              requestCount: { lt: userDailyLimit },
            },
            data: { requestCount: { increment: 1 } },
          });

        if (userSlot.count !== 1) return "user_limit_reached";

        await transaction.recommendationDailyUsage.upsert({
          where: { usageDate },
          create: { usageDate },
          update: {},
        });

        const globalSlot =
          await transaction.recommendationDailyUsage.updateMany({
            where: { usageDate, requestCount: { lt: globalDailyLimit } },
            data: { requestCount: { increment: 1 } },
          });

        if (globalSlot.count !== 1) throw globalDailyLimitReached;

        return "allowed";
      });
    } catch (error) {
      if (error === globalDailyLimitReached) return "global_limit_reached";
      throw error;
    }
  },
};
