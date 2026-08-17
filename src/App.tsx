import { useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Dumbbell,
  Flame,
  Package,
  Settings,
  ShoppingCart,
} from 'lucide-react'
import { AuthView } from './components/AuthView'
import { ExerciseView } from './components/ExerciseView'
import { CookView } from './components/CookView'
import { HistoryView } from './components/HistoryView'
import { InventoryView } from './components/InventoryView'
import { PlanForm } from './components/PlanForm'
import { PurchaseView } from './components/PurchaseView'
import { RecipesView } from './components/RecipesView'
import { SettingsView } from './components/SettingsView'
import { WeekPlanView } from './components/WeekPlanView'
import { TodayView } from './components/TodayView'
import { PwaProvider } from './components/PwaProvider'
import { assertCatalogIntegrity } from './data/catalog'
import { useAppStore } from './hooks/useAppStore'
import { t } from './i18n'
import { clearInviteFromLocation, inviteCodeFromLocation } from './lib/inviteLink'
import type { CookSession, View } from './types'

export default function App() {
  const store = useAppStore()
  const locale = store.locale
  const [view, setView] = useState<View>(() =>
    store.household.some((member) => member.plan) ? 'today' : 'plan',
  )
  const [prepareRecipeId, setPrepareRecipeId] = useState<string | null>(null)
  const [cookSession, setCookSession] = useState<CookSession | null>(null)
  const [planMemberId, setPlanMemberId] = useState<string | null>(null)

  const goTo = (next: View) => {
    setCookSession(null)
    setView(next)
  }

  useEffect(() => {
    assertCatalogIntegrity()
  }, [])

  useEffect(() => {
    if (!store.isLoggedIn) return
    const hasPlan = store.household.some((member) => member.plan)
    setView(hasPlan ? 'today' : 'plan')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.isLoggedIn])

  useEffect(() => {
    if (!store.isLoggedIn) return
    const code = inviteCodeFromLocation()
    if (!code) return
    if (store.family?.inviteCode === code) {
      clearInviteFromLocation()
      return
    }
    void store.joinFamily(code).then((err) => {
      if (!err || err === 'alreadyInFamily') clearInviteFromLocation()
    })
  }, [store.isLoggedIn, store.family?.inviteCode, store.joinFamily])

  useEffect(() => {
    if (planMemberId && store.household.some((member) => member.id === planMemberId)) return
    setPlanMemberId(store.myMember?.id ?? store.household[0]?.id ?? null)
  }, [store.household, store.myMember, planMemberId])

  const planMember =
    store.household.find((member) => member.id === planMemberId) ?? store.myMember ?? null

  return (
    <PwaProvider>
    <div className="app">
      <header className="app-header">
        <div className="container header-inner">
          <div className="brand">
            <div className="brand-mark">kcal</div>
            <div>
              <h1>meat</h1>
              <p>{t(locale, 'brandTagline')}</p>
            </div>
          </div>

          {store.isLoggedIn && (
          <nav className="main-nav" aria-label={t(locale, 'navMain')}>
            <button
              type="button"
              className={`nav-btn${view === 'today' && !cookSession ? ' is-active' : ''}`}
              onClick={() => goTo('today')}
            >
              <Flame size={16} />
              {t(locale, 'navToday')}
            </button>
            <button
              type="button"
              className={`nav-btn${view === 'plan' ? ' is-active' : ''}`}
              onClick={() => goTo('plan')}
            >
              <ClipboardList size={16} />
              {t(locale, 'navPlan')}
            </button>
            <button
              type="button"
              className={`nav-btn${view === 'week' ? ' is-active' : ''}`}
              onClick={() => goTo('week')}
            >
              <CalendarRange size={16} />
              {t(locale, 'navWeek')}
            </button>
            <button
              type="button"
              className={`nav-btn${view === 'recipes' ? ' is-active' : ''}`}
              onClick={() => goTo('recipes')}
            >
              <BookOpen size={16} />
              {t(locale, 'navRecipes')}
            </button>
            <button
              type="button"
              className={`nav-btn${view === 'inventory' && !cookSession ? ' is-active' : ''}`}
              onClick={() => goTo('inventory')}
            >
              <Package size={16} />
              {t(locale, 'navInventory')}
            </button>
            <button
              type="button"
              className={`nav-btn${view === 'purchase' && !cookSession ? ' is-active' : ''}`}
              onClick={() => goTo('purchase')}
            >
              <ShoppingCart size={16} />
              {t(locale, 'navPurchase')}
            </button>
            <button
              type="button"
              className={`nav-btn${view === 'exercise' ? ' is-active' : ''}`}
              onClick={() => goTo('exercise')}
            >
              <Dumbbell size={16} />
              {t(locale, 'navExercise')}
            </button>
            <button
              type="button"
              className={`nav-btn${view === 'history' ? ' is-active' : ''}`}
              onClick={() => goTo('history')}
            >
              <CalendarDays size={16} />
              {t(locale, 'navHistory')}
            </button>
            <button
              type="button"
              className={`nav-btn${view === 'settings' ? ' is-active' : ''}`}
              onClick={() => goTo('settings')}
            >
              <Settings size={16} />
              {t(locale, 'navSettings')}
            </button>
          </nav>
          )}
        </div>
      </header>

      <main className="main container">
        {store.status === 'loading' ? (
          <div className="card auth-card">
            <div className="card-header">
              <div>
                <h2>meat</h2>
                <p className="sub">{t(locale, 'loadingSession')}</p>
              </div>
            </div>
          </div>
        ) : !store.isLoggedIn ? (
          <AuthView store={store} />
        ) : cookSession ? (
          <CookView
            store={store}
            session={cookSession}
            onDone={() => {
              setCookSession(null)
              setView('today')
            }}
          />
        ) : (
          <>
            {view === 'today' && (
              <TodayView
                store={store}
                onGoPlan={() => goTo('plan')}
                prepareRecipeId={prepareRecipeId}
                onPrepareHandled={() => setPrepareRecipeId(null)}
                onStartCooking={(session) => setCookSession(session)}
              />
            )}
            {view === 'plan' && (
              <div className="stack-lg">
                <div className="section-title">
                  <h2>{t(locale, 'yourPlan')}</h2>
                  <span>
                    {planMember
                      ? t(locale, 'editPlanFor', { name: planMember.name })
                      : t(locale, 'personalizedTargets')}
                  </span>
                </div>
                {store.household.length > 1 && (
                  <div className="theme-pills" role="tablist" aria-label={t(locale, 'navPlan')}>
                    {store.household.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        role="tab"
                        aria-selected={planMember?.id === member.id}
                        className={`theme-pill${planMember?.id === member.id ? ' is-active' : ''}`}
                        onClick={() => setPlanMemberId(member.id)}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                )}
                {planMember && (
                  <PlanForm
                    key={planMember.id}
                    locale={locale}
                    existing={planMember.plan}
                    onSave={(plan) => {
                      store.savePlan(plan, planMember.id)
                      goTo('week')
                    }}
                  />
                )}
                {planMember?.plan && (
                  <div className="card danger-zone">
                    <div>
                      <h4>{t(locale, 'resetPlan')}</h4>
                      <p className="sub">{t(locale, 'resetPlanBody')}</p>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      type="button"
                      onClick={() => {
                        if (confirm(t(locale, 'clearPlanConfirm'))) {
                          store.clearPlan(planMember.id)
                        }
                      }}
                    >
                      {t(locale, 'clearPlan')}
                    </button>
                  </div>
                )}
              </div>
            )}
            {view === 'week' && (
              <WeekPlanView
                store={store}
                memberId={planMember?.id ?? ''}
                onSelectMember={setPlanMemberId}
                onNeedPlan={() => goTo('plan')}
                onGoPurchase={() => goTo('purchase')}
              />
            )}
            {view === 'recipes' && (
              <RecipesView
                store={store}
                onPrepare={(recipeId) => {
                  setPrepareRecipeId(recipeId)
                  goTo('today')
                }}
              />
            )}
            {view === 'inventory' && <InventoryView store={store} />}
            {view === 'purchase' && <PurchaseView store={store} />}
            {view === 'exercise' && <ExerciseView store={store} />}
            {view === 'history' && <HistoryView store={store} />}
            {view === 'settings' && (
              <SettingsView
                store={store}
                onOpenMember={(memberId) => {
                  if (memberId) setPlanMemberId(memberId)
                  goTo('plan')
                }}
              />
            )}
          </>
        )}
      </main>

      <footer className="footer container">
        <span>
          {!store.isLoggedIn
            ? t(locale, 'authSub')
            : store.householdGoal
              ? t(locale, 'householdGoalLine', {
                  eaten: Math.round(store.todayTotals.kcal),
                  goal: store.householdGoal + store.todayBurned,
                })
              : t(locale, 'noPlanYet')}
        </span>
      </footer>
    </div>
    </PwaProvider>
  )
}
