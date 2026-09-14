-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'running', 'completed');

-- CreateEnum
CREATE TYPE "InviteeStatus" AS ENUM ('pending', 'calling', 'confirmed', 'declined', 'undecided', 'failed');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventLocation" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitee" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "InviteeStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastCalledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invitee_campaignId_status_idx" ON "Invitee"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Invitee_campaignId_phone_key" ON "Invitee"("campaignId", "phone");

-- AddForeignKey
ALTER TABLE "Invitee" ADD CONSTRAINT "Invitee_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
