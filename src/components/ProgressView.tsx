import { useMemo, useState } from 'react'
import { Scale, Trash2 } from 'lucide-react'
import type { AppStore } from '../hooks/useAppStore'
import { t } from '../i18n'
import { buildPlan, formatDateLabel } from '../lib/calories'
import {
  analyzeWeightProgress,
  formatKg,
  formatKgDelta,
  latestWeight,
  sortWeights,
  type WeightInsight,
} from '../lib/weightProgress'
import type { CaloriePlan, Goal, Member } from '../types'
import { LogWeightForm } from './LogWeightForm'
import { WeightChart } from './WeightChart'

interface Props {
  store: AppStore
  memberId: string
  onSelectMember: (id: string) => void
  onNeedPlan: () => void
}

export function ProgressView({ store, memberId, onSelectMember, onNeedPlan }: Props) {
  const { locale, household } = store
  const member = household.find((item) => item.id === memberId) ?? household[0] ?? null
  const [flash, setFlash] = useState('')

  const progress = useMemo(
    () => analyzeWeightProgress(member?.weights ?? [], member?.plan ?? null),
    [member],
  )
  const logs = progress.stats.logs
  const latest = progress.stats.latest

  if (!member) return null

  const plan = member.plan
  if (!plan) {
    return (
      <div className="card empty-state">
        <div className="empty-icon">
          <Scale size={28} />
        </div>
        <h2>{t(locale, 'noPlanProgressTitle')}</h2>
        <p>{t(locale, 'noPlanProgressBody')}</p>
        <button className="btn btn-primary btn-lg" type="button" onClick={onNeedPlan}>
          {t(locale, 'createPlan')}
        </button>
      </div>
    )
  }

  const applyInsight = (insight: WeightInsight) => {
    if (!latest) return
    const next = planFromInsight(plan, latest.kg, insight)
    if (!next) return
    store.savePlan(next, member.id)
    setFlash(t(locale, 'planUpdatedFromWeight', { kcal: next.dailyCalories }))
  }

  const changeCopy =
    progress.stats.totalChangeKg == null
      ? t(locale, 'unchangedKg')
      : progress.stats.totalChangeKg < -0.04
        ? t(locale, 'lostKg', { kg: formatKg(Math.abs(progress.stats.totalChangeKg)) })
        : progress.stats.totalChangeKg > 0.04
          ? t(locale, 'gainedKg', { kg: formatKg(progress.stats.totalChangeKg) })
          : t(locale, 'unchangedKg')

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'progressTitle')}</h2>
        <span>{t(locale, 'progressSub')}</span>
      </div>

      {household.length > 1 && (
        <div className="theme-pills" role="tablist" aria-label={t(locale, 'progressTitle')}>
          {household.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={member.id === item.id}
              className={`theme-pill${member.id === item.id ? ' is-active' : ''}`}
              onClick={() => onSelectMember(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'logWeight')}</h4>
            <p className="sub">{t(locale, 'logWeightSub')}</p>
          </div>
        </div>
        <LogWeightForm
          key={`${member.id}-${latest?.id ?? 'new'}`}
          locale={locale}
          idPrefix={`progress-${member.id}`}
          defaultKg={latest?.kg ?? plan.input.weightKg}
          onSubmit={(input) => {
            store.addWeight({ ...input, memberId: member.id })
            setFlash(t(locale, 'weightSaved'))
          }}
        />
      </div>

      {logs.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Scale size={28} />
          </div>
          <h2>{t(locale, 'progressEmptyTitle')}</h2>
          <p>{t(locale, 'progressEmptyBody')}</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="result-grid weight-stats">
              <Stat
                label={t(locale, 'currentWeight')}
                value={`${formatKg(progress.stats.latestKg ?? 0)} ${t(locale, 'kgUnit')}`}
                hint={latest ? formatDateLabel(latest.date, locale) : ''}
              />
              <Stat
                label={t(locale, 'startWeight')}
                value={`${formatKg(progress.stats.startKg ?? 0)} ${t(locale, 'kgUnit')}`}
                hint={progress.stats.start ? formatDateLabel(progress.stats.start.date, locale) : ''}
              />
              <Stat label={t(locale, 'totalChange')} value={changeCopy} hint={`${logs.length}`} />
              <Stat
                label={t(locale, 'weeklyRate')}
                value={
                  progress.stats.weeklyRateKg == null
                    ? '—'
                    : t(locale, 'kgPerWeek', { kg: formatKgDelta(progress.stats.weeklyRateKg) })
                }
                hint={
                  progress.stats.expectedWeeklyKg
                    ? t(locale, 'kgPerWeek', { kg: formatKgDelta(progress.stats.expectedWeeklyKg) })
                    : t(locale, 'planUsesWeight')
                }
              />
            </div>
            <div className="weight-chart-wrap">
              <WeightChart
                locale={locale}
                logs={logs}
                expectedWeeklyKg={progress.stats.expectedWeeklyKg}
              />
            </div>
            <p className="field-hint">{t(locale, 'weightFluctuationNote')}</p>
          </div>

          {flash && (
            <div className="alert alert-success">
              <strong>{flash}</strong>
            </div>
          )}

          {progress.insights.map((item) => (
            <InsightCard
              key={item.kind}
              locale={locale}
              insight={item}
              stats={progress.stats}
              goal={plan.input.goal}
              onApply={() => applyInsight(item)}
            />
          ))}

          <div className="card">
            <div className="card-header">
              <div>
                <h4>{t(locale, 'recentWeighIns')}</h4>
                <p className="sub">{member.name}</p>
              </div>
              <span className="badge badge-neutral">{logs.length}</span>
            </div>
            <ul className="exercise-list">
              {[...sortWeights(logs)].reverse().map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>
                      {formatKg(item.kg)} {t(locale, 'kgUnit')}
                    </strong>
                    <p>{formatDateLabel(item.date, locale)}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon icon-danger"
                    aria-label={t(locale, 'removeWeighIn')}
                    onClick={() => {
                      if (confirm(t(locale, 'removeWeighInConfirm'))) store.removeWeight(item.id)
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="result-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{hint}</em>
    </div>
  )
}

function InsightCard({
  locale,
  insight,
  stats,
  goal,
  onApply,
}: {
  locale: AppStore['locale']
  insight: WeightInsight
  stats: ReturnType<typeof analyzeWeightProgress>['stats']
  goal: Goal
  onApply: () => void
}) {
  const actual = formatKg(Math.abs(stats.weeklyRateKg ?? 0))
  const expected = formatKg(Math.abs(stats.expectedWeeklyKg))
  const kcal = insight.suggestedDailyCalories ?? 0
  const weekly = formatKg(insight.suggestedWeeklyChangeKg ?? 0)
  const copy = insightCopy(insight.kind, goal)
  const bodyVars = {
    actual,
    expected,
    kcal,
    weekly,
    planKg: formatKg(stats.planWeightKg ?? 0),
    currentKg: formatKg(stats.latestKg ?? 0),
    delta: formatKgDelta(stats.planDriftKg ?? 0),
  }

  return (
    <div className={`card insight-card insight-${insight.severity}`}>
      <div className="card-header">
        <div>
          <h4>{t(locale, copy.title)}</h4>
          <p className="sub">{t(locale, copy.body, bodyVars)}</p>
        </div>
      </div>
      {insight.action !== 'none' && kcal > 0 && stats.latestKg != null && (
        <div className="btn-row">
          <button className="btn btn-primary" type="button" onClick={onApply}>
            {insight.action === 'recalculate'
              ? t(locale, 'applyRecalculate', { kg: formatKg(stats.latestKg) })
              : insight.action === 'reduce_calories'
                ? t(locale, 'applyReduceCalories', { kcal })
                : t(locale, 'applyIncreaseCalories', { kcal })}
          </button>
        </div>
      )}
    </div>
  )
}

function insightCopy(kind: WeightInsight['kind'], goal: Goal) {
  if (kind === 'need_logs') return { title: 'insightNeedLogsTitle' as const, body: 'insightNeedLogsBody' as const }
  if (kind === 'need_more') return { title: 'insightNeedMoreTitle' as const, body: 'insightNeedMoreBody' as const }
  if (kind === 'on_track') return { title: 'insightOnTrackTitle' as const, body: 'insightOnTrackBody' as const }
  if (kind === 'recalculate') return { title: 'insightRecalcTitle' as const, body: 'insightRecalcBody' as const }
  if (kind === 'maintain_ok') return { title: 'insightMaintainOkTitle' as const, body: 'insightMaintainOkBody' as const }
  if (kind === 'maintain_drift') {
    return { title: 'insightMaintainDriftTitle' as const, body: 'insightMaintainDriftBody' as const }
  }
  if (kind === 'too_slow') {
    return goal === 'gain'
      ? { title: 'insightTooSlowGainTitle' as const, body: 'insightTooSlowGainBody' as const }
      : { title: 'insightTooSlowLoseTitle' as const, body: 'insightTooSlowLoseBody' as const }
  }
  if (kind === 'too_fast') {
    return goal === 'gain'
      ? { title: 'insightTooFastGainTitle' as const, body: 'insightTooFastGainBody' as const }
      : { title: 'insightTooFastLoseTitle' as const, body: 'insightTooFastLoseBody' as const }
  }
  return goal === 'gain'
    ? { title: 'insightWrongWayGainTitle' as const, body: 'insightWrongWayGainBody' as const }
    : { title: 'insightWrongWayLoseTitle' as const, body: 'insightWrongWayLoseBody' as const }
}

function planFromInsight(plan: CaloriePlan, weightKg: number, insight: WeightInsight): CaloriePlan | null {
  if (insight.action === 'none') return null
  if (insight.action === 'recalculate') {
    return buildPlan({ ...plan.input, weightKg }, plan)
  }
  const weekly =
    insight.suggestedWeeklyChangeKg ??
    plan.input.weeklyChangeKg
  return buildPlan({ ...plan.input, weightKg, weeklyChangeKg: weekly }, plan)
}

export function TodayWeightCard({
  store,
  onGoProgress,
}: {
  store: AppStore
  onGoProgress: () => void
}) {
  const { locale, household, today } = store
  const people = household.filter((item) => item.plan)

  if (people.length === 0) return null

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h4>
            <Scale size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {t(locale, 'todayWeightTitle')}
          </h4>
          <p className="sub">{t(locale, 'todayWeightSub')}</p>
        </div>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onGoProgress}>
          {t(locale, 'seeProgress')}
        </button>
      </div>
      {people.map((member) => (
        <TodayWeightRow key={member.id} store={store} member={member} today={today} />
      ))}
    </div>
  )
}

function TodayWeightRow({
  store,
  member,
  today,
}: {
  store: AppStore
  member: Member
  today: string
}) {
  const { locale, household } = store
  const todayLog = (member.weights ?? []).find((item) => item.date === today)
  const last = latestWeight(member.weights ?? [])
  const lastWhen = last && last.date !== today ? formatDateLabel(last.date, locale) : ''

  return (
    <div className="today-weight-row">
      {household.length > 1 && <strong>{member.name}</strong>}
      <p className="field-hint" style={{ margin: '0 0 0.45rem' }}>
        {todayLog
          ? t(locale, 'todayWeightLogged', { kg: formatKg(todayLog.kg) })
          : last
            ? t(locale, 'todayWeightLast', { kg: formatKg(last.kg), when: lastWhen })
            : t(locale, 'todayWeightSub')}
      </p>
      <LogWeightForm
        locale={locale}
        compact
        idPrefix={`today-${member.id}`}
        defaultKg={todayLog?.kg ?? last?.kg ?? member.plan?.input.weightKg}
        onSubmit={(input) => store.addWeight({ ...input, memberId: member.id, date: today })}
      />
    </div>
  )
}
