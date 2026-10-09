-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('driving', 'walking', 'cycling');

-- CreateEnum
CREATE TYPE "RouteMode" AS ENUM ('manual', 'optimized');

-- AlterTable Trip: convert travelMode String -> TravelMode enum (preserve existing values)
ALTER TABLE "Trip" ALTER COLUMN "travelMode" DROP DEFAULT;
ALTER TABLE "Trip"
  ALTER COLUMN "travelMode" TYPE "TravelMode"
    USING CASE
      WHEN "travelMode" = 'walking' THEN 'walking'::"TravelMode"
      WHEN "travelMode" = 'cycling' THEN 'cycling'::"TravelMode"
      ELSE 'driving'::"TravelMode"
    END;
ALTER TABLE "Trip" ALTER COLUMN "travelMode" SET DEFAULT 'driving'::"TravelMode";

-- AlterTable Trip: convert routeMode String -> RouteMode enum (preserve existing values)
ALTER TABLE "Trip" ALTER COLUMN "routeMode" DROP DEFAULT;
ALTER TABLE "Trip"
  ALTER COLUMN "routeMode" TYPE "RouteMode"
    USING CASE
      WHEN "routeMode" = 'optimized' THEN 'optimized'::"RouteMode"
      ELSE 'manual'::"RouteMode"
    END;
ALTER TABLE "Trip" ALTER COLUMN "routeMode" SET DEFAULT 'manual'::"RouteMode";

-- CreateIndex on Trip(sessionId)
CREATE INDEX "Trip_sessionId_idx" ON "Trip"("sessionId");

-- CreateIndex on Trip(ownerId)
CREATE INDEX "Trip_ownerId_idx" ON "Trip"("ownerId");

-- CreateIndex on Stop(tripId)
CREATE INDEX "Stop_tripId_idx" ON "Stop"("tripId");

-- CreateIndex on Stop(sequence)
CREATE INDEX "Stop_sequence_idx" ON "Stop"("sequence");
