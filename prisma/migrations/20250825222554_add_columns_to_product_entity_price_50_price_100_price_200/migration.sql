/*
  Warnings:

  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - Added the required column `price_100` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price_200` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price_50` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "price",
ADD COLUMN     "price_100" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "price_200" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "price_50" DOUBLE PRECISION NOT NULL;
