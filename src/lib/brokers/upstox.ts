const UPSTOX_API_BASE = 'https://api.upstox.com/v2';

function getConfig() {
  const apiKey = process.env.UPSTOX_API_KEY;
  const apiSecret = process.env.UPSTOX_API_SECRET;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI;

  if (!apiKey || !apiSecret || !redirectUri) {
    throw new Error(
      'Missing Upstox configuration. Set UPSTOX_API_KEY, UPSTOX_API_SECRET, and UPSTOX_REDIRECT_URI environment variables.'
    );
  }

  return { apiKey, apiSecret, redirectUri };
}

export function getAuthUrl(): string {
  const { apiKey, redirectUri } = getConfig();

  const params = new URLSearchParams({
    client_id: apiKey,
    redirect_uri: redirectUri,
    response_type: 'code',
  });

  return `https://api.upstox.com/v2/login/authorization/dialog?${params.toString()}`;
}

export async function exchangeToken(
  code: string
): Promise<{ access_token: string; expires_in: number }> {
  const { apiKey, apiSecret, redirectUri } = getConfig();

  const response = await fetch(`${UPSTOX_API_BASE}/login/authorization/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      code,
      client_id: apiKey,
      client_secret: apiSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Upstox token exchange failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in ?? 86400,
  };
}

export async function fetchHoldings(
  accessToken: string
): Promise<any[]> {
  const response = await fetch(`${UPSTOX_API_BASE}/portfolio/long-term-holdings`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Upstox fetch holdings failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  return data.data ?? [];
}
