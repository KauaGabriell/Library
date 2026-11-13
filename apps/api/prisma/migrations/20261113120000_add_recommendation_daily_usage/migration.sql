CREATE TABLE "recommendation_daily_usage" (
    "usage_date" DATE NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recommendation_daily_usage_pkey" PRIMARY KEY ("usage_date")
);
