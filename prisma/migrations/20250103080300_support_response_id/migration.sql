/*
  Warnings:

  - The primary key for the `SupportResponse` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "SupportResponse" DROP CONSTRAINT "SupportResponse_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "SupportResponse_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SupportResponse_id_seq";
