import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  CircleHelp,
  ClipboardList,
  Dumbbell,
  Flame,
  LogOut,
  Package,
  Scale,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
} from 'lucide-react'
import { LOCALES, t, type Locale } from '../../i18n'
import type { View } from '../../types'

type NavItem = {
  id: View
  label: string
  icon: LucideIcon
  addon?: boolean
}

interface Props {
  locale: Locale
  view: View
  cooking: boolean
  householdName?: string | null
  userName?: string
  onGo: (view: View) => void
  onLocale: (locale: Locale) => void
  onLogout: () => void
  onNavigate?: () => void
  installedModules?: string[]
}

export function Sidebar({
  locale,
  view,
  cooking,
  householdName,
  userName,
  onGo,
  onLocale,
  onLogout,
  onNavigate,
  installedModules = [],
}: Props) {
  const go = (next: View) => {
    onGo(next)
    onNavigate?.()
  }

  const items: NavItem[] = [
    { id: 'today', label: t(locale, 'navToday'), icon: Flame },
    { id: 'plan', label: t(locale, 'navPlan'), icon: ClipboardList },
    { id: 'progress', label: t(locale, 'navProgress'), icon: Scale },
    { id: 'week', label: t(locale, 'navWeek'), icon: CalendarRange, addon: true },
    { id: 'recipes', label: t(locale, 'navRecipes'), icon: BookOpen },
    { id: 'inventory', label: t(locale, 'navInventory'), icon: Package },
    { id: 'purchase', label: t(locale, 'navPurchase'), icon: ShoppingCart },
    { id: 'exercise', label: t(locale, 'navExercise'), icon: Dumbbell, addon: true },
    { id: 'history', label: t(locale, 'navHistory'), icon: CalendarDays, addon: true },
    { id: 'marketplace', label: t(locale, 'navMarketplace'), icon: Store },
    { id: 'settings', label: t(locale, 'navSettings'), icon: Settings },
    { id: 'ai', label: t(locale, 'navAi'), icon: Sparkles },
    { id: 'help', label: t(locale, 'navHelp'), icon: CircleHelp },
  ]
  const visible = items.filter((item) => !item.addon || installedModules.includes(item.id))

  return (
    <aside className="sidebar-shell" aria-label={t(locale, 'navMain')}>
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden>
          <span>✦</span>
        </div>
        <div className="sidebar-brand-copy">
          <div className="font-display">{t(locale, 'brandName')}</div>
          <div>
            {householdName || t(locale, 'brandTagline')}
            {userName ? ` · ${userName}` : ''}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label={t(locale, 'navMain')}>
        {visible.map((item) => {
          const Icon = item.icon
          const active = view === item.id && !cooking
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item${active ? ' nav-item-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              <Icon size={16} aria-hidden />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="lang-switch" role="group" aria-label={t(locale, 'language')}>
          {LOCALES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={locale === item.id}
              className={locale === item.id ? 'is-active' : ''}
              onClick={() => onLocale(item.id)}
            >
              {item.id.toUpperCase()}
            </button>
          ))}
        </div>
        <button type="button" className="nav-item sidebar-logout" onClick={onLogout}>
          <LogOut size={16} aria-hidden />
          <span>{t(locale, 'logOut')}</span>
        </button>
      </div>
    </aside>
  )
}
