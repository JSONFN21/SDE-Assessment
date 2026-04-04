-- AlterTable
ALTER TABLE "Subtask" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
