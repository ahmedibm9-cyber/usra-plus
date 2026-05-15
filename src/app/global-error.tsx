'use client'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  // Log the error for debugging
  console.error('[USRA PLUS] Global error caught:', error)

  return (
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>USRA PLUS - Error</title>
      </head>
      <body style={{
        margin: 0,
        padding: '1.5rem',
        minHeight: '100vh',
        background: '#0B0B0F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
        }}>
          {/* Logo */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0D9488, #0F766E)',
            marginBottom: '24px',
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 6L16 2L24 6V14L16 18L8 14V6Z" fill="white" fillOpacity="0.9"/>
              <path d="M4 16L16 22L28 16V24L16 30L4 24V16Z" fill="white" fillOpacity="0.6"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#E5E7EB',
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}>
            USRA PLUS
          </h1>

          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#E5E7EB',
            marginBottom: '8px',
          }}>
            Critical Error
          </h2>

          <p style={{
            fontSize: '14px',
            color: '#9CA3AF',
            marginBottom: '24px',
            lineHeight: '1.6',
          }}>
            A critical error occurred and the application needs to reload. Your data is safe.
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0D9488, #0F766E)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 16h5v5"/>
            </svg>
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
