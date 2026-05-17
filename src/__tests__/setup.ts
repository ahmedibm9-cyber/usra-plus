import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// Mock Next.js dynamic import
vi.mock('next/dynamic', () => ({
  default: (importFn: () => Promise<{ default: React.ComponentType<any> }>) => importFn,
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
  isDemoMode: () => true,
  isDemoUserId: () => false,
}))

// Mock Zustand stores
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: Object.assign(
    vi.fn((selector: (state: any) => any) => selector({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      setIsLoading: vi.fn(),
      setIsAuthenticated: vi.fn(),
      setUser: vi.fn(),
      logout: vi.fn(),
    })),
    {
      getState: vi.fn(() => ({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      })),
    }
  ),
}))

vi.mock('@/stores/app-store', () => ({
  useAppStore: Object.assign(
    vi.fn((selector: (state: any) => any) => selector({
      currentPage: 'dashboard',
      currentFamily: null,
      showOnboarding: false,
      demoDataReady: true,
      sidebarCollapsed: false,
      setCurrentPage: vi.fn(),
      setFamilies: vi.fn(),
      setCurrentFamily: vi.fn(),
      setFamilyMembers: vi.fn(),
      setShowOnboarding: vi.fn(),
    })),
    {
      getState: vi.fn(() => ({
        currentPage: 'dashboard',
        currentFamily: null,
        demoDataReady: true,
      })),
    }
  ),
}))

vi.mock('@/stores/selectors', () => ({
  useCurrentPage: () => 'dashboard',
  useCurrentFamily: () => null,
  useShowOnboarding: () => false,
  useDemoDataReady: () => true,
  useSidebarCollapsed: () => false,
  useCurrentUser: () => null,
}))

vi.mock('@/i18n/use-translation', () => ({
  useI18n: Object.assign(
    vi.fn(() => ({
      language: 'en',
      isRTL: false,
      t: (key: string) => key,
      setLanguage: vi.fn(),
    })),
    {
      getState: vi.fn(() => ({
        language: 'en',
        isRTL: false,
      })),
    }
  ),
}))

// Mock MUI
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material')
  return {
    ...actual,
    useMediaQuery: () => true,
    useTheme: () => ({ palette: { primary: { main: '#0D6B58' } } }),
  }
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = '0px'
  readonly thresholds: ReadonlyArray<number> = [0]
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = () => [] as IntersectionObserverEntry[]
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
