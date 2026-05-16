import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { requireAuth } from '@/lib/auth-utils'
import { requirePlanAccess } from '@/lib/plan-limits'

interface FamilyData {
  tasks: {
    total: number
    completed: number
    pending: number
    overdue: number
    urgent: number
    todayDue: number
    byPriority: Record<string, number>
  }
  groceries: {
    total: number
    checked: number
    unchecked: number
    percentage: number
  }
  events: {
    today: Array<{ title: string; time: string }>
    upcoming: number
  }
  members: number
  language: string
}

function generateFallbackSummary(data: FamilyData): string {
  const isArabic = data.language === 'ar'
  const parts: string[] = []

  if (isArabic) {
    // Today's summary
    if (data.tasks.todayDue > 0) {
      parts.push(`لديك ${data.tasks.todayDue} مهام مستحقة اليوم${data.tasks.urgent > 0 ? `، منها ${data.tasks.urgent} عاجلة` : ''}.`)
    } else if (data.tasks.pending > 0) {
      parts.push(`لديك ${data.tasks.pending} مهام قيد الانتظار${data.tasks.overdue > 0 ? ` و${data.tasks.overdue} متأخرة` : ''}.`)
    }

    // Progress overview
    if (data.tasks.total > 0) {
      const completionRate = Math.round((data.tasks.completed / data.tasks.total) * 100)
      parts.push(`تم إنجاز ${completionRate}% من المهام${data.groceries.total > 0 ? ` و${data.groceries.percentage}% من قائمة البقالة` : ''}.`)
    }

    // Events
    if (data.events.today.length > 0) {
      const eventNames = data.events.today.map((e) => `${e.title} الساعة ${e.time}`).join(' و')
      parts.push(`لا تنسَ: ${eventNames}!`)
    } else if (data.events.upcoming > 0) {
      parts.push(`لديك ${data.events.upcoming} أحداث قادمة هذا الأسبوع.`)
    }

    // Suggestions
    if (data.tasks.overdue > 0) {
      parts.push(`نقترح إعطاء الأولوية للمهام المتأخرة لإبقاء العائلة على المسار الصحيح.`)
    } else if (data.groceries.unchecked > 0 && data.groceries.unchecked <= 3) {
      parts.push(`متبقي ${data.groceries.unchecked} عناصر فقط في قائمة البقالة - يمكنك إنهاؤها بسرعة!`)
    }
  } else {
    // Today's summary
    if (data.tasks.todayDue > 0) {
      parts.push(`You have ${data.tasks.todayDue} task${data.tasks.todayDue > 1 ? 's' : ''} due today${data.tasks.urgent > 0 ? `, including ${data.tasks.urgent} urgent` : ''}.`)
    } else if (data.tasks.pending > 0) {
      parts.push(`You have ${data.tasks.pending} pending task${data.tasks.pending > 1 ? 's' : ''}${data.tasks.overdue > 0 ? ` and ${data.tasks.overdue} overdue` : ''}.`)
    }

    // Progress overview
    if (data.tasks.total > 0) {
      const completionRate = Math.round((data.tasks.completed / data.tasks.total) * 100)
      parts.push(`${completionRate}% of tasks completed${data.groceries.total > 0 ? ` and ${data.groceries.percentage}% of your grocery list checked off` : ''}.`)
    }

    // Events
    if (data.events.today.length > 0) {
      const eventNames = data.events.today.map((e) => `${e.title} at ${e.time}`).join(' and ')
      parts.push(`Don't forget: ${eventNames}!`)
    } else if (data.events.upcoming > 0) {
      parts.push(`You have ${data.events.upcoming} upcoming event${data.events.upcoming > 1 ? 's' : ''} this week.`)
    }

    // Suggestions
    if (data.tasks.overdue > 0) {
      parts.push(`Consider prioritizing overdue tasks to keep the family on track.`)
    } else if (data.groceries.unchecked > 0 && data.groceries.unchecked <= 3) {
      parts.push(`Only ${data.groceries.unchecked} grocery items left — you can wrap those up quickly!`)
    }
  }

  if (parts.length === 0) {
    return isArabic
      ? 'مرحبًا بك في USRA PLUS! ابدأ بإضافة المهام والأحداث لمتابعة نشاط عائلتك.'
      : 'Welcome to USRA PLUS! Start by adding tasks and events to track your family activity.'
  }

  return parts.join(' ')
}

export async function POST(request: NextRequest) {

  try {
  // Verify authentication
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  // ─── Server-side plan check: AI summary requires Pro+ ────────────────
  const planAccess = await requirePlanAccess(request, 'pro')
  if (!planAccess.ok) return planAccess.error

  try {
    let body: FamilyData
    try {
      body = await request.json() as FamilyData
    } catch {
      return NextResponse.json({
        summary: 'Welcome to your family dashboard! Add tasks and events to get personalized AI insights about your family activity.',
      })
    }
    const { language } = body

    // Build the prompt for the AI
    const isArabic = language === 'ar'
    const systemPrompt = isArabic
      ? 'أنت مساعد ذكي لعائلة تستخدم تطبيق USRA PLUS. قدم ملخصًا موجزًا ومفيدًا لنشاط العائلة بناءً على البيانات المقدمة. اكتب 2-3 فقرات قصيرة فقط. كن ودودًا وعمليًا. استخدم اللغة العربية.'
      : 'You are a smart family assistant for USRA PLUS app. Provide a concise, helpful summary of family activity based on the data provided. Write only 2-3 short paragraphs. Be friendly and practical. Use English.'

    const userPrompt = isArabic
      ? `بيانات العائلة:\n- المهام: ${body.tasks.total} إجمالي، ${body.tasks.completed} مكتملة، ${body.tasks.pending} قيد الانتظار، ${body.tasks.overdue} متأخرة، ${body.tasks.urgent} عاجلة، ${body.tasks.todayDue} مستحقة اليوم\n- البقالة: ${body.groceries.total} عناصر، ${body.groceries.checked} تم التحقق، ${body.groceries.percentage}% مكتمل\n- الأحداث: ${body.events.today.map((e) => e.title + ' الساعة ' + e.time).join('، ') || 'لا توجد أحداث اليوم'}، ${body.events.upcoming} أحداث قادمة\n- الأعضاء: ${body.members}\n\nقدم ملخصًا ذكيًا يتضمن: ماذا يحدث اليوم، نظرة عامة على التقدم، واقتراحات للعائلة.`
      : `Family data:\n- Tasks: ${body.tasks.total} total, ${body.tasks.completed} completed, ${body.tasks.pending} pending, ${body.tasks.overdue} overdue, ${body.tasks.urgent} urgent, ${body.tasks.todayDue} due today\n- Groceries: ${body.groceries.total} items, ${body.groceries.checked} checked, ${body.groceries.percentage}% complete\n- Events: ${body.events.today.map((e) => e.title + ' at ' + e.time).join(', ') || 'No events today'}, ${body.events.upcoming} upcoming\n- Members: ${body.members}\n\nProvide a smart summary including: what's happening today, progress overview, and suggestions for the family.`

    let aiSummary: string | null = null

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      })
      aiSummary = completion.choices[0]?.message?.content?.trim() || null
    } catch {
      // AI call failed, will use fallback
    }

    const summary = aiSummary && aiSummary.length > 20 ? aiSummary : generateFallbackSummary(body)

    return NextResponse.json({ summary })
  } catch {
    // Return a generic fallback summary
    return NextResponse.json({
      summary: 'Welcome to your family dashboard! Add tasks and events to get personalized AI insights about your family activity.',
    })
  }

  } catch (error) {

    console.error('[src.app.api.ai.summary] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
