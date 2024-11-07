import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { WorldIdConfig } from 'src/shared/configs/world-coin.config';
import { WebAppUser } from 'src/shared/decorators/init-data.decorator';
import { VerifyProofDto } from './dtos/verify-proof.dto';
import {
  IVerifyResponse,
  verifyCloudProof,
} from '@worldcoin/idkit-core/backend';
import { Hex } from 'viem';
import { TelegramBotService } from 'src/telegram-bot/telegram-bot.service';
import { UsersService } from 'src/users/users.service';
import { CoinbaseService } from 'src/coinbase/coinbase.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorldIdService {
  private readonly logger = new Logger(WorldIdService.name);

  constructor(
    private readonly worldIdConfig: WorldIdConfig,
    private readonly telegramBotService: TelegramBotService,
    private readonly usersService: UsersService,
    private readonly coinbaseService: CoinbaseService,
  ) {}

  async renderVerifyPage() {
    const { appId, action } = this.worldIdConfig;

    return {
      appId,
      action,
    };
  }

  async verifyProof(
    currentUser: WebAppUser,
    dto: VerifyProofDto,
  ): Promise<void> {
    const { appId, action } = this.worldIdConfig;

    const { id } = currentUser;
    const { proof, signal } = dto;

    if (id.toFixed() !== signal) {
      throw new BadRequestException('Invalid signal');
    }

    const user = (await this.usersService.getById(id, {
      wallet: true,
    })) as Prisma.UserGetPayload<{
      include: {
        wallet: true;
      };
    }>;
    const { verificationNullifierHash } = user;

    if (verificationNullifierHash) {
      await this.telegramBotService.handleVerifyProof(id, false);

      throw new BadRequestException('Account has already been verified');
    }

    if (await this.usersService.getByNullifierHash(dto.proof.nullifier_hash)) {
      await this.telegramBotService.handleVerifyProof(id, false);

      throw new BadRequestException('ORB cannot be used more than once');
    }

    let verificationResult: IVerifyResponse;
    try {
      verificationResult = await verifyCloudProof(proof, appId, action, signal);

      if (!verificationResult?.success) {
        this.logger.error(
          `Cloud proof verification failed for user ${id}: ${JSON.stringify(verificationResult, null, 2)}`,
        );

        await this.telegramBotService.handleVerifyProof(id, false);

        return;
      }
    } catch (error) {
      this.logger.error(`Unable to verify cloud proof: ${error}`, error?.stack);

      throw error;
    }

    const { coinbaseSmartWalletAddress } = user.wallet;

    this.logger.debug(
      `Processing [mintSbtAndCollateralNft] User: ${coinbaseSmartWalletAddress}. Data: ${JSON.stringify(dto, null, 2)}...`,
    );

    const mintResult = await this.coinbaseService.mintSbtAndCollateralNft(
      coinbaseSmartWalletAddress as Hex,
      proof,
      signal,
    );

    this.logger.debug(
      `Completed [mintSbtAndCollateralNft] User: ${coinbaseSmartWalletAddress}. Data: ${JSON.stringify(dto, null, 2)}. Mint Data: ${JSON.stringify(mintResult, null, 2)}`,
    );

    await this.usersService.createVerification(id, dto, mintResult);

    await this.telegramBotService.handleVerifyProof(id, true);
  }
}
