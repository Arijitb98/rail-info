-- DropForeignKey
ALTER TABLE "Train" DROP CONSTRAINT "Train_destinationStationCode_fkey";

-- DropForeignKey
ALTER TABLE "Train" DROP CONSTRAINT "Train_sourceStationCode_fkey";

-- AlterTable
ALTER TABLE "Train" ALTER COLUMN "sourceStationCode" DROP NOT NULL,
ALTER COLUMN "destinationStationCode" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Train" ADD CONSTRAINT "Train_sourceStationCode_fkey" FOREIGN KEY ("sourceStationCode") REFERENCES "Station"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Train" ADD CONSTRAINT "Train_destinationStationCode_fkey" FOREIGN KEY ("destinationStationCode") REFERENCES "Station"("code") ON DELETE SET NULL ON UPDATE CASCADE;
