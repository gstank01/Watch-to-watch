-- CreateTable
CREATE TABLE "usage_sync" (
    "userId" TEXT NOT NULL,
    "since" DATE,
    "prices" JSONB NOT NULL DEFAULT '{}',
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_sync_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "service_use_day" (
    "userId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "service_use_day_pkey" PRIMARY KEY ("userId","providerId","day")
);

-- AddForeignKey
ALTER TABLE "usage_sync" ADD CONSTRAINT "usage_sync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_use_day" ADD CONSTRAINT "service_use_day_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
