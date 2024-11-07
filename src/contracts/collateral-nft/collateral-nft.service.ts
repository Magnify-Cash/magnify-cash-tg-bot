import { Injectable, Logger } from '@nestjs/common';
import { CollateralNftConfig } from 'src/shared/configs/collateral-nft.config';
import { decodeEventLog, encodeEventTopics, Hex } from 'viem';

import COLLATERAL_NFT_ABI from './abis/collateral-nft.abi.json';

@Injectable()
export class CollateralNftService {
  private readonly logger = new Logger(CollateralNftService.name);

  constructor(private readonly collateralNftConfig: CollateralNftConfig) {}

  mintCallData(address: Hex): any {
    const { contractAddress } = this.collateralNftConfig;

    return {
      abi: COLLATERAL_NFT_ABI,
      functionName: 'mint',
      to: contractAddress,
      args: [address],
    };
  }

  approveCall(to: string, tokenId: bigint): any {
    const { contractAddress } = this.collateralNftConfig;

    return {
      abi: COLLATERAL_NFT_ABI,
      functionName: 'approve',
      to: contractAddress,
      args: [to, tokenId],
    };
  }

  getTokenIdFromLogs(logs: any): bigint {
    const { contractAddress } = this.collateralNftConfig;

    if (!logs?.length) {
      return 0n;
    }

    const filteredLogs = logs.filter(
      ({ address, topics }) =>
        address === contractAddress.toLowerCase() &&
        topics.indexOf(
          encodeEventTopics({
            abi: COLLATERAL_NFT_ABI,
            eventName: 'Transfer',
          })[0],
        ) > -1,
    );

    return filteredLogs.length
      ? (
          decodeEventLog({
            abi: COLLATERAL_NFT_ABI,
            ...filteredLogs[0],
          }) as any
        ).args.tokenId
      : 0n;
  }

  async getTokenId(publicClient: any, sbtId: bigint): Promise<bigint> {
    const { contractAddress } = this.collateralNftConfig;

    return await publicClient.readContract({
      address: contractAddress,
      abi: COLLATERAL_NFT_ABI,
      functionName: 'collateralBySBT',
      args: [sbtId],
    });
  }
}
