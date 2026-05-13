import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { requireAuth } from '@/lib/auth-utils'

interface MealSuggestion {
  title: string
  description: string
  prepTime: number
  calories: number
  ingredients: string[]
}

function generateFallbackSuggestions(items: string[], language: 'en' | 'ar'): MealSuggestion[] {
  if (language === 'ar') {
    return [
      {
        title: 'كبسة دجاج',
        description: 'أرز بسمتي مع دجاج متبل بالتوابل العربية التقليدية',
        prepTime: 60,
        calories: 650,
        ingredients: ['أرز بسمتي', 'دجاج', 'بصل', 'توابل', 'طماطم'],
      },
      {
        title: 'فول مدمس',
        description: 'فول مدمس تقليدي مع زيت الزيتون والليمون',
        prepTime: 20,
        calories: 320,
        ingredients: ['فول', 'زيت زيتون', 'ليمون', 'ثوم', 'كمون'],
      },
      {
        title: 'سمك مشوي',
        description: 'سمك طازج مشوي مع الأعشاب والخضروات',
        prepTime: 35,
        calories: 280,
        ingredients: ['سمك', 'ليمون', 'أعشاب', 'زيت زيتون', 'طماطم'],
      },
    ]
  }

  const itemNames = items.map((i) => i.toLowerCase())

  if (itemNames.some((i) => i.includes('chicken')) && itemNames.some((i) => i.includes('rice'))) {
    return [
      {
        title: 'Chicken Kabsa',
        description: 'Traditional Arabic spiced chicken with basmati rice',
        prepTime: 60,
        calories: 650,
        ingredients: ['Chicken', 'Basmati Rice', 'Onion', 'Spices', 'Tomatoes'],
      },
      {
        title: 'Chicken Stir Fry',
        description: 'Quick and healthy chicken stir fry with vegetables',
        prepTime: 25,
        calories: 380,
        ingredients: ['Chicken', 'Vegetables', 'Soy Sauce', 'Garlic', 'Ginger'],
      },
      {
        title: 'Chicken Soup',
        description: 'Warm and comforting chicken soup with herbs',
        prepTime: 40,
        calories: 250,
        ingredients: ['Chicken', 'Carrots', 'Onion', 'Herbs', 'Broth'],
      },
    ]
  }

  if (itemNames.some((i) => i.includes('milk')) || itemNames.some((i) => i.includes('bread'))) {
    return [
      {
        title: 'French Toast',
        description: 'Classic French toast with honey and fresh fruits',
        prepTime: 15,
        calories: 350,
        ingredients: ['Bread', 'Milk', 'Eggs', 'Honey', 'Cinnamon'],
      },
      {
        title: 'Overnight Oats',
        description: 'Healthy overnight oats with fruits and nuts',
        prepTime: 5,
        calories: 280,
        ingredients: ['Milk', 'Oats', 'Honey', 'Fruits', 'Nuts'],
      },
      {
        title: 'Pancakes',
        description: 'Fluffy pancakes with maple syrup and berries',
        prepTime: 20,
        calories: 420,
        ingredients: ['Milk', 'Flour', 'Eggs', 'Butter', 'Syrup'],
      },
    ]
  }

  return [
    {
      title: 'Grilled Fish with Vegetables',
      description: 'Fresh grilled fish served with roasted vegetables',
      prepTime: 30,
      calories: 320,
      ingredients: ['Fish', 'Olive Oil', 'Lemon', 'Vegetables', 'Herbs'],
    },
    {
      title: 'Mandi Rice',
      description: 'Traditional Yemeni-style rice with aromatic spices',
      prepTime: 50,
      calories: 550,
      ingredients: ['Basmati Rice', 'Spices', 'Onion', 'Garlic', 'Tomatoes'],
    },
    {
      title: 'Fresh Salad Bowl',
      description: 'Colorful mixed salad with citrus dressing',
      prepTime: 10,
      calories: 150,
      ingredients: ['Lettuce', 'Tomatoes', 'Cucumber', 'Olive Oil', 'Lemon'],
    },
  ]
}

export async function POST(request: NextRequest) {

  try {
  // Verify authentication
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    let body: { groceryItems: string[]; mealType: string; preferences?: string; language?: string }
    try {
      body = await request.json() as { groceryItems: string[]; mealType: string; preferences?: string; language?: string }
    } catch {
      return NextResponse.json({ suggestions: generateFallbackSuggestions([], 'en') })
    }
    const { groceryItems, mealType, preferences, language = 'en' } = body

    if (!groceryItems || groceryItems.length === 0) {
      return NextResponse.json({
        suggestions: generateFallbackSuggestions([], language as 'en' | 'ar'),
      })
    }

    const isArabic = language === 'ar'

    const systemPrompt = isArabic
      ? 'أنت طباخ محترف متخصص في المطبخ العربي والشرق أوسطي. اقترح ٣ وجبات يمكن تحضيرها باستخدام عناصر قائمة البقالة المقدمة. أجب بصيغة JSON فقط تحتوي على مصفوفة "suggestions" بـ ٣ عناصر. كل عنصر يحتوي: title (string)، description (string وصف مختصر)، prepTime (number بالدقائق)، calories (number)، ingredients (مصفوفة strings بـ ٣-٥ مكونات). كل النصوص بالعربية.'
      : 'You are a professional chef specializing in Arabic and Middle Eastern cuisine. Suggest 3 meals that can be made using the provided grocery list items. Respond with JSON only containing a "suggestions" array with 3 items. Each item has: title (string), description (string brief description), prepTime (number in minutes), calories (number), ingredients (array of 3-5 ingredient strings). All text in English.'

    const mealTypeLabel = isArabic
      ? mealType === 'breakfast' ? 'إفطار' : mealType === 'lunch' ? 'غداء' : mealType === 'dinner' ? 'عشاء' : mealType === 'snack' ? 'وجبة خفيفة' : 'أي نوع'
      : mealType

    const userPrompt = isArabic
      ? `عناصر قائمة البقالة: ${groceryItems.join('، ')}\nنوع الوجبة: ${mealTypeLabel}${preferences ? `\nالتفضيلات: ${preferences}` : ''}\n\nاقترح ٣ وجبات يمكن تحضيرها بهذه المكونات. أجب بـ JSON فقط.`
      : `Grocery list items: ${groceryItems.join(', ')}\nMeal type: ${mealTypeLabel}${preferences ? `\nPreferences: ${preferences}` : ''}\n\nSuggest 3 meals that can be made with these ingredients. Respond with JSON only.`

    let aiSuggestions: MealSuggestion[] | null = null

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      })

      const content = completion.choices[0]?.message?.content?.trim() || null

      if (content) {
        let jsonStr = content
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          jsonStr = jsonMatch[1]
        }

        const parsed = JSON.parse(jsonStr)
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          aiSuggestions = parsed.suggestions.slice(0, 3).map((r: Record<string, unknown>) => ({
            title: String(r.title || ''),
            description: String(r.description || ''),
            prepTime: Number(r.prepTime) || 30,
            calories: Number(r.calories) || 400,
            ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
          }))
        }
      }
    } catch {
      // AI call failed, will use fallback
    }

    const suggestions = aiSuggestions && aiSuggestions.length > 0
      ? aiSuggestions
      : generateFallbackSuggestions(groceryItems, language as 'en' | 'ar')

    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({
      suggestions: generateFallbackSuggestions([], 'en'),
    })
  }

  } catch (error) {

    console.error('[src.app.api.ai.meal-suggestions] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
