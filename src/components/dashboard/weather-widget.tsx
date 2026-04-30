'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  Droplets,
  Wind,
  MapPin,
  ChevronDown,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n/use-translation'

// ─── Types ────────────────────────────────────────────────────────

interface ForecastDay {
  day: string
  dayAr: string
  high: number
  low: number
  condition: string
  icon: string
}

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

// ─── City Data ─────────────────────────────────────────────────────

const CITIES = [
  { key: 'riyadh', nameEn: 'Riyadh', nameAr: 'الرياض' },
  { key: 'jeddah', nameEn: 'Jeddah', nameAr: 'جدة' },
  { key: 'mecca', nameEn: 'Mecca', nameAr: 'مكة' },
  { key: 'medina', nameEn: 'Medina', nameAr: 'المدينة' },
  { key: 'dammam', nameEn: 'Dammam', nameAr: 'الدمام' },
]

// ─── Condition Icon Mapper ─────────────────────────────────────────

function WeatherIcon({ icon, className = '', animate = false }: { icon: string; className?: string; animate?: boolean }) {
  const iconMap: Record<string, React.ElementType> = {
    sun: Sun,
    cloud: Cloud,
    'cloud-rain': CloudRain,
    'cloud-sun': CloudSun,
  }

  const IconComponent = iconMap[icon] || Sun

  if (animate) {
    return (
      <motion.div
        animate={
          icon === 'sun'
            ? { y: [0, -3, 0] }
            : icon === 'cloud' || icon === 'cloud-sun'
              ? { x: [0, 2, 0] }
              : { y: [0, 1, 0] }
        }
        transition={{
          duration: icon === 'sun' ? 3 : icon === 'cloud' || icon === 'cloud-sun' ? 4 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={className}
      >
        <IconComponent className="size-full" />
      </motion.div>
    )
  }

  return <IconComponent className={className} />
}

// ─── Condition Label ───────────────────────────────────────────────

function getConditionLabel(condition: string, isRTL: boolean): string {
  const t = useI18n.getState().t
  const labels: Record<string, string> = {
    sunny: t.weather.sunny,
    partlyCloudy: t.weather.partlyCloudy,
    cloudy: t.weather.cloudy,
    rainy: t.weather.rainy,
    clear: t.weather.clear,
  }
  return labels[condition] || (isRTL ? 'مشمس' : 'Sunny')
}

// ─── Fallback Weather (Riyadh) ─────────────────────────────────────

const FALLBACK_WEATHER: WeatherData = {
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
}

// ─── Weather Widget Component ──────────────────────────────────────

export function WeatherWidget() {
  const { t, isRTL } = useI18n()
  const [selectedCity, setSelectedCity] = useState('riyadh')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [citySelectorOpen, setCitySelectorOpen] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)

  // Close city selector when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setCitySelectorOpen(false)
      }
    }
    if (citySelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [citySelectorOpen])

  const fetchWeather = useCallback(async (city: string) => {
    setIsLoading(true)
    setError(false)
    try {
      const response = await fetch(`/api/weather?city=${city}`)
      if (!response.ok) throw new Error('Failed to fetch weather')
      const data = await response.json() as WeatherData
      setWeather(data)
    } catch {
      setError(true)
      setWeather(FALLBACK_WEATHER)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWeather(selectedCity)
  }, [selectedCity, fetchWeather])

  const currentCity = CITIES.find((c) => c.key === selectedCity) || CITIES[0]

  const handleCitySelect = (cityKey: string) => {
    setSelectedCity(cityKey)
    setCitySelectorOpen(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.23, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="relative overflow-hidden glass rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-5">
        {/* Weather-themed subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/[0.03] via-transparent to-orange-500/[0.02]" />

        {/* Header: Title + City Selector */}
        <div className="relative mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-[--text-primary]">
              {t.weather.weather}
            </h3>
          </div>

          {/* City Selector Dropdown */}
          <div ref={selectorRef} className="relative">
            <button
              onClick={() => setCitySelectorOpen(!citySelectorOpen)}
              className="flex items-center gap-1 text-xs bg-transparent border border-white/[0.08] rounded-lg px-2 py-1 text-[--text-muted] hover:text-[--text-primary] hover:border-white/[0.15] transition-colors"
            >
              {isRTL ? currentCity.nameAr : currentCity.nameEn}
              <ChevronDown className={`size-3 transition-transform ${citySelectorOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {citySelectorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-full mt-1 z-50 min-w-[140px] rounded-lg border border-white/[0.08] bg-[#111117]/95 backdrop-blur-xl shadow-xl overflow-hidden ${
                    isRTL ? 'left-0' : 'right-0'
                  }`}
                >
                  {CITIES.map((city) => (
                    <button
                      key={city.key}
                      onClick={() => handleCitySelect(city.key)}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/[0.05] ${
                        selectedCity === city.key
                          ? 'text-amber-400 bg-amber-400/[0.08]'
                          : 'text-[--text-muted]'
                      }`}
                    >
                      <span className="text-[--text-primary]">{isRTL ? city.nameAr : city.nameEn}</span>
                      <span className="text-[--text-muted] mx-1.5">·</span>
                      <span className="text-[--text-muted]">{isRTL ? city.nameEn : city.nameAr}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main Weather Display */}
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-4">
              {/* Weather Icon Container */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center text-amber-400">
                <WeatherIcon icon={weather?.icon || 'sun'} className="size-6" animate />
              </div>

              {/* Temperature + Condition */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-[var(--text-primary)]">
                    {weather?.temp ?? '--'}°
                  </span>
                  <span className="text-xs text-[--text-muted]">
                    {weather ? getConditionLabel(weather.condition, isRTL) : ''}
                  </span>
                </div>
                <p className="text-xs text-[--text-muted] mt-0.5">
                  {t.weather.feelsLike} {weather?.feelsLike ?? '--'}°
                </p>
              </div>
            </div>

            {/* Humidity + Wind Row */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-[--text-muted]">
                <Droplets className="size-3.5 text-blue-400" />
                <span>{t.weather.humidity}</span>
                <span className="text-[--text-primary] font-medium">{weather?.humidity ?? '--'}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[--text-muted]">
                <Wind className="size-3.5 text-emerald-400" />
                <span>{t.weather.wind}</span>
                <span className="text-[--text-primary] font-medium">{weather?.windSpeed ?? '--'} km/h</span>
              </div>
            </div>

            {/* 3-Day Mini Forecast */}
            {weather?.forecast && weather.forecast.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-wider text-[--text-muted] mb-2">
                  {t.weather.forecast}
                </p>
                <div className="space-y-1.5">
                  {weather.forecast.map((day) => (
                    <div
                      key={day.day}
                      className="flex items-center gap-2 text-xs text-[--text-muted]"
                    >
                      <span className="w-8 text-[--text-primary] font-medium">
                        {isRTL ? day.dayAr : day.day}
                      </span>
                      <WeatherIcon icon={day.icon} className="size-3.5" />
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-[--text-primary] font-medium">{day.high}°</span>
                        <span className="text-[--text-muted]">/</span>
                        <span>{day.low}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error indicator */}
            {error && (
              <p className="mt-2 text-[10px] text-[--text-muted]/50 text-center">
                {isRTL ? 'يتم عرض بيانات تقريبية' : 'Showing approximate data'}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
