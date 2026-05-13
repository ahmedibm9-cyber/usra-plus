'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  WbSunny,
  Cloud,
  WaterDrop,
  Air,
  LocationOn,
  ExpandMore,
  CloudQueue,
  Grain,
} from '@mui/icons-material'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Skeleton as MuiSkeleton,
  Chip,
  Divider,
  alpha,
  createTheme,
  ThemeProvider,
  Stack,
  Button,
} from '@mui/material'

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

function WeatherIcon({ icon, animate = false }: { icon: string; animate?: boolean }) {
  const iconMap: Record<string, React.ElementType> = {
    sun: WbSunny,
    cloud: Cloud,
    'cloud-rain': Grain,
    'cloud-sun': CloudQueue,
  }

  const IconComponent = iconMap[icon] || WbSunny

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
      >
        <IconComponent sx={{ fontSize: 'inherit' }} />
      </motion.div>
    )
  }

  return <IconComponent sx={{ fontSize: 'inherit' }} />
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

// ─── Teal theme ────────────────────────────────────────────────────

const tealTheme = createTheme({
  palette: {
    primary: { main: '#0D6B58' },
    secondary: { main: '#F59E0B' },
  },
  shape: { borderRadius: 16 },
})

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
    <ThemeProvider theme={tealTheme}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.23, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Card sx={{ borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 2.5, lg: 3 }, '&:last-child': { pb: { xs: 2.5, lg: 3 } } }}>
            {/* Header: Title + City Selector */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {t.weather.weather}
                </Typography>
              </Box>

              {/* City Selector */}
              <Box ref={selectorRef} sx={{ position: 'relative' }}>
                <Button
                  size="small"
                  onClick={() => setCitySelectorOpen(!citySelectorOpen)}
                  endIcon={<ExpandMore sx={{ fontSize: 12, transition: 'transform 0.2s', transform: citySelectorOpen ? 'rotate(180deg)' : 'none' }} />}
                  sx={{
                    fontSize: 12,
                    textTransform: 'none',
                    color: 'text.secondary',
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    px: 1,
                    py: 0.25,
                    minWidth: 0,
                  }}
                >
                  {isRTL ? currentCity.nameAr : currentCity.nameEn}
                </Button>

                <AnimatePresence>
                  {citySelectorOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '100%',
                          mt: 0.5,
                          zIndex: 50,
                          minWidth: 140,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                          boxShadow: 3,
                          overflow: 'hidden',
                          [isRTL ? 'left' : 'right']: 0,
                        }}
                      >
                        {CITIES.map((city) => (
                          <Button
                            key={city.key}
                            fullWidth
                            onClick={() => handleCitySelect(city.key)}
                            sx={{
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              px: 1.5,
                              py: 0.75,
                              fontSize: 12,
                              color: selectedCity === city.key ? 'primary.main' : 'text.secondary',
                              bgcolor: selectedCity === city.key ? alpha('#0D6B58', 0.08) : 'transparent',
                              borderRadius: 0,
                              '&:hover': { bgcolor: alpha('#0D6B58', 0.06) },
                            }}
                          >
                            <Typography component="span" sx={{ color: 'text.primary', fontSize: 12 }}>
                              {isRTL ? city.nameAr : city.nameEn}
                            </Typography>
                            <Typography component="span" sx={{ mx: 0.75, color: 'text.secondary', fontSize: 12 }}>·</Typography>
                            <Typography component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>
                              {isRTL ? city.nameEn : city.nameAr}
                            </Typography>
                          </Button>
                        ))}
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </Box>

            {/* Main Weather Display */}
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <MuiSkeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <MuiSkeleton width="40%" height={24} />
                  <MuiSkeleton width="60%" height={12} sx={{ mt: 0.5 }} />
                </Box>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {/* Weather Icon */}
                  <Box sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: alpha('#0D6B58', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    fontSize: 20,
                  }}>
                    <WeatherIcon icon={weather?.icon || 'sun'} animate />
                  </Box>

                  {/* Temperature + Condition */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                      <Typography variant="h5" sx={{ fontWeight: 400 }}>
                        {weather?.temp ?? '--'}°
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {weather ? getConditionLabel(weather.condition, isRTL) : ''}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                      {t.weather.feelsLike} {weather?.feelsLike ?? '--'}°
                    </Typography>
                  </Box>
                </Box>

                {/* Humidity + Wind Row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <WaterDrop sx={{ fontSize: 12, color: 'primary.main' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {weather?.humidity ?? '--'}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Air sx={{ fontSize: 12, color: 'secondary.main' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {weather?.windSpeed ?? '--'} km/h
                    </Typography>
                  </Box>
                </Box>

                {/* 3-Day Forecast */}
                {weather?.forecast && weather.forecast.length > 0 && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, mb: 0.75, display: 'block' }}>
                      {t.weather.forecast}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      {weather.forecast.map((day) => (
                        <Box key={day.day} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                          <Typography variant="caption" sx={{ fontWeight: 500, fontSize: 11, flexShrink: 0 }}>
                            {isRTL ? day.dayAr : day.day}
                          </Typography>
                          <Box sx={{ fontSize: 14, color: 'primary.main', flexShrink: 0 }}>
                            <WeatherIcon icon={day.icon} />
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>{day.high}°</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>/</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{day.low}°</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Error indicator */}
                {error && (
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.secondary', opacity: 0.5, fontSize: 10 }}>
                    {isRTL ? 'يتم عرض بيانات تقريبية' : 'Showing approximate data'}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </ThemeProvider>
  )
}
