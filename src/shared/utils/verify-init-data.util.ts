import { createHmac } from 'crypto';

export type VerifyInitDataParams = {
  initData?: string;
  botToken: string;
};

export function verifyInitData(params: VerifyInitDataParams): boolean {
  const { initData, botToken } = params;

  try {
    const initDataParams = new URLSearchParams(initData);
    const hash = initDataParams.get('hash');
    const data = Array.from(initDataParams.keys())
      .filter((key) => key !== 'hash')
      .sort()
      .map((key) => `${key}=${initDataParams.get(key)}`)
      .join('\n');
    const key = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = createHmac('sha256', key).update(data).digest('hex');

    return hash === hmac;
  } catch {
    return false;
  }
}
