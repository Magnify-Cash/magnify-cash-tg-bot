import { Coinbase } from '@coinbase/coinbase-sdk';
import { Injectable, Logger } from '@nestjs/common';
import { CoinbaseConfig } from 'src/shared/configs/coinbase.config';
import { createPublicClient, Hex, http } from 'viem';
import {
  createBundlerClient,
  toCoinbaseSmartAccount,
} from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { CollateralNftService } from 'src/contracts/collateral-nft/collateral-nft.service';
import { SbtService } from 'src/contracts/sbt/sbt.service';
import { Proof } from 'src/world-id/dtos/verify-proof.dto';
import { LendingDeskService } from 'src/contracts/lending-desk/lending-desk.service';

@Injectable()
export class CoinbaseService {
  private readonly logger = new Logger(CoinbaseService.name);

  private readonly publicClient: any;
  private readonly bundlerClient: any;

  constructor(
    private readonly coinbaseConfig: CoinbaseConfig,
    private readonly collateralNftService: CollateralNftService,
    private readonly sbtService: SbtService,
    private readonly lendingDeskService: LendingDeskService,
  ) {
    const { apiKeyName, privateKey, rpcUrl } = this.coinbaseConfig;

    Coinbase.configure({
      apiKeyName,
      privateKey,
    });

    const clientParams = {
      chain: rpcUrl.includes(Coinbase.networks.BaseSepolia)
        ? baseSepolia
        : base,
      transport: http(rpcUrl),
    };

    this.publicClient = createPublicClient(clientParams);
    this.bundlerClient = createBundlerClient(clientParams);
  }

  async getLoanConfig(lendingDeskId: bigint) {
    return await this.lendingDeskService.lendingDeskLoanConfigs(
      this.publicClient,
      lendingDeskId,
    );
  }

  async getBalance(address: string): Promise<bigint> {
    return await this.lendingDeskService.erc20Balance(
      this.publicClient,
      address,
    );
  }

  async toCoinbaseSmartAccount(privateKey: Hex): Promise<any> {
    return await toCoinbaseSmartAccount({
      client: this.publicClient as never,
      owners: [privateKeyToAccount(privateKey)],
    });
  }

  async mintSbtAndCollateralNft(
    address: Hex,
    proof: Proof,
    signal?: string,
  ): Promise<{
    txHash: string;
    sbtId: bigint;
    collateralNftId: bigint;
  }> {
    const { minterPrivateKey } = this.coinbaseConfig;

    try {
      const account = await this.toCoinbaseSmartAccount(minterPrivateKey);

      account.userOperation = {
        estimateGas: async (userOperation: any) => {
          const estimate =
            await this.bundlerClient.estimateUserOperationGas(userOperation);

          estimate.preVerificationGas = estimate.preVerificationGas * 2n;

          return estimate;
        },
      };

      const calls = [
        this.sbtService.mintCallData(address, proof, signal),
        this.collateralNftService.mintCallData(address),
      ];

      const userOpHash = await this.bundlerClient.sendUserOperation({
        account,
        calls,
        paymaster: true,
      });

      const { receipt } = await this.bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });
      const { logs, transactionHash } = receipt;

      return {
        txHash: transactionHash,
        sbtId: this.sbtService.getTokenIdFromLogs(logs),
        collateralNftId: this.collateralNftService.getTokenIdFromLogs(logs),
      };
    } catch (error) {
      // TODO: enhance error handling

      this.logger.error(
        `Unable to mint SBT & Collateral NFT to ${address}: ${error}`,
        error?.stack,
      );

      throw error;
    }
  }

  async initializeNewLoan(
    account: any,
    params: {
      lendingDeskId: bigint;
      nftId: bigint;
      duration: number;
      amount: bigint;
      maxInterestAllowed: number;
    },
  ) {
    try {
      account.userOperation = {
        estimateGas: async (userOperation: any) => {
          const estimate =
            await this.bundlerClient.estimateUserOperationGas(userOperation);

          estimate.preVerificationGas = estimate.preVerificationGas * 2n;

          return estimate;
        },
      };

      const calls = [
        ...this.lendingDeskService.initializeNewLoanCallData(params),
      ];

      const userOpHash = await this.bundlerClient.sendUserOperation({
        account,
        calls,
        paymaster: true,
      });

      const { receipt } = await this.bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });
      const { logs, transactionHash } = receipt;

      return {
        txHash: transactionHash,
        loanData: this.lendingDeskService.getNewInitializedLoanFromLogs(logs),
      };
    } catch (error) {
      // TODO: enhance error handling

      this.logger.error(
        `Unable to initialize new loan (${JSON.stringify(params, null, 2)}) by ${account.address}: ${error}`,
        error?.stack,
      );

      throw error;
    }
  }

  async makeLoanPayment(
    account: any,
    params: {
      loanId: bigint;
      amount: bigint;
      resolve: boolean;
    },
  ) {
    try {
      account.userOperation = {
        estimateGas: async (userOperation: any) => {
          const estimate =
            await this.bundlerClient.estimateUserOperationGas(userOperation);

          estimate.preVerificationGas = estimate.preVerificationGas * 2n;

          return estimate;
        },
      };

      const calls = [
        ...(await this.lendingDeskService.makeLoanPaymentCallData({
          ...params,
          publicClient: this.publicClient,
        })),
      ];

      const userOpHash = await this.bundlerClient.sendUserOperation({
        account,
        calls,
        paymaster: true,
      });

      const { receipt } = await this.bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      return {
        txHash: receipt.transactionHash,
      };
    } catch (error) {
      // TODO: enhance error handling

      this.logger.error(
        `Unable to make loan payment (${JSON.stringify(params, null, 2)}) by ${account.address}: ${error}`,
        error?.stack,
      );

      throw error;
    }
  }

  async getLoanAmountDue(loanId: bigint) {
    return await this.lendingDeskService.getLoanAmountDue(
      this.publicClient,
      loanId,
    );
  }

  async loanInfo(loanId: bigint): Promise<{
    amount: bigint;
    amountPaidBack: bigint;
    nftCollection: string;
    startTime: bigint;
    nftId: bigint;
    lendingDeskId: bigint;
    duration: number;
    interest: number;
    status: number;
    nftCollectionIsErc1155: boolean;
  }> {
    const args = await this.lendingDeskService.loans(this.publicClient, loanId);

    return {
      amount: args[0],
      amountPaidBack: args[1],
      nftCollection: args[2],
      startTime: args[3],
      nftId: args[4],
      lendingDeskId: args[5],
      duration: args[6],
      interest: args[7],
      status: args[8],
      nftCollectionIsErc1155: args[9],
    };
  }
}
