import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { requireAuth } from '@/lib/auth-utils'

interface RecipeSuggestion {
  title: string
  cookTime: string
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  ingredients: string[]
  steps: string[]
}

function generateFallbackRecipes(items: string[], language: 'en' | 'ar'): RecipeSuggestion[] {
  if (language === 'ar') {
    return [
      {
        title: 'أرز بالدجاج والبهارات',
        cookTime: '٤٥ دقيقة',
        servings: 4,
        difficulty: 'medium',
        ingredients: ['دجاج', 'أرز بسمتي', 'بصل', 'توابل'],
        steps: [
          'اغسل الأرز وانقعه لمدة ٣٠ دقيقة',
          'قطّع الدجاج والبصل وقلّبهما في الزيت',
          'أضف التوابل والملح واتركه يطهى',
          'أضف الأرز والماء واتركه على نار هادئة حتى ينضج',
        ],
      },
      {
        title: 'عجينتم بالتمر',
        cookTime: '٣٠ دقيقة',
        servings: 6,
        difficulty: 'easy',
        ingredients: ['تمر', 'حليب', 'دقيق'],
        steps: [
          'اخلط الدقيق مع الحليب لعمل عجينة',
          'احشي التمر في العجينة',
          'شكّلها كرات صغيرة',
          'اخبزها في الفرن على ١٨٠ درجة حتى تتحمر',
        ],
      },
      {
        title: 'سموذي الفواكه المنعش',
        cookTime: '١٠ دقائق',
        servings: 2,
        difficulty: 'easy',
        ingredients: ['حليب', 'عصير برتقال', 'فواكه طازجة'],
        steps: [
          'قطّع الفواكه الطازجة إلى قطع صغيرة',
          'أضف الحليب والعصير في الخلاط',
          'أضف الفواكه واخلط حتى يصبح ناعمًا',
          'قدّمه باردًا مع مكعبات الثلج',
        ],
      },
    ]
  }

  const itemNames = items.map((i) => i.toLowerCase())

  if (itemNames.some((i) => i.includes('chicken')) && itemNames.some((i) => i.includes('rice'))) {
    return [
      {
        title: 'Chicken Biryani',
        cookTime: '60 min',
        servings: 4,
        difficulty: 'medium',
        ingredients: ['Chicken', 'Basmati Rice', 'Onion', 'Spices'],
        steps: [
          'Marinate chicken with yogurt and spices for 30 minutes',
          'Fry onions until golden, add marinated chicken',
          'Cook rice separately until 70% done',
          'Layer rice over chicken, cover and cook on low heat for 25 minutes',
        ],
      },
      {
        title: 'Chicken Rice Bowl',
        cookTime: '30 min',
        servings: 2,
        difficulty: 'easy',
        ingredients: ['Chicken', 'Rice', 'Garlic', 'Soy Sauce'],
        steps: [
          'Cook rice according to package instructions',
          'Season and pan-fry chicken breast until golden',
          'Slice chicken and serve over rice',
          'Drizzle with soy sauce and garnish with green onions',
        ],
      },
      {
        title: 'Creamy Chicken Soup',
        cookTime: '40 min',
        servings: 4,
        difficulty: 'easy',
        ingredients: ['Chicken', 'Milk', 'Carrots', 'Onion'],
        steps: [
          'Sauté diced onion and carrots in butter',
          'Add chicken broth and diced chicken, simmer 20 min',
          'Stir in milk and season with salt and pepper',
          'Serve hot with crusty bread on the side',
        ],
      },
    ]
  }

  if (itemNames.some((i) => i.includes('milk')) && itemNames.some((i) => i.includes('bread') || i.includes('date'))) {
    return [
      {
        title: 'Date Bread Pudding',
        cookTime: '45 min',
        servings: 6,
        difficulty: 'easy',
        ingredients: ['Bread', 'Milk', 'Dates', 'Eggs'],
        steps: [
          'Cube bread and place in a baking dish with chopped dates',
          'Whisk eggs, milk, sugar, and vanilla together',
          'Pour mixture over bread and let soak 10 minutes',
          'Bake at 350°F for 35 minutes until golden and set',
        ],
      },
      {
        title: 'Overnight Oats',
        cookTime: '5 min',
        servings: 2,
        difficulty: 'easy',
        ingredients: ['Milk', 'Oats', 'Dates', 'Honey'],
        steps: [
          'Combine oats and milk in a jar',
          'Add chopped dates and a drizzle of honey',
          'Stir well and refrigerate overnight',
          'Enjoy cold or heat briefly in the morning',
        ],
      },
      {
        title: 'Date Smoothie',
        cookTime: '10 min',
        servings: 2,
        difficulty: 'easy',
        ingredients: ['Milk', 'Dates', 'Banana', 'Cinnamon'],
        steps: [
          'Pit the dates and slice the banana',
          'Add milk, dates, banana, and cinnamon to blender',
          'Blend until smooth and creamy',
          'Serve chilled with ice if desired',
        ],
      },
    ]
  }

  // Generic fallback
  return [
    {
      title: 'One-Pot Pasta',
      cookTime: '25 min',
      servings: 4,
      difficulty: 'easy',
      ingredients: ['Pasta', 'Tomato Sauce', 'Garlic', 'Cheese'],
      steps: [
        'Sauté garlic in olive oil until fragrant',
        'Add pasta, tomato sauce, and water to the pot',
        'Cook covered, stirring occasionally, until pasta is done',
        'Top with cheese and fresh herbs before serving',
      ],
    },
    {
      title: 'Veggie Stir Fry',
      cookTime: '20 min',
      servings: 3,
      difficulty: 'easy',
      ingredients: ['Mixed Vegetables', 'Soy Sauce', 'Garlic', 'Rice'],
      steps: [
        'Cook rice according to package instructions',
        'Stir fry vegetables in hot oil for 3-4 minutes',
        'Add soy sauce and garlic, toss to combine',
        'Serve over steamed rice',
      ],
    },
    {
      title: 'Hearty Soup',
      cookTime: '40 min',
      servings: 4,
      difficulty: 'medium',
      ingredients: ['Vegetables', 'Broth', 'Herbs', 'Bread'],
      steps: [
        'Dice all vegetables into bite-sized pieces',
        'Sauté onions and garlic, add remaining vegetables',
        'Pour in broth and simmer for 25 minutes',
        'Season with herbs and serve with crusty bread',
      ],
    },
  ]
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    let body: { items: string[]; language: 'en' | 'ar' }
    try {
      body = await request.json() as { items: string[]; language: 'en' | 'ar' }
    } catch {
      return NextResponse.json({ recipes: generateFallbackRecipes([], 'en') })
    }
    const { items, language } = body

    if (!items || items.length === 0) {
      return NextResponse.json({
        recipes: generateFallbackRecipes([], language),
      })
    }

    const isArabic = language === 'ar'

    const systemPrompt = isArabic
      ? 'أنت طباخ محترف. اقترح ٣ وصفات يمكن تحضيرها باستخدام عناصر قائمة البقالة المقدمة. أجب بصيغة JSON فقط تحتوي على مصفوفة "recipes" بـ ٣ عناصر. كل عنصر يحتوي: title (string)، cookTime (string مثل "٣٠ دقيقة")، servings (number)، difficulty ("easy" أو "medium" أو "hard")، ingredients (مصفوفة strings بـ ٣-٤ مكونات رئيسية)، steps (مصفوفة strings بـ ٣-٤ خطوات). كل النصوص بالعربية.'
      : 'You are a professional chef. Suggest 3 recipes that can be made using the provided grocery list items. Respond with JSON only containing a "recipes" array with 3 items. Each item has: title (string), cookTime (string like "30 min"), servings (number), difficulty ("easy" or "medium" or "hard"), ingredients (array of 3-4 key ingredient strings), steps (array of 3-4 step strings). All text in English.'

    const userPrompt = isArabic
      ? `عناصر قائمة البقالة: ${items.join('، ')}\n\nاقترح ٣ وصفات يمكن تحضيرها بهذه المكونات. أجب بـ JSON فقط.`
      : `Grocery list items: ${items.join(', ')}\n\nSuggest 3 recipes that can be made with these ingredients. Respond with JSON only.`

    let aiRecipes: RecipeSuggestion[] | null = null

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
        // Try to parse JSON from the response
        let jsonStr = content
        // Handle case where AI wraps JSON in markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          jsonStr = jsonMatch[1]
        }

        const parsed = JSON.parse(jsonStr)
        if (parsed.recipes && Array.isArray(parsed.recipes)) {
          aiRecipes = parsed.recipes.slice(0, 3).map((r: Record<string, unknown>) => ({
            title: String(r.title || ''),
            cookTime: String(r.cookTime || ''),
            servings: Number(r.servings) || 4,
            difficulty: ['easy', 'medium', 'hard'].includes(String(r.difficulty))
              ? String(r.difficulty) as 'easy' | 'medium' | 'hard'
              : 'easy',
            ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
            steps: Array.isArray(r.steps) ? r.steps.map(String) : [],
          }))
        }
      }
    } catch {
      // AI call failed, will use fallback
    }

    const recipes = aiRecipes && aiRecipes.length > 0
      ? aiRecipes
      : generateFallbackRecipes(items, language)

    return NextResponse.json({ recipes })
  } catch {
    // Return fallback recipes on any error
    return NextResponse.json({
      recipes: generateFallbackRecipes([], 'en'),
    })
  }
}
