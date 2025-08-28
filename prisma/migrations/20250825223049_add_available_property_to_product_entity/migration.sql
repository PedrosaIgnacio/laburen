/*
  Warnings:

  - Added the required column `available` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "available" BOOLEAN NOT NULL;
