import { formatUnits } from 'viem';

export const fromWei = (
  value: bigint,
  decimals: number | undefined,
): string => {
  if (decimals !== undefined) {
    return formatUnits(value, decimals);
  }

  return '0';
};
