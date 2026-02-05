-- CreateTable
CREATE TABLE "Station" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHindi" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Train" (
    "trainNumber" TEXT NOT NULL,
    "trainName" TEXT NOT NULL,
    "sourceStationCode" TEXT NOT NULL,
    "destinationStationCode" TEXT NOT NULL,

    CONSTRAINT "Train_pkey" PRIMARY KEY ("trainNumber")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "trainNumber" TEXT NOT NULL,
    "stationCode" TEXT NOT NULL,
    "arrivalTime" TEXT,
    "departureTime" TEXT,
    "day" INTEGER,
    "distance" INTEGER,
    "stopNumber" INTEGER,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCache" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCache_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "Train" ADD CONSTRAINT "Train_sourceStationCode_fkey" FOREIGN KEY ("sourceStationCode") REFERENCES "Station"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Train" ADD CONSTRAINT "Train_destinationStationCode_fkey" FOREIGN KEY ("destinationStationCode") REFERENCES "Station"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_trainNumber_fkey" FOREIGN KEY ("trainNumber") REFERENCES "Train"("trainNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_stationCode_fkey" FOREIGN KEY ("stationCode") REFERENCES "Station"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
