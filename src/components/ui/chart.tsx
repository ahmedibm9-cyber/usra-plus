import React from 'react'
import MuiChart from 'recharts'

export {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export function Chart({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
