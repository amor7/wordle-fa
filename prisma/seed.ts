import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { STARTER_WORDS } from "./wordPool.seed";

const prisma = new PrismaClient();

function normalize(word: string): string {
  const map: Record<string, string> = { "ي": "ی", "ك": "ک", "ة": "ه" };
  let out = "";
  for (const ch of word) out += map[ch] ?? ch;
  return out.normalize("NFC").trim();
}

function randomPassword(len = 14): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// SQLite (unlike Postgres/MySQL) doesn't support Prisma's `skipDuplicates` on
// createMany, so we pre-filter against existing words instead.
async function seedPoolWords(words: string[]) {
  const unique = Array.from(new Set(words.map(normalize))).filter(Boolean);
  const existing = new Set((await prisma.poolWord.findMany({ select: { word: true } })).map((w) => w.word));
  const rows = unique.filter((w) => !existing.has(w)).map((word) => ({ word, length: Array.from(word).length }));
  let added = 0;
  for (const batch of chunk(rows, 500)) {
    const res = await prisma.poolWord.createMany({ data: batch });
    added += res.count;
  }
  return { added, total: unique.length };
}

async function seedGuessDictionary(byLength: Record<string, string[]>) {
  const existing = new Set(
    (await prisma.guessDictionary.findMany({ select: { word: true } })).map((w) => w.word)
  );
  let added = 0;
  let total = 0;
  for (const [lenStr, words] of Object.entries(byLength)) {
    const length = Number(lenStr);
    const unique = Array.from(new Set(words.map(normalize))).filter(Boolean);
    total += unique.length;
    const rows = unique.filter((w) => !existing.has(w)).map((word) => ({ word, length }));
    for (const batch of chunk(rows, 500)) {
      const res = await prisma.guessDictionary.createMany({ data: batch });
      added += res.count;
    }
    for (const r of rows) existing.add(r.word);
  }
  return { added, total };
}

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, autoModeEnabled: false, autoModeLength: 5 },
  });

  const starter = await seedPoolWords(STARTER_WORDS);
  console.log(`Word pool (starter list): ${starter.added} added (${starter.total} unique).`);

  const answersPath = path.join(__dirname, "data", "answers-5.json");
  if (fs.existsSync(answersPath)) {
    const data = JSON.parse(fs.readFileSync(answersPath, "utf-8")) as {
      rankedCount: number;
      words: string[];
    };
    const curated = data.words.slice(0, data.rankedCount);
    const result = await seedPoolWords(curated);
    console.log(
      `Word pool (curated 5-letter, from Persian news-corpus frequency): ${result.added} added (${result.total} candidates).`
    );
  } else {
    console.log("prisma/data/answers-5.json not found, skipping curated 5-letter pool import.");
  }

  const dictPath = path.join(__dirname, "data", "dictionary.json");
  if (fs.existsSync(dictPath)) {
    const dict = JSON.parse(fs.readFileSync(dictPath, "utf-8")) as Record<string, string[]>;
    const result = await seedGuessDictionary(dict);
    console.log(`Guess dictionary: ${result.added} added (${result.total} candidates across lengths 3-9).`);
  } else {
    console.log("prisma/data/dictionary.json not found, skipping guess-dictionary import.");
  }

  const superadminUsername = process.env.SEED_SUPERADMIN_USERNAME || "superadmin";
  const existingSuper = await prisma.adminUser.findUnique({
    where: { username: superadminUsername },
  });

  if (!existingSuper) {
    const password = process.env.SEED_SUPERADMIN_PASSWORD || randomPassword();
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.create({
      data: {
        username: superadminUsername,
        passwordHash,
        role: "SUPERADMIN",
      },
    });
    console.log("=================================================");
    console.log("ADMIN SUPERADMIN CREATED");
    console.log(`username: ${superadminUsername}`);
    console.log(`password: ${password}`);
    console.log("Save this now — it will not be shown again.");
    console.log("=================================================");
  } else {
    console.log("Superadmin already exists, skipping.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
