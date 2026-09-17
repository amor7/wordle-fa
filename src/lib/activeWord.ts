import { prisma } from "./prisma";

export async function getActiveWordEntry() {
  const now = new Date();
  return prisma.wordEntry.findFirst({
    where: {
      endedEarly: false,
      activatesAt: { lte: now },
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
}
