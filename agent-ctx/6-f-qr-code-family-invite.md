# Task 6-f: QR Code for Family Invite in Settings Integrations Tab

## Work Summary

### What was done:
1. **Installed `qrcode` package** (`qrcode@1.5.4` + `@types/qrcode@1.5.6`) for QR code generation

2. **Created `/src/components/shared/family-qr-code.tsx`** - A reusable FamilyQRCode component:
   - Props: `inviteCode`, `familyName`, `size?` (default 200)
   - Generates QR code canvas using the `qrcode` library encoding URL `https://usraplus.app/join/{inviteCode}`
   - Displays: family name header, centered QR code with white background, "Scan to join" subtitle, invite code with copy button
   - Download button: saves QR as PNG via `qrcode.toDataURL()`
   - Print button: opens print dialog with formatted HTML page
   - Framer Motion entrance animation
   - Full RTL/bilingual support via `useI18n()`
   - Premium dark theme styling with white QR container for scannability

3. **Updated i18n translations**:
   - `en.ts`: Added `integrations` section with 14 keys (familyInvite, scanToJoin, inviteCode, shareViaWhatsApp, regenerateCode, connectedApps, comingSoon, downloadQR, printQR, copiedToClipboard, regenerateConfirmTitle, regenerateConfirmDesc, shareWhatsAppText, googleCalendar, googleCalendarDesc, appleHealth, appleHealthDesc, smartHome, smartHomeDesc)
   - `ar.ts`: Added matching Arabic translations for all `integrations` keys

4. **Updated IntegrationsTab in `/src/components/settings/settings-page.tsx`**:
   - Added imports: `RefreshCw`, `QrCode`, `Home`, `Heart`, `Share2`, `MessageSquare` from lucide-react; `FamilyQRCode` component
   - **Family Invite Card** (top section):
     - FamilyQRCode component with QR code rendering
     - Invite code with copy-to-clipboard button
     - "Share via WhatsApp" button (opens wa.me link with pre-filled text, green WhatsApp styling)
     - "Regenerate Code" button with AlertDialog confirmation
     - Demo mode fallback for code regeneration
   - **Connected Apps section** (below):
     - Google Calendar, Apple Health, Smart Home cards
     - Each with "Coming Soon" badge and Lock icon
     - Styled as disabled/locked with `opacity-60 bg-white/[0.02] border border-white/[0.06]`
   - Bilingual alert at bottom about upcoming integrations
   - All existing Settings tabs and functionality preserved

### Lint & Server Status:
- **Lint**: PASS (clean, zero errors)
- **Dev Server**: HTTP 200, compiling successfully
