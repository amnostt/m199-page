-- DropForeignKey
ALTER TABLE "VerseRevision" DROP CONSTRAINT "VerseRevision_verseId_fkey";

-- AddForeignKey
ALTER TABLE "VerseRevision" ADD CONSTRAINT "VerseRevision_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
