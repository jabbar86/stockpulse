import { createHash } from 'crypto';

const KITE_API_BASE = 'https://api.kite.trade';

function getConfig() {
  const apiKey = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      'Missing Zerodha configuration. Set KITE_API_KEY and KITE_API_SECRET environment variables.'
    );
  }

  return { apiKey, apiSecret };
}

export function getLoginUrl(): string {
  const { apiKey } = getConfig();
  return `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
}

export async function generateSession(
  requestToken: string
): Promise<{ access_token: string; public_token: string }> {
  const { apiKey, apiSecret } = getConfig();

  // SHA-256 checksum of: api_key + request_token + api_secret
  const checksum = createHash('sha256')
    .update(apiKey + requestToken + apiSecret)
    .digest('hex');

  const response = await fetch(`${KITE_API_BASE}/session/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Kite-Version': '3',
    },
    body: new URLSearchParams({
      api_key: apiKey,
      request_token: requestToken,
      checksum,
    }).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Zerodha session generation failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  return {
    access_token: data.data?.access_token,
    public_token: data.data?.public_token,
  };
}

export async function fetchHoldings(
  accessToken: string
): Promise<any[]> {
  const { apiKey } = getConfig();

  const response = await fetch(`${KITE_API_BASE}/portfolio/holdings`, {
    method: 'GET',
    headers: {
      'X-Kite-Version': '3',
      Authorization: `token ${apiKey}:${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Zerodha fetch holdings failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  return data.data ?? [];
}
