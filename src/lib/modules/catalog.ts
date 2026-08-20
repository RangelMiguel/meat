/**
 * App module catalog.
 *
 * Core modules ship with the household. Add-ons are listed in the in-app
 * marketplace and must be installed (HouseholdModule) before they appear
 * in nav or their APIs answer.
 */

export type ModuleKind = 'core' | 'addon'

export type AppModuleId =
  | 'today'
  | 'plan'
  | 'progress'
  | 'recipes'
  | 'inventory'
  | 'purchase'
  | 'settings'
  | 'week'
  | 'exercise'
  | 'history'
  | 'ai'

export type AppModuleDef = {
  id: AppModuleId
  kind: ModuleKind
  /** Matches the in-app view id when the module has a screen. */
  view?: AppModuleId
  priceCents: number
}

export const APP_MODULES: AppModuleDef[] = [
  { id: 'today', kind: 'core', view: 'today', priceCents: 0 },
  { id: 'plan', kind: 'core', view: 'plan', priceCents: 0 },
  { id: 'progress', kind: 'core', view: 'progress', priceCents: 0 },
  { id: 'recipes', kind: 'core', view: 'recipes', priceCents: 0 },
  { id: 'inventory', kind: 'core', view: 'inventory', priceCents: 0 },
  { id: 'purchase', kind: 'core', view: 'purchase', priceCents: 0 },
  { id: 'settings', kind: 'core', view: 'settings', priceCents: 0 },
  { id: 'ai', kind: 'core', view: 'ai', priceCents: 0 },
  { id: 'week', kind: 'core', view: 'week', priceCents: 0 },
  { id: 'exercise', kind: 'addon', view: 'exercise', priceCents: 0 },
  { id: 'history', kind: 'addon', view: 'history', priceCents: 0 },
]

export const ADDON_MODULES = APP_MODULES.filter((m) => m.kind === 'addon')

export function getModule(id: string): AppModuleDef | undefined {
  return APP_MODULES.find((m) => m.id === id)
}

export function isAddonModule(id: string): boolean {
  return getModule(id)?.kind === 'addon'
}

export function addonViewIds(): AppModuleId[] {
  return ADDON_MODULES.map((m) => m.id)
}
