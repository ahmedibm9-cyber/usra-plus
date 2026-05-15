'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

function isChunkLoadError(err: Error): boolean {
  return (
    err.name === 'ChunkLoadError' ||
    /loading css chunk/i.test(err.message) ||
    /loading chunk/i.test(err.message) ||
    /failed to fetch dynamically imported module/i.test(err.message)
  )
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[USRA PLUS] Page error caught:', error)

    // Auto-recover from ChunkLoadError: this happens when a new deployment
    // invalidates old JS/CSS chunks. A simple page reload fetches the new assets.
    if (isChunkLoadError(error)) {
      console.warn('[USRA PLUS] ChunkLoadError detected — auto-reloading to fetch updated assets')
      // Short delay so the user sees a brief flash before reload
      const timer = setTimeout(() => {
        window.location.reload()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #0B0B0F)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
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
          color: 'var(--text-primary, #E5E7EB)',
          marginBottom: '8px',
          letterSpacing: '-0.02em',
        }}>
          USRA PLUS
        </h1>

        <h2 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--text-primary, #E5E7EB)',
          marginBottom: '8px',
        }}>
          Something went wrong
        </h2>

        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary, #9CA3AF)',
          marginBottom: '8px',
          lineHeight: '1.6',
        }}>
          An unexpected error occurred while loading this page. This is usually temporary.
        </p>

        {error?.message && (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-muted, #8B93A1)',
            marginBottom: '24px',
            padding: '8px 12px',
            background: 'var(--bg-surface, #111117)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            wordBreak: 'break-word',
          }}>
            {error.message}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 24px',
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
            Try Again
          </button>

          <button
            onClick={() => window.location.href = '/'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '10px',
              background: 'var(--bg-surface, #111117)',
              color: 'var(--text-primary, #E5E7EB)',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
