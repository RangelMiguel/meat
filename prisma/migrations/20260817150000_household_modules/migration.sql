-- CreateTable
CREATE TABLE "HouseholdModule" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installedById" TEXT,

    CONSTRAINT "HouseholdModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdModule_householdId_moduleId_key" ON "HouseholdModule"("householdId", "moduleId");

-- CreateIndex
CREATE INDEX "HouseholdModule_householdId_idx" ON "HouseholdModule"("householdId");

-- AddForeignKey
ALTER TABLE "HouseholdModule" ADD CONSTRAINT "HouseholdModule_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
