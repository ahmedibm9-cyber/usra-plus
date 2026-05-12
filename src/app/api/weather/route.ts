import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

// ─── Types ────────────────────────────────────────────────────────

interface WeatherData {
  city: string
  temp: number
  feelsLike: number
  condition: string
  humidity: number
  windSpeed: number
  icon: string
  forecast: ForecastDay[]
}

interface ForecastDay {
  day: string
  dayAr: string
  high: number
  low: number
  condition: string
  icon: string
}

// ─── Static Mock Weather Data ─────────────────────────────────────

const MOCK_WEATHER: Record<string, WeatherData> = {
  riyadh: {
    city: 'Riyadh',
    temp: 34,
    feelsLike: 36,
    condition: 'sunny',
    humidity: 18,
    windSpeed: 12,
    icon: 'sun',
    forecast: [
      { day: 'Thu', dayAr: 'خميس', high: 36, low: 22, condition: 'sunny', icon: 'sun' },
      { day: 'Fri', dayAr: 'جمعة', high: 35, low: 21, condition: 'partlyCloudy', icon: 'cloud-sun' },
      { day: 'Sat', dayAr: 'سبت', high: 37, low: 23, condition: 'sunny', icon: 'sun' },
    ],
  },
  jeddah: {
    city: 'Jeddah',
    temp: 31,
    feelsLike: 35,
    condition: 'partlyCloudy',
    humidity: 65,
    windSpeed: 18,
    icon: 'cloud-sun',
    forecast: [
      { day: 'Thu', dayAr: 'خميس', high: 33, low: 24, condition: 'partlyCloudy', icon: 'cloud-sun' },
      { day: 'Fri', dayAr: 'جمعة', high: 32, low: 25, condition: 'cloudy', icon: 'cloud' },
      { day: 'Sat', dayAr: 'سبت', high: 34, low: 24, condition: 'sunny', icon: 'sun' },
    ],
  },
  mecca: {
    city: 'Mecca',
    temp: 38,
    feelsLike: 42,
    condition: 'sunny',
    humidity: 22,
    windSpeed: 8,
    icon: 'sun',
    forecast: [
      { day: 'Thu', dayAr: 'خميس', high: 40, low: 27, condition: 'sunny', icon: 'sun' },
      { day: 'Fri', dayAr: 'جمعة', high: 39, low: 26, condition: 'partlyCloudy', icon: 'cloud-sun' },
      { day: 'Sat', dayAr: 'سبت', high: 41, low: 28, condition: 'sunny', icon: 'sun' },
    ],
  },
  medina: {
    city: 'Medina',
    temp: 33,
    feelsLike: 34,
    condition: 'clear',
    humidity: 15,
    windSpeed: 10,
    icon: 'sun',
    forecast: [
      { day: 'Thu', dayAr: 'خميس', high: 35, low: 20, condition: 'clear', icon: 'sun' },
      { day: 'Fri', dayAr: 'جمعة', high: 34, low: 19, condition: 'sunny', icon: 'sun' },
      { day: 'Sat', dayAr: 'سبت', high: 36, low: 21, condition: 'partlyCloudy', icon: 'cloud-sun' },
    ],
  },
  dammam: {
    city: 'Dammam',
    temp: 30,
    feelsLike: 33,
    condition: 'partlyCloudy',
    humidity: 45,
    windSpeed: 22,
    icon: 'cloud-sun',
    forecast: [
      { day: 'Thu', dayAr: 'خميس', high: 32, low: 22, condition: 'partlyCloudy', icon: 'cloud-sun' },
      { day: 'Fri', dayAr: 'جمعة', high: 31, low: 21, condition: 'cloudy', icon: 'cloud' },
      { day: 'Sat', dayAr: 'سبت', high: 33, low: 23, condition: 'sunny', icon: 'sun' },
    ],
  },
}

const VALID_CITIES = ['riyadh', 'jeddah', 'mecca', 'medina', 'dammam']

function getDayName(daysFromNow: number): { day: string; dayAr: string } {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const daysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  const dayIndex = date.getDay()
  return { day: days[dayIndex], dayAr: daysAr[dayIndex] }
}

function parseWeatherFromSearch(city: string, searchResult: string): WeatherData | null {
  try {
    // Try to extract temperature from search result
    const tempMatch = searchResult.match(/(\d{1,3})\s*°C/i) || searchResult.match(/(\d{1,3})\s*°/i)
    const feelsLikeMatch = searchResult.match(/feels?\s*like\s*(\d{1,3})/i) || searchResult.match(/يُشعر\s*(\d{1,3})/i)
    const humidityMatch = searchResult.match(/humidity[:\s]*(\d{1,3})%/i) || searchResult.match(/الرطوبة[:\s]*(\d{1,3})%/i)
    const windMatch = searchResult.match(/wind[:\s]*(\d{1,3})\s*km\/h/i) || searchResult.match(/الرياح[:\s]*(\d{1,3})/i)

    // Determine condition from text
    const lowerResult = searchResult.toLowerCase()
    let condition = 'sunny'
    let icon = 'sun'
    if (lowerResult.includes('rain') || lowerResult.includes('ماطر')) {
      condition = 'rainy'
      icon = 'cloud-rain'
    } else if (lowerResult.includes('cloud') || lowerResult.includes('غائم')) {
      if (lowerResult.includes('partly') || lowerResult.includes('جزئيا')) {
        condition = 'partlyCloudy'
        icon = 'cloud-sun'
      } else {
        condition = 'cloudy'
        icon = 'cloud'
      }
    } else if (lowerResult.includes('clear') || lowerResult.includes('صاف')) {
      condition = 'clear'
      icon = 'sun'
    }

    const temp = tempMatch ? parseInt(tempMatch[1], 10) : null
    if (temp === null) return null // Can't parse any weather data

    const cityKey = city.toLowerCase()
    const mockData = MOCK_WEATHER[cityKey] || MOCK_WEATHER.riyadh

    // Build forecast with real day names
    const forecast: ForecastDay[] = [1, 2, 3].map((offset) => {
      const { day, dayAr } = getDayName(offset)
      const baseForecast = mockData.forecast[offset - 1] || mockData.forecast[0]
      return {
        day,
        dayAr,
        high: baseForecast.high + Math.floor(Math.random() * 3) - 1,
        low: baseForecast.low + Math.floor(Math.random() * 3) - 1,
        condition: offset === 2 ? 'partlyCloudy' : 'sunny',
        icon: offset === 2 ? 'cloud-sun' : 'sun',
      }
    })

    return {
      city: mockData.city,
      temp,
      feelsLike: feelsLikeMatch ? parseInt(feelsLikeMatch[1], 10) : temp + 2,
      condition,
      humidity: humidityMatch ? parseInt(humidityMatch[1], 10) : mockData.humidity,
      windSpeed: windMatch ? parseInt(windMatch[1], 10) : mockData.windSpeed,
      icon,
      forecast,
    }
  } catch {
    return null
  }
}

// ─── API Route Handler ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = (searchParams.get('city') || 'riyadh').toLowerCase()

    // Validate city
    if (!VALID_CITIES.includes(city)) {
      return NextResponse.json(
        { error: 'Invalid city. Supported cities: riyadh, jeddah, mecca, medina, dammam' },
        { status: 400 }
      )
    }

    // Try to fetch real weather data using z-ai-web-dev-sdk
    try {
      const zai = await ZAI.create()
      const cityName = MOCK_WEATHER[city].city
      const searchResult = await zai.functions.invoke('web_search', {
        query: `current weather in ${cityName} Saudi Arabia today temperature`,
      })

      if (searchResult && searchResult.length > 0) {
        // Combine search snippets
        const combinedText = searchResult
          .slice(0, 3)
          .map((r) => `${r.name || ''} ${r.snippet || ''}`)
          .join(' ')

        const parsedWeather = parseWeatherFromSearch(city, combinedText)
        if (parsedWeather) {
          return NextResponse.json(parsedWeather)
        }
      }
    } catch {
      // z-ai-web-dev-sdk call failed, fall back to static data
    }

    // Fall back to static mock weather data
    const mockData = MOCK_WEATHER[city]

    // Use real day names for forecast
    const forecast: ForecastDay[] = [1, 2, 3].map((offset, idx) => {
      const { day, dayAr } = getDayName(offset)
      const baseForecast = mockData.forecast[idx]
      return {
        ...baseForecast,
        day,
        dayAr,
      }
    })

    return NextResponse.json({
      ...mockData,
      forecast,
    })
  } catch (error) {
    console.error('[Weather API] Error:', error)
    // Return static Riyadh data as ultimate fallback
    const riyadh = MOCK_WEATHER.riyadh
    return NextResponse.json({
      ...riyadh,
      forecast: riyadh.forecast,
    })
  }
}
