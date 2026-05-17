import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingScreen } from '@/components/shared/loading-screen'

describe('LoadingScreen', () => {
  it('renders loading indicator', () => {
    render(<LoadingScreen />)
    expect(screen.getByText(/usra plus/i)).toBeInTheDocument()
  })
})
