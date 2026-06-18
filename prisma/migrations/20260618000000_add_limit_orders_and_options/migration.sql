-- CreateTable
CREATE TABLE "LimitOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL,
    "limitPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filledAt" TIMESTAMP(3),
    "filledPrice" DOUBLE PRECISION,

    CONSTRAINT "LimitOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "optionType" TEXT NOT NULL,
    "strikePrice" DOUBLE PRECISION NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "contracts" INTEGER NOT NULL,
    "premium" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedPrice" DOUBLE PRECISION,

    CONSTRAINT "OptionPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LimitOrder_userId_idx" ON "LimitOrder"("userId");

-- CreateIndex
CREATE INDEX "LimitOrder_userId_status_idx" ON "LimitOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "OptionPosition_userId_idx" ON "OptionPosition"("userId");

-- CreateIndex
CREATE INDEX "OptionPosition_userId_status_idx" ON "OptionPosition"("userId", "status");

-- AddForeignKey
ALTER TABLE "LimitOrder" ADD CONSTRAINT "LimitOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionPosition" ADD CONSTRAINT "OptionPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
