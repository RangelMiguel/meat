import { useId, useMemo, useState } from 'react'
import { formatDateLabel } from '../lib/calories'
import { expectedWeightAt, formatKg, sortWeights } from '../lib/weightProgress'
import { t, type Locale } from '../i18n'
import type { WeightEntry } from '../types'

interface Props {
  locale: Locale
  logs: WeightEntry[]
  expectedWeeklyKg?: number
}

export function WeightChart({ locale, logs, expectedWeeklyKg = 0 }: Props) {
  const clipId = useId()
  const [hover, setHover] = useState<number | null>(null)
  const points = useMemo(() => sortWeights(logs), [logs])

  if (points.length < 2) {
    return <p className="meal-empty">{t(locale, 'weightChartEmpty')}</p>
  }

  const width = 640
  const height = 220
  const padL = 44
  const padR = 16
  const padT = 18
  const padB = 28
  const innerW = width - padL - padR
  const innerH = height - padT - padB

  const first = points[0]
  const last = points[points.length - 1]
  const expected = points.map((item) =>
    expectedWeeklyKg === 0
      ? first.kg
      : expectedWeightAt(first.kg, first.date, item.date, expectedWeeklyKg),
  )
  const values = [...points.map((item) => item.kg), ...(expectedWeeklyKg === 0 ? [] : expected)]
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const pad = Math.max(0.8, (maxV - minV) * 0.18 || 1.2)
  const lo = minV - pad
  const hi = maxV + pad
  const span = hi - lo || 1
  const t0 = dateNum(first.date)
  const t1 = dateNum(last.date)
  const tSpan = Math.max(1, t1 - t0)

  const xy = (date: string, kg: number) => {
    const x = padL + ((dateNum(date) - t0) / tSpan) * innerW
    const y = padT + ((hi - kg) / span) * innerH
    return { x, y }
  }

  const actualCoords = points.map((item) => xy(item.date, item.kg))
  const expectedCoords = points.map((item, i) => xy(item.date, expected[i]))
  const line = (coords: { x: number; y: number }[]) =>
    coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area =
    `${line(actualCoords)} L${actualCoords[actualCoords.length - 1].x.toFixed(1)} ${padT + innerH} ` +
    `L${actualCoords[0].x.toFixed(1)} ${padT + innerH} Z`

  const yTicks = [lo + span * 0.15, (lo + hi) / 2, hi - span * 0.15]
  const xTicks = [first, points[Math.floor(points.length / 2)], last].filter(
    (item, i, arr) => arr.findIndex((row) => row.date === item.date) === i,
  )
  const active = hover != null ? points[hover] : last

  return (
    <div className="weight-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t(locale, 'weightChartAria', {
          from: formatKg(first.kg),
          to: formatKg(last.kg),
        })}
      >
        <defs>
          <linearGradient id={`${clipId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((tick) => {
          const y = padT + ((hi - tick) / span) * innerH
          return (
            <g key={tick}>
              <line
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                className="weight-chart-grid"
              />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="weight-chart-label">
                {formatKg(tick)}
              </text>
            </g>
          )
        })}
        {expectedWeeklyKg !== 0 && (
          <path d={line(expectedCoords)} className="weight-chart-expected" fill="none" />
        )}
        <path d={area} fill={`url(#${clipId}-fill)`} />
        <path d={line(actualCoords)} className="weight-chart-line" fill="none" />
        {actualCoords.map((pt, i) => (
          <circle
            key={points[i].id}
            cx={pt.x}
            cy={pt.y}
            r={hover === i ? 6 : 4}
            className={`weight-chart-dot${hover === i ? ' is-active' : ''}`}
          />
        ))}
        {xTicks.map((item) => {
          const { x } = xy(item.date, lo)
          return (
            <text key={item.date} x={x} y={height - 8} textAnchor="middle" className="weight-chart-label">
              {formatDateLabel(item.date, locale)}
            </text>
          )
        })}
        <rect
          x={padL}
          y={padT}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={(event) => {
            const svg = event.currentTarget.ownerSVGElement
            if (!svg) return
            const box = svg.getBoundingClientRect()
            const x = ((event.clientX - box.left) / box.width) * width
            let best = 0
            let dist = Infinity
            actualCoords.forEach((pt, i) => {
              const d = Math.abs(pt.x - x)
              if (d < dist) {
                dist = d
                best = i
              }
            })
            setHover(best)
          }}
          onMouseLeave={() => setHover(null)}
        />
      </svg>
      <div className="weight-chart-tip" aria-live="polite">
        <strong>
          {formatKg(active.kg)} {t(locale, 'kgUnit')}
        </strong>
        <span>{formatDateLabel(active.date, locale)}</span>
      </div>
      <p className="weight-chart-legend">
        <span className="weight-chart-key is-actual">{t(locale, 'actualTrend')}</span>
        {expectedWeeklyKg !== 0 && (
          <span className="weight-chart-key is-expected">{t(locale, 'expectedTrend')}</span>
        )}
      </p>
    </div>
  )
}

function dateNum(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
