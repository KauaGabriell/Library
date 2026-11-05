ALTER TABLE "library_entries"
ADD COLUMN "page_count_override" INTEGER;

ALTER TABLE "library_entries"
ADD CONSTRAINT "library_entries_page_count_override_positive"
CHECK ("page_count_override" IS NULL OR "page_count_override" > 0);
