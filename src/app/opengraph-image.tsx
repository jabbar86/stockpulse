import { ImageResponse } from 'next/og';

export const alt = 'StockPulse — AI stock analysis for Indian markets';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #1e3a5f 0%, #2563eb 42%, #1e3a5f 100%)',
          padding: 72,
          color: '#f8fafc',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(59, 130, 246, 0.3)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
            }}
          />
          <span style={{ fontSize: 58, fontWeight: 800, letterSpacing: '-0.05em' }}>StockPulse</span>
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 600,
            maxWidth: 900,
            lineHeight: 1.25,
            opacity: 0.95,
          }}
        >
          AI-powered portfolio insights for NSE & BSE
        </div>
        <div style={{ fontSize: 22, marginTop: 36, opacity: 0.55, fontWeight: 500 }}>
          Technicals · Market overview · Mutual funds · Broker connect
        </div>
      </div>
    ),
    { ...size }
  );
}
