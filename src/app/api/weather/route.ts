import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

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

// ─── City Coordinates ────────────────────────────────────────────

const CITY_COORDS: Record<string, { lat: number; lon: number; name: string; nameAr: string }> = {
  riyadh: { lat: 24.7136, lon: 46.6753, name: 'Riyadh', nameAr: 'الرياض' },
  jeddah: { lat: 21.5433, lon: 39.1728, name: 'Jeddah', nameAr: 'جدة' },
  mecca: { lat: 21.3891, lon: 39.8579, name: 'Mecca', nameAr: 'مكة المكرمة' },
  medina: { lat: 24.5247, lon: 39.5692, name: 'Medina', nameAr: 'المدينة المنورة' },
  dammam: { lat: 26.3927, lon: 49.9777, name: 'Dammam', nameAr: 'الدمام' },
}

function getDayName(daysFromNow: number): { day: string; dayAr: string } {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const daysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  const dayIndex = date.getDay()
  return { day: days[dayIndex], dayAr: daysAr[dayIndex] }
}

// ─── WMO Weather Code Mapping ────────────────────────────────────

function mapWeatherCode(code: number): { condition: string; icon: string } {
  // Open-Meteo uses WMO weather interpretation codes
  if (code === 0) return { condition: 'sunny', icon: 'sun' }
  if (code === 1) return { condition: 'clear', icon: 'sun' }
  if (code === 2) return { condition: 'partlyCloudy', icon: 'cloud-sun' }
  if (code === 3) return { condition: 'cloudy', icon: 'cloud' }
  if (code >= 45 && code <= 48) return { condition: 'cloudy', icon: 'cloud' }
  if (code >= 51 && code <= 57) return { condition: 'rainy', icon: 'cloud-rain' }
  if (code >= 61 && code <= 67) return { condition: 'rainy', icon: 'cloud-rain' }
  if (code >= 71 && code <= 77) return { condition: 'cloudy', icon: 'cloud' }
  if (code >= 80 && code <= 82) return { condition: 'rainy', icon: 'cloud-rain' }
  if (code >= 85 && code <= 86) return { condition: 'cloudy', icon: 'cloud' }
  if (code >= 95 && code <= 99) return { condition: 'rainy', icon: 'cloud-rain' }
  // Default
  return { condition: 'sunny', icon: 'sun' }
}

// ─── API Route Handler ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = (searchParams.get('city') || '').toLowerCase()

    // Accept both `latitude`/`longitude` and `lat`/`lon` parameters
    const latitudeParam = searchParams.get('latitude') || searchParams.get('lat') || ''
    const longitudeParam = searchParams.get('longitude') || searchParams.get('lon') || ''
    const lat = parseFloat(latitudeParam)
    const lon = parseFloat(longitudeParam)

    // Determine coordinates: explicit latitude/longitude take priority, then city lookup, then Riyadh fallback
    let latitude = 24.7136
    let longitude = 46.6753
    let cityName = 'Riyadh'
    let cityNameAr = 'الرياض'

    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      latitude = lat
      longitude = lon
      // Try to find a matching city name for display
      const matchingCity = Object.values(CITY_COORDS).find(
        c => Math.abs(c.lat - lat) < 0.5 && Math.abs(c.lon - lon) < 0.5
      )
      if (matchingCity) {
        cityName = matchingCity.name
        cityNameAr = matchingCity.nameAr
      } else {
        cityName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
        cityNameAr = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
      }
    } else if (city && CITY_COORDS[city]) {
      const coords = CITY_COORDS[city]
      latitude = coords.lat
      longitude = coords.lon
      cityName = coords.name
      cityNameAr = coords.nameAr
    } else {
      // No valid coords or city provided — fall back to Riyadh (default)
      // This allows callers that provide no params at all to get Riyadh weather
      if (city && !CITY_COORDS[city]) {
        return NextResponse.json(
          { error: `Invalid city. Supported cities: ${Object.keys(CITY_COORDS).join(', ')}. Or provide latitude/longitude parameters.` },
          { status: 400 }
        )
      }
    }

    // Fetch real weather from Open-Meteo (FREE, no API key needed)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`

    const response = await fetch(url, {
      next: { revalidate: 600 }, // Cache for 10 minutes
    })

    if (!response.ok) {
      logger.error('[Weather API]', 'Open-Meteo returned non-OK status', response.status)
      return NextResponse.json(
        { error: 'Failed to fetch weather data from provider' },
        { status: 502 }
      )
    }

    const data = await response.json() as {
      current?: {
        temperature_2m?: number
        apparent_temperature?: number
        relative_humidity_2m?: number
        weather_code?: number
        wind_speed_10m?: number
      }
      daily?: {
        weather_code?: number[]
        temperature_2m_max?: number[]
        temperature_2m_min?: number[]
      }
    }

    const current = data.current
    const daily = data.daily

    if (!current || !daily) {
      logger.error('[Weather API]', 'Incomplete weather data received from Open-Meteo')
      return NextResponse.json(
        { error: 'Incomplete weather data received' },
        { status: 502 }
      )
    }

    const currentWeather = mapWeatherCode(current.weather_code ?? 0)

    // Build forecast for next 3 days (skip index 0 which is today)
    const forecast: ForecastDay[] = []
    if (daily.weather_code && daily.temperature_2m_max && daily.temperature_2m_min) {
      for (let i = 1; i <= Math.min(3, (daily.weather_code.length || 1) - 1); i++) {
        const { day, dayAr } = getDayName(i)
        const fw = mapWeatherCode(daily.weather_code[i] ?? 0)
        forecast.push({
          day,
          dayAr,
          high: Math.round(daily.temperature_2m_max[i] ?? 30),
          low: Math.round(daily.temperature_2m_min[i] ?? 20),
          condition: fw.condition,
          icon: fw.icon,
        })
      }
    }

    const weatherData: WeatherData = {
      city: cityName,
      temp: Math.round(current.temperature_2m ?? 30),
      feelsLike: Math.round(current.apparent_temperature ?? 32),
      condition: currentWeather.condition,
      humidity: current.relative_humidity_2m ?? 30,
      windSpeed: Math.round(current.wind_speed_10m ?? 10),
      icon: currentWeather.icon,
      forecast,
    }

    return NextResponse.json(weatherData)
  } catch (error) {
    logger.error('[Weather API]', 'Error fetching weather data', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather data. Please try again later.' },
      { status: 500 }
    )
  }
}
