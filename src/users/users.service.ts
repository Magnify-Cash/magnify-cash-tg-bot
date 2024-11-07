import { Injectable, Logger } from '@nestjs/common';
import { Loan, Prisma, User, VerificationLevel } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { VerifyProofDto } from 'src/world-id/dtos/verify-proof.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getFirstActiveLoanByUserId(
    userId: number,
    include?: Prisma.LoanInclude,
  ): Promise<Loan> {
    return await this.prismaService.loan.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        loanId: 'asc',
      },
      include,
    });
  }

  async getById(id: number, include?: Prisma.UserInclude): Promise<User> {
    return await this.prismaService.user.findUnique({
      where: {
        id,
      },
      include,
    });
  }

  async getByNullifierHash(verificationNullifierHash: string): Promise<User> {
    return await this.prismaService.user.findUnique({
      where: {
        verificationNullifierHash,
      },
    });
  }

  async create(
    id: number,
    address: string,
    coinbaseSmartWalletAddress: string,
    mnemonic: string,
    privateKey: string,
  ) {
    return await this.prismaService.user.create({
      data: {
        id,
        wallet: {
          create: {
            address,
            coinbaseSmartWalletAddress,
            mnemonic,
            privateKey,
          },
        },
      },
    });
  }

  async createVerification(
    id: number,
    dto: VerifyProofDto,
    mintResult: {
      txHash: string;
      sbtId: bigint;
      collateralNftId: bigint;
    },
  ) {
    const { nullifier_hash, merkle_root, proof, verification_level } =
      dto.proof;

    await this.prismaService.verification.create({
      data: {
        ...mintResult,
        nullifierHash: nullifier_hash,
        merkleRoot: merkle_root,
        proof,
        verificationLevel: verification_level as VerificationLevel,
        signal: dto.signal,
        user: {
          connect: {
            id,
          },
        },
      },
    });
  }
}
