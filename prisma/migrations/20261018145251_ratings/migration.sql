-- AlterTable
ALTER TABLE "watchlist_item" ADD COLUMN     "rating" INTEGER;

-- CreateIndex
CREATE INDEX "watchlist_item_mediaType_tmdbId_idx" ON "watchlist_item"("mediaType", "tmdbId");

-- Ratings are 1-5 stars (Prisma can't express this, so it's added by hand).
ALTER TABLE "watchlist_item" ADD CONSTRAINT "watchlist_item_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
