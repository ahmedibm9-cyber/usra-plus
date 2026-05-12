'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { Download, Printer, Copy, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/use-translation'

interface FamilyQRCodeProps {
 inviteCode: string
 familyName: string
 size?: number
}

export function FamilyQRCode({ inviteCode, familyName, size = 200 }: FamilyQRCodeProps) {
 const canvasRef = useRef<HTMLCanvasElement>(null)
 const [copied, setCopied] = React.useState(false)
 const { t, isRTL } = useI18n()

 const joinUrl = `https://usraplus.app/join/${inviteCode}`

 useEffect(() => {
  if (!canvasRef.current) return
  // Resolve CSS custom property to actual color value for canvas API
  const computedStyle = getComputedStyle(document.documentElement)
  const darkColor = computedStyle.getPropertyValue('--bg-primary').trim() || '#000000'

  QRCode.toCanvas(canvasRef.current, joinUrl, {
   width: size,
   margin: 2,
   color: {
    dark: darkColor,
    light: '#FFFFFF',
   },
   errorCorrectionLevel: 'M',
  }).catch(() => {
   // QR code generation failed — canvas stays empty
  })
 }, [joinUrl, size])

 const handleDownload = useCallback(async () => {
  try {
   const computedStyle = getComputedStyle(document.documentElement)
   const darkColor = computedStyle.getPropertyValue('--bg-primary').trim() || '#000000'

   const dataUrl = await QRCode.toDataURL(joinUrl, {
    width: 512,
    margin: 3,
    color: {
     dark: darkColor,
     light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
   })
   const link = document.createElement('a')
   link.download = `usra-plus-${familyName.toLowerCase().replace(/\s+/g, '-')}-invite.png`
   link.href = dataUrl
   link.click()
   toast.success(isRTL ? 'تم تنزيل رمز QR' : 'QR code downloaded')
  } catch {
   toast.error(isRTL ? 'فشل تنزيل رمز QR' : 'Failed to download QR code')
  }
 }, [joinUrl, familyName, isRTL])

 const handlePrint = useCallback(() => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
   toast.error(isRTL ? 'فشل فتح نافذة الطباعة' : 'Failed to open print window')
   return
  }
  const computedStyle = getComputedStyle(document.documentElement)
  const darkColor = computedStyle.getPropertyValue('--bg-primary').trim() || '#000000'

  QRCode.toDataURL(joinUrl, {
   width: 400,
   margin: 3,
   color: {
    dark: darkColor,
    light: '#FFFFFF',
   },
   errorCorrectionLevel: 'M',
  }).then((dataUrl) => {
   // Check if the popup is still open before writing
   if (printWindow.closed) return
   try {
    printWindow.document.write(`
     <!DOCTYPE html>
     <html>
      <head>
       <title>${familyName} - USRA PLUS</title>
       <style>
        body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        p { font-size: 14px; color: #666; margin-bottom: 24px; }
        img { width: 300px; height: 300px; }
        .code { font-family: monospace; font-size: 18px; letter-spacing: 4px; margin-top: 16px; padding: 8px 16px; background: #f5f5f5; border-radius: 8px; }
        .footer { margin-top: 24px; font-size: 12px; color: #999; }
       </style>
      </head>
      <body>
       <h1>${familyName}</h1>
       <p>${isRTL ? 'امسح رمز QR للانضمام إلى العائلة' : 'Scan QR code to join the family'}</p>
       <img src="${dataUrl}" alt="QR Code" />
       <div class="code">${inviteCode}</div>
       <div class="footer">USRA PLUS - Family Operating System</div>
      </body>
     </html>
    `)
    printWindow.document.close()
    printWindow.print()
   } catch {
    // Popup was closed by user before we could write
   }
  }).catch(() => {
   toast.error(isRTL ? 'فشل إنشاء رمز QR' : 'Failed to generate QR code')
  })
 }, [joinUrl, familyName, inviteCode, isRTL])

 const handleCopyCode = useCallback(() => {
  try {
   navigator.clipboard.writeText(inviteCode)
   setCopied(true)
   toast.success(t.common.copied)
   setTimeout(() => setCopied(false), 2000)
  } catch {
   // Clipboard API requires HTTPS — fallback: select text
   toast.error(t.common.error)
  }
 }, [inviteCode, t.common.copied, t.common.error])

 return (
  <motion.div
   initial={{ opacity: 0, y: 8 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ duration: 0.3 }}
   className="flex flex-col items-center"
  >
   {/* Family Name */}
   <h4 className="text-foreground text-base font-semibold mb-3 text-center">
    {familyName}
   </h4>

   {/* QR Code with white background for scannability */}
   <div className="bg-[--bg-primary] rounded-xl p-4 mx-auto shadow-lg">
    <canvas ref={canvasRef} className="block" />
   </div>

   {/* Scan to join subtitle */}
   <p className="text-muted-foreground text-xs mt-3 text-center">
    {isRTL ? 'امسح للانضمام إلى العائلة' : t.integrations.scanToJoin}
   </p>

   {/* Invite code with copy button */}
   <div className="flex items-center gap-2 mt-3">
    <span className="font-mono text-lg tracking-widest text-foreground">
     {inviteCode}
    </span>
    <button
     onClick={handleCopyCode}
     className="text-xs text-[--accent-primary] hover:text-[--accent-secondary] transition-colors"
     aria-label={isRTL ? 'نسخ الرمز' : 'Copy code'}
    >
     {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
    </button>
   </div>

   {/* Action buttons */}
   <div className="flex items-center gap-2 mt-4">
    <Button
     variant="outline"
     size="sm"
     onClick={handleDownload}
     className="border-[--border-subtle] text-foreground hover:bg-[--bg-surface-2] text-xs"
    >
     <Download className="size-3.5" />
     {t.integrations.downloadQR}
    </Button>
    <Button
     variant="outline"
     size="sm"
     onClick={handlePrint}
     className="border-[--border-subtle] text-foreground hover:bg-[--bg-surface-2] text-xs"
    >
     <Printer className="size-3.5" />
     {t.integrations.printQR}
    </Button>
   </div>
  </motion.div>
 )
}
