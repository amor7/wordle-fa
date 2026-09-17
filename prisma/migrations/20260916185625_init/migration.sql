-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WordEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "length" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "activatesAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "endedEarly" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playsStarted" INTEGER NOT NULL DEFAULT 0,
    "playsWon" INTEGER NOT NULL DEFAULT 0,
    "playsLost" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "WordEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PoolWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "length" INTEGER NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "autoModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoModeLength" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "WordEntry_activatesAt_expiresAt_idx" ON "WordEntry"("activatesAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PoolWord_word_key" ON "PoolWord"("word");

-- CreateIndex
CREATE INDEX "PoolWord_length_used_idx" ON "PoolWord"("length", "used");
