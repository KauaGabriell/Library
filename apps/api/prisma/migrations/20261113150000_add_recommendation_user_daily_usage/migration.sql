CREATE TABLE "recommendation_user_daily_usage" (
    "user_id" TEXT NOT NULL,
    "usage_date" DATE NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recommendation_user_daily_usage_pkey" PRIMARY KEY ("user_id", "usage_date")
);

ALTER TABLE "recommendation_user_daily_usage"
ADD CONSTRAINT "recommendation_user_daily_usage_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
