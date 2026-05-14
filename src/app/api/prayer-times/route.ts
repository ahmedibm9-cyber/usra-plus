import { NextResponse } from 'next/server'

// Aladhan API - Free, no key required
// Method 4 = Umm Al-Qura University, Makkah (used in Saudi Arabia)
const ALADHAN_API = 'https://api.aladhan.com/v1/timingsByCity'

// Supported Saudi cities with approximate fallback times
const FALLBACK_TIMES: Record<string, { Fajr: string; Sunrise: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string }> = {
  Riyadh: { Fajr: '04:30', Sunrise: '05:48', Dhuhr: '12:05', Asr: '15:35', Maghrib: '18:22', Isha: '19:52' },
  Jeddah: { Fajr: '04:35', Sunrise: '05:52', Dhuhr: '12:10', Asr: '15:38', Maghrib: '18:25', Isha: '19:55' },
  Mecca: { Fajr: '04:33', Sunrise: '05:50', Dhuhr: '12:08', Asr: '15:37', Maghrib: '18:24', Isha: '19:54' },
  Medina: { Fajr: '04:32', Sunrise: '05:49', Dhuhr: '12:07', Asr: '15:36', Maghrib: '18:23', Isha: '19:53' },
  Dammam: { Fajr: '04:28', Sunrise: '05:46', Dhuhr: '12:03', Asr: '15:33', Maghrib: '18:20', Isha: '19:50' },
}

// Cache prayer times for 1 hour on the client side (prayer times don't change within an hour)
const CACHE_MAX_AGE = 3600
const STALE_WHILE_REVALIDATE = 300

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') || 'Riyadh'
  const country = searchParams.get('country') || 'Saudi Arabia'
  const method = searchParams.get('method') || '4' // Umm Al-Qura

  const cacheHeaders = {
    'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
  }

  try {
    const response = await fetch(
      `${ALADHAN_API}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour on server
    )

    if (!response.ok) throw new Error('Aladhan API failed')

    const data = await response.json()
    const timings = data.data.timings

    return NextResponse.json({
      city,
      timings: {
        Fajr: timings.Fajr,
        Sunrise: timings.Sunrise,
        Dhuhr: timings.Dhuhr,
        Asr: timings.Asr,
        Maghrib: timings.Maghrib,
        Isha: timings.Isha,
      },
      date: data.data.date.readable,
      hijriDate: data.data.date.hijri.date,
      hijriDay: data.data.date.hijri.day,
      hijriMonth: data.data.date.hijri.month.en,
      hijriYear: data.data.date.hijri.year,
    }, { headers: cacheHeaders })
  } catch (error) {
    console.error('Prayer times fetch error:', error)
    // Return fallback for the requested city — shorter cache for fallback (5 min)
    const fallback = FALLBACK_TIMES[city] || FALLBACK_TIMES.Riyadh
    return NextResponse.json({
      city,
      timings: fallback,
      fallback: true,
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      hijriDate: '',
      hijriDay: '',
      hijriMonth: '',
      hijriYear: '',
    }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } })
  }
}
