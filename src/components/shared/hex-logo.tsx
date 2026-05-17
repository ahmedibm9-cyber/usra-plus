export function HexLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 40 44" fill="none" aria-hidden="true">
      <path
        d="M20 1L37.3205 10.5V29.5L20 39L2.67949 29.5V10.5L20 1Z"
        fill="currentColor"
        fillOpacity={0.15}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path d="M20 8L30.3923 14V26L20 32L9.6077 26V14L20 8Z" fill="currentColor" fillOpacity={0.5} />
      <path d="M20 14L25.5885 17.5V24.5L20 28L14.4115 24.5V17.5L20 14Z" fill="currentColor" />
    </svg>
  )
}
