# Task 7-b: AI Image Generation for Family Avatars and Profile Photos

## Work Summary
Added AI-powered image generation for creating family avatars and profile photos in USRA PLUS.

## Files Created
- `/src/app/api/ai/generate-image/route.ts` - POST API endpoint using z-ai-web-dev-sdk for image generation
- `/src/components/shared/avatar-generator.tsx` - Modal dialog component with style selector, prompt input, preview grid

## Files Modified
- `/src/i18n/en.ts` - Added `avatarGen` section with 14 English translation keys
- `/src/i18n/ar.ts` - Added `avatarGen` section with 14 Arabic translation keys
- `/src/components/settings/settings-page.tsx` - Replaced "Change Photo" placeholder with AvatarGenerator integration, added Remove Photo option, imported Wand2 icon and AvatarGenerator
- `/src/components/onboarding/onboarding-flow.tsx` - Added "Generate with AI" button in PersonalizeStep, integrated AvatarGenerator in simplified mode
- `/src/components/shared/command-palette.tsx` - Fixed pre-existing lint error (setState-in-effect)

## Key Features
1. **API Route** (`/api/ai/generate-image`): Accepts prompt, style (avatar/icon/cover), size (256x256/512x512). Uses z-ai-web-dev-sdk. Returns base64 data URL. Falls back to SVG placeholder on error.

2. **Avatar Generator Component**: Premium dark theme dialog with:
   - 4 style presets: Cartoon, Minimalist, Arabian Nights, Family Crest
   - Custom prompt input for personalization
   - Parallel generation of 4 image options
   - 2x2 preview grid with selection
   - Loading shimmer animation
   - Regenerate and Apply buttons
   - Full RTL/bilingual support
   - Two modes: 'full' (settings) and 'simple' (onboarding)
   - Two contexts: 'user' and 'family'

3. **Settings Integration**: Change Photo button opens AvatarGenerator, Remove Photo button resets to default, avatar updates auth store

4. **Onboarding Integration**: "Generate with AI" button next to emoji avatars, AI-generated avatar replaces emoji preview, updates both family and user avatar

## Lint Status
PASS - All lint errors fixed (including pre-existing command-palette.tsx error)
