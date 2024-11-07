import { Injectable, Logger } from '@nestjs/common';
import { SbtConfig } from 'src/shared/configs/sbt.config copy';
import { Proof } from 'src/world-id/dtos/verify-proof.dto';
import { decodeEventLog, encodeEventTopics, Hex } from 'viem';

import SBT_ABI from './abis/sbt.abi.json';

@Injectable()
export class SbtService {
  private readonly logger = new Logger(SbtService.name);

  constructor(private readonly sbtConfig: SbtConfig) {}

  mintCallData(address: Hex, proof: Proof, signal?: string): any {
    const { contractAddress } = this.sbtConfig;

    return {
      abi: SBT_ABI,
      functionName: 'mint',
      to: contractAddress,
      args: [address, JSON.stringify({ proof, signal })],
    };
  }

  getTokenIdFromLogs(logs: any): bigint {
    const { contractAddress } = this.sbtConfig;

    if (!logs?.length) {
      return 0n;
    }

    const filteredLogs = logs.filter(
      ({ address, topics }) =>
        address === contractAddress.toLowerCase() &&
        topics.indexOf(
          encodeEventTopics({
            abi: SBT_ABI,
            eventName: 'Transfer',
          })[0],
        ) > -1,
    );

    return filteredLogs.length
      ? (
          decodeEventLog({
            abi: SBT_ABI,
            ...filteredLogs[0],
          }) as any
        ).args.tokenId
      : 0n;
  }

  async getTokenId(publicClient: any, address: string): Promise<bigint> {
    const { contractAddress } = this.sbtConfig;

    return await publicClient.readContract({
      address: contractAddress,
      abi: SBT_ABI,
      functionName: 'tokenByAccount',
      args: [address],
    });
  }
}
