'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Plus, ArrowRight, Home, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export function OnboardingFlow() {
  const { t } = useI18n()
  const { user } = useAuthStore()
  const { setCurrentFamily, setFamilyMembers, setFamilies, setShowOnboarding } = useAppStore()
  const [step, setStep] = useState<'choose' | 'create' | 'join'>('choose')
  const [familyName, setFamilyName] = useState('')
  const [familyDescription, setFamilyDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [createdCode, setCreatedCode] = useState('')

  const supabase = createClient()

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      toast.error(t.common.error)
      return
    }
    setIsLoading(true)
    try {
      const { data: family, error } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
          description: familyDescription.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      // Add creator as owner
      const { error: memberError } = await supabase.from('family_members').insert({
        family_id: family.id,
        user_id: user?.id,
        role: 'owner',
      })

      if (memberError) throw memberError

      setCurrentFamily(family)
      setCreatedCode(family.invite_code)
      
      // Fetch all families for this user
      const { data: allFamilies } = await supabase
        .from('family_members')
        .select('family_id, families(*)')
        .eq('user_id', user?.id)

      if (allFamilies) {
        setFamilies(allFamilies.map(f => f.families).filter(Boolean))
      }

      toast.success(t.common.success)
      setStep('choose') // Reset to show success
      setShowOnboarding(false)
    } catch (err: any) {
      toast.error(err.message || t.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      toast.error(t.common.error)
      return
    }
    setIsLoading(true)
    try {
      // Find family by invite code
      const { data: family, error: findError } = await supabase
        .from('families')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single()

      if (findError || !family) {
        toast.error('Invalid invite code')
        setIsLoading(false)
        return
      }

      // Join family
      const { error: joinError } = await supabase.from('family_members').insert({
        family_id: family.id,
        user_id: user?.id,
        role: 'member',
      })

      if (joinError) throw joinError

      setCurrentFamily(family)
      
      // Fetch members
      const { data: members } = await supabase
        .from('family_members')
        .select('*, profiles(*)')
        .eq('family_id', family.id)
      
      if (members) setFamilyMembers(members)

      // Fetch all families
      const { data: allFamilies } = await supabase
        .from('family_members')
        .select('family_id, families(*)')
        .eq('user_id', user?.id)

      if (allFamilies) {
        setFamilies(allFamilies.map(f => f.families).filter(Boolean))
      }

      toast.success(t.common.success)
      setShowOnboarding(false)
    } catch (err: any) {
      toast.error(err.message || t.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(createdCode)
    setCopiedCode(true)
    toast.success(t.common.copied)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">USRA PLUS</h1>
          <p className="text-gray-400 mt-1">{t.onboarding.welcome}</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {createdCode && (
                <Card className="bg-[#111117] border-green-500/30 mb-4">
                  <CardContent className="p-4">
                    <p className="text-green-400 text-sm font-medium mb-2">Family created! Share this invite code:</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-black/40 px-3 py-1.5 rounded-lg text-white font-mono text-lg tracking-wider">
                        {createdCode}
                      </code>
                      <Button size="sm" variant="outline" onClick={copyCode} className="border-white/10">
                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card
                className="bg-[#111117] border-white/[0.08] hover:border-indigo-500/50 transition-colors cursor-pointer"
                onClick={() => setStep('create')}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Plus className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{t.onboarding.createFamily}</h3>
                    <p className="text-gray-500 text-sm">Start a new family group</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-500" />
                </CardContent>
              </Card>

              <Card
                className="bg-[#111117] border-white/[0.08] hover:border-violet-500/50 transition-colors cursor-pointer"
                onClick={() => setStep('join')}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{t.onboarding.joinFamily}</h3>
                    <p className="text-gray-500 text-sm">Join with an invite code</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-500" />
                </CardContent>
              </Card>

              <button
                onClick={() => setShowOnboarding(false)}
                className="w-full text-center text-gray-500 hover:text-gray-400 text-sm py-4 transition-colors"
              >
                {t.onboarding.skip}
              </button>
            </motion.div>
          )}

          {step === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-[#111117] border-white/[0.08]">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">{t.onboarding.createFamily}</h2>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">{t.onboarding.familyName}</Label>
                    <Input
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      placeholder="The Smith Family"
                      className="bg-[#0B0B0F] border-white/[0.08] text-white placeholder:text-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">{t.onboarding.familyDescription}</Label>
                    <Textarea
                      value={familyDescription}
                      onChange={(e) => setFamilyDescription(e.target.value)}
                      placeholder="A loving family..."
                      className="bg-[#0B0B0F] border-white/[0.08] text-white placeholder:text-gray-600 resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep('choose')}
                      className="flex-1 border-white/[0.08] text-gray-300 hover:bg-white/[0.05]"
                    >
                      {t.common.cancel}
                    </Button>
                    <Button
                      onClick={handleCreateFamily}
                      disabled={isLoading || !familyName.trim()}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white"
                    >
                      {isLoading ? t.common.loading : t.onboarding.create}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-[#111117] border-white/[0.08]">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-violet-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">{t.onboarding.joinFamily}</h2>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">{t.onboarding.enterCode}</Label>
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABCD1234"
                      className="bg-[#0B0B0F] border-white/[0.08] text-white font-mono text-lg tracking-widest text-center placeholder:text-gray-600"
                      maxLength={8}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep('choose')}
                      className="flex-1 border-white/[0.08] text-gray-300 hover:bg-white/[0.05]"
                    >
                      {t.common.cancel}
                    </Button>
                    <Button
                      onClick={handleJoinFamily}
                      disabled={isLoading || !inviteCode.trim()}
                      className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
                    >
                      {isLoading ? t.common.loading : t.onboarding.join}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
