import { prisma } from "./prisma";
import { nextTehranMidnightUtc } from "./time";

export type RotateResult =
  | { ok: true; created: boolean; reason?: string }
  | { ok: false; reason: string };

/** Ends any currently-active word and (if auto mode is on) activates a new random word from the pool. */
export async function rotateAutoWord(): Promise<RotateResult> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.autoModeEnabled) {
    return { ok: true, created: false, reason: "auto mode is off" };
  }

  const now = new Date();
  await prisma.wordEntry.updateMany({
    where: { endedEarly: false, expiresAt: { gt: now }, activatesAt: { lte: now } },
    data: { endedEarly: true },
  });

  const where = settings.autoModeLength
    ? { used: false, length: settings.autoModeLength }
    : { used: false };

  const count = await prisma.poolWord.count({ where });
  if (count === 0) {
    return { ok: false, reason: "no unused pool words match the length filter" };
  }

  const skip = Math.floor(Math.random() * count);
  const picked = await prisma.poolWord.findFirst({ where, skip, take: 1 });
  if (!picked) return { ok: false, reason: "failed to pick a word" };

  await prisma.poolWord.update({ where: { id: picked.id }, data: { used: true } });

  await prisma.wordEntry.create({
    data: {
      word: picked.word,
      length: picked.length,
      source: "AUTO",
      hidden: true,
      activatesAt: now,
      expiresAt: nextTehranMidnightUtc(now),
    },
  });

  return { ok: true, created: true };
}
