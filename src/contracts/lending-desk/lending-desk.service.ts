import { Injectable } from '@nestjs/common';
import { LendingDeskConfig } from 'src/shared/configs/lending-desk.config';
import { CollateralNftService } from '../collateral-nft/collateral-nft.service';
import { CollateralNftConfig } from 'src/shared/configs/collateral-nft.config';
import { decodeEventLog, encodeEventTopics } from 'viem';
import LENDING_DESK_ABI from './abis/lending-desk.abi.json';
import ERC20_ABI from './abis/erc20.abi.json';

@Injectable()
export class LendingDeskService {
  constructor(
    private readonly lendingDeskConfig: LendingDeskConfig,
    private readonly collateralNftService: CollateralNftService,
    private readonly collateralNftConfig: CollateralNftConfig,
  ) {}

  getNewInitializedLoanFromLogs(logs: any): {
    lendingDeskId: bigint;
    loanId: bigint;
    borrower: string;
    nftCollection: string;
    nftId: bigint;
    amount: bigint;
    duration: bigint;
    interest: bigint;
    platformFee: bigint;
  } {
    const { contractAddress } = this.lendingDeskConfig;

    const filteredLogs = logs.filter(
      ({ address, topics }) =>
        address === contractAddress.toLowerCase() &&
        topics.indexOf(
          encodeEventTopics({
            abi: LENDING_DESK_ABI,
            eventName: 'NewLoanInitialized',
          })[0],
        ) > -1,
    );

    return (
      decodeEventLog({
        abi: LENDING_DESK_ABI,
        ...filteredLogs[0],
      }) as any
    ).args;
  }

  initializeNewLoanCallData(params: {
    lendingDeskId: bigint;
    nftId: bigint;
    duration: number;
    amount: bigint;
    maxInterestAllowed: number;
  }): any[] {
    const { contractAddress } = this.lendingDeskConfig;
    const { contractAddress: nftCollection } = this.collateralNftConfig;

    const { lendingDeskId, nftId, duration, amount, maxInterestAllowed } =
      params;

    return [
      this.collateralNftService.approveCall(contractAddress, nftId),
      {
        abi: LENDING_DESK_ABI,
        functionName: 'initializeNewLoan',
        to: contractAddress,
        args: [
          lendingDeskId,
          nftCollection,
          nftId,
          duration,
          amount,
          maxInterestAllowed,
        ],
      },
    ];
  }

  async makeLoanPaymentCallData(params: {
    publicClient: any;
    loanId: bigint;
    amount: bigint;
    resolve: boolean;
  }): Promise<any[]> {
    const { contractAddress, erc20ContractAddress } = this.lendingDeskConfig;

    const { publicClient, loanId, amount, resolve } = params;

    return [
      {
        abi: ERC20_ABI,
        functionName: 'approve',
        to: erc20ContractAddress,
        args: [
          contractAddress,
          resolve ? await this.getLoanAmountDue(publicClient, loanId) : amount,
        ],
      },
      {
        abi: LENDING_DESK_ABI,
        functionName: 'makeLoanPayment',
        to: contractAddress,
        args: [loanId, resolve ? 0n : amount, resolve],
      },
    ];
  }

  async erc20Balance(publicClient: any, owner: string) {
    const { erc20ContractAddress } = this.lendingDeskConfig;

    return await publicClient.readContract({
      address: erc20ContractAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [owner],
    });
  }

  async loans(publicClient: any, loanId: bigint) {
    const { contractAddress } = this.lendingDeskConfig;

    return await publicClient.readContract({
      address: contractAddress,
      abi: LENDING_DESK_ABI,
      functionName: 'loans',
      args: [loanId],
    });
  }

  async lendingDeskLoanConfigs(
    publicClient: any,
    lendingDeskId: bigint,
  ): Promise<{
    nftCollection: string;
    nftCollectionIsErc1155: boolean;
    minAmount: bigint;
    maxAmount: bigint;
    minInterest: number;
    maxInterest: number;
    minDuration: number;
    maxDuration: number;
  }> {
    const { contractAddress } = this.lendingDeskConfig;

    const [
      nftCollection,
      nftCollectionIsErc1155,
      minAmount,
      maxAmount,
      minInterest,
      maxInterest,
      minDuration,
      maxDuration,
    ] = await publicClient.readContract({
      address: contractAddress,
      abi: LENDING_DESK_ABI,
      functionName: 'lendingDeskLoanConfigs',
      args: [lendingDeskId, this.collateralNftConfig.contractAddress],
    });

    return {
      nftCollection,
      nftCollectionIsErc1155,
      minAmount,
      maxAmount,
      minInterest,
      maxInterest,
      minDuration,
      maxDuration,
    };
  }

  async getLoanAmountDue(publicClient: any, loanId: bigint): Promise<bigint> {
    const { contractAddress } = this.lendingDeskConfig;

    return await publicClient.readContract({
      address: contractAddress,
      abi: LENDING_DESK_ABI,
      functionName: 'getLoanAmountDue',
      args: [loanId],
    });
  }

  async erc20Symbol(publicClient: any) {
    const { erc20ContractAddress } = this.lendingDeskConfig;

    return await publicClient.readContract({
      address: erc20ContractAddress,
      abi: ERC20_ABI,
      functionName: 'symbol',
      args: [],
    });
  }

  async erc20Decimals(publicClient: any) {
    const { erc20ContractAddress } = this.lendingDeskConfig;

    return await publicClient.readContract({
      address: erc20ContractAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
      args: [],
    });
  }
}
