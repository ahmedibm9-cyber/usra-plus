import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { requireAuth } from '@/lib/auth-utils'
import { requirePlanAccess } from '@/lib/plan-limits'

type ImageStyle = 'avatar' | 'icon' | 'cover'
type ImageSize = '256x256' | '512x512'

interface GenerateImageRequest {
  prompt: string
  style: ImageStyle
  size: ImageSize
}

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  avatar:
    'professional profile avatar, circular crop friendly, centered subject, clean background, high quality, detailed',
  icon:
    'small icon/logo design, simple and recognizable, clean lines, minimal details, high quality, suitable for small sizes',
  cover:
    'wide banner/cover image, landscape orientation, visually striking, high quality, detailed',
}

const SIZE_MAP: Record<ImageSize, string> = {
  '256x256': '1024x1024',
  '512x512': '1024x1024',
}

function buildPrompt(userPrompt: string, style: ImageStyle): string {
  const styleSuffix = STYLE_PROMPTS[style]
  return `${userPrompt}, ${styleSuffix}`
}

function generatePlaceholderSvg(style: ImageStyle): string {
  const colors: Record<ImageStyle, { bg: string; fg: string }> = {
    avatar: { bg: '%236366F1', fg: '%23ffffff' },
    icon: { bg: '%238B5CF6', fg: '%23ffffff' },
    cover: { bg: '%2310B981', fg: '%23ffffff' },
  }
  const { bg, fg } = colors[style]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="${bg}" rx="32"/><text x="128" y="140" font-family="sans-serif" font-size="80" fill="${fg}" text-anchor="middle">AI</text></svg>`
  return `data:image/svg+xml,${svg}`
}

export async function POST(request: NextRequest) {

  try {
  // Verify authentication
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  // ─── Server-side plan check: Image generation requires Pro+ ──────────
  const imgPlanAccess = await requirePlanAccess(request, 'pro')
  if (!imgPlanAccess.ok) return imgPlanAccess.error

  try {
    let body: GenerateImageRequest
    try {
      body = (await request.json()) as GenerateImageRequest
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body', imageUrl: generatePlaceholderSvg('avatar'), fallback: true },
        { status: 400 }
      )
    }
    const { prompt, style = 'avatar', size = '512x512' } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required', imageUrl: generatePlaceholderSvg(style) },
        { status: 400 }
      )
    }

    const fullPrompt = buildPrompt(prompt.trim(), style)
    const sdkSize = SIZE_MAP[size] || '1024x1024'

    try {
      const zai = await ZAI.create()
      const response = await zai.images.generations.create({
        prompt: fullPrompt,
        size: sdkSize as '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440',
      })

      const imageBase64 = response.data?.[0]?.base64
      if (!imageBase64) {
        throw new Error('No image data returned from API')
      }

      const imageUrl = `data:image/png;base64,${imageBase64}`
      return NextResponse.json({ imageUrl })
    } catch {
      // Fallback to placeholder on AI failure
      return NextResponse.json({
        imageUrl: generatePlaceholderSvg(style),
        fallback: true,
        error: 'Image generation failed, using placeholder',
      })
    }
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid request',
        imageUrl: generatePlaceholderSvg('avatar'),
        fallback: true,
      },
      { status: 400 }
    )
  }

  } catch (error) {

    console.error('[src.app.api.ai.generate-image] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
