-- CreateEnum
CREATE TYPE "ReadingState" AS ENUM ('WANT_TO_READ', 'READING', 'READ');

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "googleBooksId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "description" TEXT,
    "cover_url" TEXT,
    "language" TEXT,
    "page_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_entries" (
    "id" TEXT NOT NULL,
    "status" "ReadingState" NOT NULL,
    "current_page" INTEGER DEFAULT 0,
    "rating" INTEGER,
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "library_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "libraryEntryId" TEXT NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "target_books" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "books_googleBooksId_key" ON "books"("googleBooksId");

-- CreateIndex
CREATE INDEX "library_entries_userId_status_updated_at_idx" ON "library_entries"("userId", "status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "library_entries_bookId_userId_key" ON "library_entries"("bookId", "userId");

-- CreateIndex
CREATE INDEX "reading_goals_userId_year_idx" ON "reading_goals"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "reading_goals_userId_year_key" ON "reading_goals"("userId", "year");

-- AddForeignKey
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_libraryEntryId_fkey" FOREIGN KEY ("libraryEntryId") REFERENCES "library_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_goals" ADD CONSTRAINT "reading_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add check range
ALTER TABLE "reading_goals"
ADD CONSTRAINT "reading_goals_target_books_range"
CHECK ("target_books" BETWEEN 1 AND 999);