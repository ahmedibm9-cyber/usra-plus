'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Copy, Check, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/use-translation'

interface QRCodeProps {
  /** The data to encode (URL, text, etc.) */
  value: string
  /** Display label above the QR code */
  label?: string
  /** QR code size in pixels */
  size?: number
  /** Foreground color for the QR modules */
  fgColor?: string
  /** Background color */
  bgColor?: string
  /** Show action buttons (download, copy link) */
  showActions?: boolean
  /** File name for download (without extension) */
  downloadName?: string
  /** Extra className on the wrapper */
  className?: string
}

/**
 * Reusable QR code component.
 * Generates a QR code from `value`, renders it on a canvas,
 * and optionally shows download / copy-link actions.
 */
export function QRCodeDisplay({
  value,
  label,
  size = 200,
  fgColor,
  bgColor = '#FFFFFF',
  showActions = true,
  downloadName = 'qrcode',
  className = '',
}: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [ready, setReady] = useState(false)
  const { t, isRTL } = useI18n()

  // Auto-detect theme for foreground color if not explicitly provided
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const resolvedFgColor = fgColor ?? (isDark ? '#F5F5F0' : '#0A0A0A')

  useEffect(() => {
    if (!canvasRef.current || !value) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark: resolvedFgColor,
        light: bgColor,
      },
      errorCorrectionLevel: 'M',
    })
      .then(() => setReady(true))
      .catch(() => {
        // Canvas stays empty
      })
  }, [value, size, resolvedFgColor, bgColor])

  const handleDownload = useCallback(async () => {
    try {
      const dataUrl = await QRCode.toDataURL(value, {
        width: 512,
        margin: 3,
        color: { dark: resolvedFgColor, light: bgColor },
        errorCorrectionLevel: 'M',
      })
      const link = document.createElement('a')
      link.download = `${downloadName}.png`
      link.href = dataUrl
      link.click()
      toast.success(isRTL ? 'تم تنزيل رمز QR' : 'QR code downloaded')
    } catch {
      toast.error(isRTL ? 'فشل تنزيل رمز QR' : 'Failed to download QR code')
    }
  }, [value, resolvedFgColor, bgColor, downloadName, isRTL])

  const handleCopyLink = useCallback(() => {
    try {
      navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(t.common.copied)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t.common.error)
    }
  }, [value, t.common.copied, t.common.error])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: label || 'USRA PLUS', url: value })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink()
    }
  }, [label, value, handleCopyLink])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center ${className}`}
    >
      {label && (
        <h4 className="text-[--text-primary] text-sm font-semibold mb-2 text-center">
          {label}
        </h4>
      )}

      {/* QR Code canvas with white background for scannability */}
      <div className="bg-white rounded-xl p-3 shadow-[0_0_24px_-4px_rgba(229,9,20,0.08)] relative">
        <canvas
          ref={canvasRef}
          className="block"
          style={{ width: size, height: size }}
        />
        {/* Fade-in overlay while generating */}
        {!ready && (
          <div className="absolute inset-3 bg-white animate-pulse rounded-lg" />
        )}
      </div>

      {showActions && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
              bg-[--bg-surface-2] text-[--text-secondary] hover:bg-[--border-medium]
              transition-colors min-h-[44px]"
            aria-label={isRTL ? 'نسخ الرابط' : 'Copy link'}
          >
            {copied ? (
              <Check className="size-4 text-green-400" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied
              ? isRTL
                ? 'تم النسخ'
                : 'Copied'
              : isRTL
                ? 'نسخ الرابط'
                : 'Copy Link'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
              bg-[--bg-surface-2] text-[--text-secondary] hover:bg-[--border-medium]
              transition-colors min-h-[44px]"
            aria-label={isRTL ? 'تنزيل' : 'Download'}
          >
            <Download className="size-4" />
            {isRTL ? 'تنزيل' : 'Download'}
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                bg-[--bg-surface-2] text-[--text-secondary] hover:bg-[--border-medium]
                transition-colors min-h-[44px]"
              aria-label={isRTL ? 'مشاركة' : 'Share'}
            >
              <Share2 className="size-4" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
