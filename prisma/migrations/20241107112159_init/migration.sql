-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('orb');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'DEFAULTED');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGINT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "verificationNullifierHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_wallets" (
    "address" TEXT NOT NULL,
    "coinbaseSmartWalletAddress" TEXT NOT NULL,
    "mnemonic" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "verifications" (
    "nullifierHash" TEXT NOT NULL,
    "verificationLevel" "VerificationLevel" NOT NULL DEFAULT 'orb',
    "proof" TEXT NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "signal" TEXT,
    "txHash" TEXT NOT NULL,
    "sbtId" BIGINT NOT NULL,
    "collateralNftId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("nullifierHash")
);

-- CreateTable
CREATE TABLE "user_loans" (
    "loanId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "lendingDeskId" BIGINT NOT NULL,
    "borrower" TEXT NOT NULL,
    "nftCollection" TEXT NOT NULL,
    "nftId" BIGINT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "duration" BIGINT NOT NULL,
    "interest" BIGINT NOT NULL,
    "platformFee" DECIMAL(65,30) NOT NULL,
    "initializeTxHash" TEXT NOT NULL,
    "repayTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_loans_pkey" PRIMARY KEY ("loanId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_verificationNullifierHash_key" ON "users"("verificationNullifierHash");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_txHash_sbtId_collateralNftId_key" ON "verifications"("txHash", "sbtId", "collateralNftId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "user_wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_verificationNullifierHash_fkey" FOREIGN KEY ("verificationNullifierHash") REFERENCES "verifications"("nullifierHash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_loans" ADD CONSTRAINT "user_loans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
