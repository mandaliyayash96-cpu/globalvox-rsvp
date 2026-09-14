/**
 * Seed: one demo campaign with a handful of invitees so "Start Campaign" works
 * immediately. The invitees here deliberately do NOT overlap with
 * public/sample-invitees.csv, so uploading that file also demonstrates the
 * import + validation flow (rather than reporting everything as duplicates).
 *
 * Idempotent: safe to run repeatedly.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_CAMPAIGN_ID = "demo-product-launch";

const demoInvitees = [
  { name: "Aarav Mehta", phone: "+919810000101", email: "aarav.mehta@example.com" },
  { name: "Diya Sharma", phone: "+919810000102", email: "diya.sharma@example.com" },
  { name: "Kabir Iyer", phone: "+919810000103", email: "kabir.iyer@example.com" },
  { name: "Meera Nair", phone: "+919810000104", email: "meera.nair@example.com" },
  { name: "Rohan Desai", phone: "+919810000105", email: "rohan.desai@example.com" },
  { name: "Sanya Kapoor", phone: "+919810000106", email: "sanya.kapoor@example.com" },
  { name: "Vihaan Reddy", phone: "+919810000107", email: "vihaan.reddy@example.com" },
  { name: "Ananya Bose", phone: "+919810000108", email: "ananya.bose@example.com" },
  { name: "Ishaan Malhotra", phone: "+919810000109", email: "ishaan.m@example.com" },
  { name: "Priya Venkatesh", phone: "+919810000110", email: "priya.v@example.com" },
];

async function main() {
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 21);
  eventDate.setHours(18, 30, 0, 0);

  const campaign = await prisma.campaign.upsert({
    where: { id: DEMO_CAMPAIGN_ID },
    update: {},
    create: {
      id: DEMO_CAMPAIGN_ID,
      name: "Q4 Product Launch — RSVP drive",
      eventName: "Nova 2.0 Launch Evening",
      eventDate,
      eventLocation: "The Leela, Mumbai — Grand Ballroom",
      objective:
        "Call every invitee, confirm whether they will attend the launch evening, " +
        "and capture any dietary or accessibility notes. Be warm and concise.",
    },
  });

  const { count } = await prisma.invitee.createMany({
    data: demoInvitees.map((i) => ({ ...i, campaignId: campaign.id })),
    skipDuplicates: true,
  });

  console.log(`Seeded campaign "${campaign.name}" (${campaign.id}) with ${count} new invitee(s).`);
  console.log("Tip: upload /public/sample-invitees.csv on the campaign page to demo CSV import.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
