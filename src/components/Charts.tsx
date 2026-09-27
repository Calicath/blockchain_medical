import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'

interface TimeSeriesPoint {
  date: string
  value: number
}

interface TimeLineChartProps {
  title: string
  data: TimeSeriesPoint[]
  yLabel?: string
}

export function TimeLineChart({ title, data, yLabel }: TimeLineChartProps) {
  if (!data.length) return null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any) => value}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#596A4A"
              strokeWidth={2}
              dot={{ r: 3, fill: '#596A4A' }}
              activeDot={{ r: 5, fill: '#596A4A' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {yLabel && (
        <p className="mt-2 text-xs text-gray-500">
          单位：{yLabel}
        </p>
      )}
    </div>
  )
}

interface TimeBarChartProps {
  title: string
  data: TimeSeriesPoint[]
  yLabel?: string
}

export function TimeBarChart({ title, data, yLabel }: TimeBarChartProps) {
  if (!data.length) return null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any) => value}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="value" fill="#596A4A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {yLabel && (
        <p className="mt-2 text-xs text-gray-500">
          单位：{yLabel}
        </p>
      )}
    </div>
  )
}

