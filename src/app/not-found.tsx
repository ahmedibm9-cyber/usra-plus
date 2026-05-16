import Link from 'next/link'

export default function NotFound() {
  return (
    <html lang="en" dir="ltr">
      <head>
        <title>404 — Page Not Found | USRA PLUS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0A0F0D;
            color: #F0FDF9;
            overflow: hidden;
            position: relative;
          }

          /* Animated gradient background */
          .bg-gradient {
            position: fixed;
            inset: 0;
            background:
              radial-gradient(ellipse 80% 60% at 20% 80%, rgba(13,148,136,0.15) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 80% 20%, rgba(16,185,129,0.1) 0%, transparent 60%),
              radial-gradient(ellipse 40% 40% at 50% 50%, rgba(5,150,105,0.05) 0%, transparent 50%);
            z-index: 0;
          }

          /* Floating particles */
          .particle {
            position: fixed;
            border-radius: 50%;
            opacity: 0;
            animation: float 8s ease-in-out infinite;
          }
          .particle:nth-child(1) {
            width: 6px; height: 6px;
            background: #0D9488;
            left: 15%; top: 25%;
            animation-delay: 0s;
          }
          .particle:nth-child(2) {
            width: 4px; height: 4px;
            background: #10B981;
            left: 75%; top: 15%;
            animation-delay: 2s;
          }
          .particle:nth-child(3) {
            width: 8px; height: 8px;
            background: #059669;
            left: 60%; top: 70%;
            animation-delay: 4s;
          }
          .particle:nth-child(4) {
            width: 5px; height: 5px;
            background: #34D399;
            left: 30%; top: 65%;
            animation-delay: 1s;
          }
          .particle:nth-child(5) {
            width: 3px; height: 3px;
            background: #0D9488;
            left: 85%; top: 55%;
            animation-delay: 3s;
          }
          .particle:nth-child(6) {
            width: 7px; height: 7px;
            background: #10B981;
            left: 10%; top: 80%;
            animation-delay: 5s;
          }

          @keyframes float {
            0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
            25% { opacity: 0.6; }
            50% { opacity: 1; transform: translateY(-40px) scale(1); }
            75% { opacity: 0.6; }
          }

          /* Grid pattern overlay */
          .grid-pattern {
            position: fixed;
            inset: 0;
            background-image:
              linear-gradient(rgba(13,148,136,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(13,148,136,0.03) 1px, transparent 1px);
            background-size: 60px 60px;
            z-index: 0;
          }

          /* Main content */
          .container {
            position: relative;
            z-index: 1;
            text-align: center;
            padding: 2rem;
            max-width: 600px;
          }

          /* 404 number */
          .error-code {
            font-size: clamp(6rem, 18vw, 12rem);
            font-weight: 700;
            line-height: 1;
            background: linear-gradient(135deg, #0D9488 0%, #10B981 40%, #34D399 70%, #0D9488 100%);
            background-size: 300% 300%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 6s ease-in-out infinite;
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
          }

          @keyframes shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }

          /* Decorative line */
          .divider {
            width: 80px;
            height: 3px;
            background: linear-gradient(90deg, transparent, #0D9488, transparent);
            margin: 1.5rem auto;
            border-radius: 2px;
          }

          .subtitle {
            font-size: clamp(1.25rem, 3vw, 1.75rem);
            font-weight: 600;
            color: #F0FDF9;
            margin-bottom: 0.75rem;
          }

          .description {
            font-size: clamp(0.875rem, 2vw, 1.0625rem);
            color: #94A3B8;
            line-height: 1.6;
            margin-bottom: 2.5rem;
            max-width: 420px;
            margin-left: auto;
            margin-right: auto;
          }

          /* CTA Button */
          .cta-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 2rem;
            background: linear-gradient(135deg, #0D9488, #059669);
            color: #F0FDF9;
            font-family: 'Space Grotesk', system-ui, sans-serif;
            font-size: 0.9375rem;
            font-weight: 600;
            border: none;
            border-radius: 14px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(13,148,136,0.3), 0 0 0 1px rgba(13,148,136,0.1);
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(13,148,136,0.4), 0 0 0 1px rgba(13,148,136,0.2);
          }
          .cta-button:active {
            transform: translateY(0);
          }

          .cta-arrow {
            transition: transform 0.2s ease;
          }
          .cta-button:hover .cta-arrow {
            transform: translateX(3px);
          }

          /* Secondary link */
          .secondary-link {
            display: inline-block;
            margin-top: 1rem;
            color: #64748B;
            font-size: 0.8125rem;
            text-decoration: none;
            transition: color 0.2s ease;
          }
          .secondary-link:hover {
            color: #0D9488;
          }

          /* Brand */
          .brand {
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75rem;
            color: #475569;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            z-index: 1;
          }
          .brand span {
            color: #0D9488;
            font-weight: 600;
          }
        `}} />
      </head>
      <body>
        <div className="bg-gradient" />
        <div className="grid-pattern" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />

        <main className="container">
          <div className="error-code">404</div>
          <div className="divider" />
          <h1 className="subtitle">Page Not Found</h1>
          <p className="description">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Let&apos;s get you back to your family dashboard.
          </p>
          <Link href="/" className="cta-button">
            Return Home
            <span className="cta-arrow">→</span>
          </Link>
          <br />
          <Link href="/" className="secondary-link">
            Need help? Visit USRA PLUS support
          </Link>
        </main>

        <footer className="brand">
          <span>USRA</span> PLUS
        </footer>
      </body>
    </html>
  )
}
