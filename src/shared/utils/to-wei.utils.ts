import { parseUnits } from 'viem';

export const toWei = (value: string, decimals: number | undefined): bigint => {
  if (decimals !== undefined) {
    return parseUnits(value, decimals);
  }

  return BigInt(0);
};
