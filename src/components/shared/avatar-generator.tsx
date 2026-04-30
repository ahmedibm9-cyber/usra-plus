'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Loader2, RefreshCw, Check, X, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n/use-translation'

// ─── Style Presets ────────────────────────────────────────────────────────────

type AvatarStyle = 'cartoon' | 'minimalist' | 'arabian-nights' | 'family-crest'

interface StylePreset {
  id: AvatarStyle
  emoji: string
  labelEn: string
  labelAr: string
  prompt: string
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'cartoon',
    emoji: '🎨',
    labelEn: 'Cartoon',
    labelAr: 'كارتون',
    prompt: 'colorful cartoon style avatar, friendly, vibrant, playful, rounded shapes',
  },
  {
    id: 'minimalist',
    emoji: '✨',
    labelEn: 'Minimalist',
    labelAr: 'بسيط',
    prompt: 'minimalist geometric avatar, clean lines, simple shapes, modern, elegant',
  },
  {
    id: 'arabian-nights',
    emoji: '🌙',
    labelEn: 'Arabian Nights',
    labelAr: 'ليالي عربية',
    prompt: 'Arabian Nights ornate style, Saudi Arabian themed, decorative patterns, rich gold and deep blue, elegant calligraphy inspired',
  },
  {
    id: 'family-crest',
    emoji: '🏠',
    labelEn: 'Family Crest',
    labelAr: 'شعار عائلة',
    prompt: 'family crest shield emblem, heraldic design, noble, distinguished, ornate border, regal',
  },
]

// ─── Shimmer Loading Card ─────────────────────────────────────────────────────

function ShimmerCard() {
  return (
    <div className="rounded-xl aspect-square bg-[--border-subtle] animate-pulse overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.04]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="size-6 text-white/20 animate-spin" />
      </div>
    </div>
  )
}

// ─── Preview Card ─────────────────────────────────────────────────────────────

function PreviewCard({
  imageUrl,
  isSelected,
  onClick,
}: {
  imageUrl: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`rounded-xl overflow-hidden aspect-square bg-[--border-subtle] cursor-pointer transition-all relative ${
        isSelected
          ? 'ring-2 ring-[#6366F1] shadow-[0_0_16px_rgba(99,102,241,0.3)]'
          : 'hover:ring-2 hover:ring-white/20'
      }`}
    >
      <img
        src={imageUrl}
        alt="Generated avatar option"
        className="w-full h-full object-cover"
      />
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 size-6 rounded-full bg-[#6366F1] flex items-center justify-center"
        >
          <Check className="size-3.5 text-white" />
        </motion.div>
      )}
    </motion.button>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AvatarGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (imageUrl: string) => void
  mode?: 'full' | 'simple'
  context?: 'user' | 'family'
}

// ─── Avatar Generator Component ───────────────────────────────────────────────

export function AvatarGenerator({
  open,
  onOpenChange,
  onApply,
  mode = 'full',
  context = 'user',
}: AvatarGeneratorProps) {
  const { t, isRTL } = useI18n()
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>('cartoon')
  const [customPrompt, setCustomPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getPresetLabel = (preset: StylePreset) =>
    isRTL ? preset.labelAr : preset.labelEn

  const buildPrompt = useCallback(() => {
    const preset = STYLE_PRESETS.find((s) => s.id === selectedStyle)!
    const subject = context === 'family'
      ? 'family group avatar'
      : 'personal profile avatar'
    const customPart = customPrompt.trim()
      ? `, ${customPrompt.trim()}`
      : ''
    return `${subject}, ${preset.prompt}${customPart}`
  }, [selectedStyle, customPrompt, context])

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    setSelectedImage(null)
    setGeneratedImages([])

    const prompt = buildPrompt()

    try {
      // Generate 4 images in parallel
      const promises = Array.from({ length: 4 }, () =>
        fetch('/api/ai/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            style: 'avatar',
            size: '512x512',
          }),
        }).then((res) => res.json())
      )

      const results = await Promise.allSettled(promises)
      const images: string[] = []

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value?.imageUrl) {
          images.push(result.value.imageUrl)
        }
      })

      if (images.length === 0) {
        setError(
          isRTL
            ? 'فشل إنشاء الصور. يرجى المحاولة مرة أخرى.'
            : 'Failed to generate images. Please try again.'
        )
      } else {
        setGeneratedImages(images)
        const hasFallback = results.some(
          (r) => r.status === 'fulfilled' && r.value?.fallback
        )
        if (hasFallback) {
          toast.info(
            isRTL
              ? 'يتم استخدام صور بديلة مؤقتة'
              : 'Using placeholder images temporarily'
          )
        }
      }
    } catch {
      setError(
        isRTL
          ? 'حدث خطأ. يرجى المحاولة مرة أخرى.'
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setIsGenerating(false)
    }
  }, [buildPrompt, isRTL])

  const handleApply = useCallback(() => {
    if (selectedImage) {
      onApply(selectedImage)
      onOpenChange(false)
      toast.success(
        isRTL
          ? 'تم إنشاء الصورة الرمزية!'
          : (t as Record<string, Record<string, string>>).avatarGen?.avatarGenerated ?? 'Avatar generated!'
      )
    }
  }, [selectedImage, onApply, onOpenChange, isRTL, t])

  const handleReset = useCallback(() => {
    setGeneratedImages([])
    setSelectedImage(null)
    setError(null)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-lg sm:max-w-md p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
            <Wand2 className="size-5 text-[#6366F1]" />
            {isRTL ? 'إنشاء صورة رمزية' : 'Generate Avatar'}
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary] text-sm">
            {isRTL
              ? 'اختر نمطاً ودع الذكاء الاصطناعي ينشئ لك صورة رمزية فريدة'
              : 'Choose a style and let AI create a unique avatar for you'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Style Selector */}
          {mode === 'full' && (
            <div>
              <label className="text-sm font-medium text-[--text-secondary] mb-2 block">
                {isRTL ? 'النمط' : 'Style'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {STYLE_PRESETS.map((preset) => (
                  <motion.button
                    key={preset.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedStyle(preset.id)
                      handleReset()
                    }}
                    className={`bg-[--border-subtle] border rounded-xl p-3 hover:bg-[--border-subtle] cursor-pointer transition-all text-left ${
                      selectedStyle === preset.id
                        ? 'border-[#6366F1] bg-[#6366F1]/10'
                        : 'border-[--border-subtle]'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{preset.emoji}</span>
                    <span className="text-sm font-medium text-white block">
                      {getPresetLabel(preset)}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Prompt */}
          <div>
            <label className="text-sm font-medium text-[--text-secondary] mb-2 block">
              {isRTL ? 'وصف مخصص' : 'Custom Description'}
            </label>
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={
                isRTL
                  ? 'صف صورتك الرمزية...'
                  : (t as Record<string, Record<string, string>>).avatarGen?.customPrompt ?? 'Describe your avatar...'
              }
              className="bg-[--border-subtle] border-[--border-subtle] text-white placeholder:text-[--text-muted] focus-visible:ring-[#6366F1]/30"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-[#6366F1] hover:bg-[#6366F1]/80 text-white rounded-xl px-6 py-2.5 h-11 font-medium"
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {isRTL ? 'جاري الإنشاء...' : 'Generating...'}
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" />
                {isRTL ? 'إنشاء' : 'Generate'}
              </>
            )}
          </Button>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2"
              >
                <X className="size-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-400 text-sm">{error}</p>
                  <button
                    onClick={handleGenerate}
                    className="text-red-300 text-xs underline hover:text-red-200 mt-1"
                  >
                    {isRTL ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Shimmer */}
          {isGenerating && (
            <div className="grid grid-cols-2 gap-3">
              <ShimmerCard />
              <ShimmerCard />
              <ShimmerCard />
              <ShimmerCard />
            </div>
          )}

          {/* Preview Grid */}
          {!isGenerating && generatedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="text-sm font-medium text-[--text-secondary] mb-2 block">
                {isRTL ? 'اختر صورة رمزية' : 'Select an avatar'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {generatedImages.map((img, idx) => (
                  <PreviewCard
                    key={idx}
                    imageUrl={img}
                    isSelected={selectedImage === img}
                    onClick={() => setSelectedImage(img)}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  className="flex-1 border-[--border-subtle] text-[--text-secondary] hover:bg-[--border-subtle] hover:text-white rounded-xl h-10"
                >
                  <RefreshCw className="size-4 mr-2" />
                  {isRTL ? 'إعادة الإنشاء' : 'Regenerate'}
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={!selectedImage}
                  className="flex-1 bg-[#6366F1] hover:bg-[#6366F1]/80 text-white rounded-xl h-10 font-medium disabled:opacity-50"
                >
                  <Check className="size-4 mr-2" />
                  {isRTL ? 'تطبيق' : 'Apply'}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
