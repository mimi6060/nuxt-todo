-- CreateIndex
CREATE INDEX "Todo_categoryId_completed_idx" ON "Todo"("categoryId", "completed");

-- CreateIndex
CREATE INDEX "Todo_completed_deadline_idx" ON "Todo"("completed", "deadline");
