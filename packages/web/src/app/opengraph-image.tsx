import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const alt = 'shout.run — Terminal sessions you can share';

export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          padding: 60,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <span style={{ color: '#22c55e', marginRight: 16 }}>&gt;</span>
          <span style={{ color: '#e6edf3', fontWeight: 700 }}>shout</span>
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#8b949e',
            textAlign: 'center',
          }}
        >
          Terminal sessions you can share
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            fontSize: 24,
            color: '#58a6ff',
          }}
        >
          shout.run
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
