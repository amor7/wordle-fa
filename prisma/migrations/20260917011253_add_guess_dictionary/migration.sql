-- CreateTable
CREATE TABLE "GuessDictionary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "length" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GuessDictionary_word_key" ON "GuessDictionary"("word");

-- CreateIndex
CREATE INDEX "GuessDictionary_length_idx" ON "GuessDictionary"("length");
