-- CreateTable
CREATE TABLE "public"."Track" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "org" TEXT,
    "type" TEXT,
    "beginnerFriendly" BOOLEAN,
    "venue" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "url" TEXT,
    "sanctioned" BOOLEAN,
    "source" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "beginnerFriendly" BOOLEAN NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "time" TEXT,
    "img" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Track_source_externalId_key" ON "public"."Track"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_externalId_key" ON "public"."Event"("externalId");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
