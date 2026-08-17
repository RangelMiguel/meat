import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Recipe } from '../data/types'
import { todayKey, uid } from '../lib/calories'
import { api, ApiError } from '../lib/api'
import {
  findMergedRecipe,
  isUserRecipe,
  mergeRecipeLibrary,
  USER_RECIPE_PREFIX,
} from '../lib/recipeLibrary'
import { loadState, saveState } from '../lib/storage'
import type { Locale } from '../i18n'
import { defaultTheme, type ThemeId } from '../themes'
import type { WorkspaceDTO } from '../lib/workspace-types'
import type {
  Account,
  CaloriePlan,
  ExerciseEntry,
  FoodEntry,
  InventoryItem,
  Kitchen,
  Member,
  MealType,
} from '../types'

type AuthError =
  | 'emailRequired'
  | 'nameRequired'
  | 'weakPassword'
  | 'emailTaken'
  | 'badLogin'
  | 'passkeyRequired'
  | 'passkeyUnsupported'
  | 'passkeyFailed'
  | 'passkeyExpired'
  | 'passkeyUnknown'
  | 'passkeyLast'
  | 'familyNameRequired'
  | 'badInvite'
  | 'alreadyInFamily'
  | 'notInFamily'
  | 'ownerMustDissolve'
  | 'cannotRemoveSelf'
  | 'networkError'

const AUTH_CODES = new Set<AuthError>([
  'emailRequired',
  'nameRequired',
  'weakPassword',
  'emailTaken',
  'badLogin',
  'passkeyRequired',
  'passkeyUnsupported',
  'passkeyFailed',
  'passkeyExpired',
  'passkeyUnknown',
  'passkeyLast',
  'familyNameRequired',
  'badInvite',
  'alreadyInFamily',
  'notInFamily',
  'ownerMustDissolve',
  'cannotRemoveSelf',
  'networkError',
])

function toAuthError(error: unknown): AuthError {
  const code = error instanceof ApiError ? error.code : error instanceof Error ? error.message : ''
  if (AUTH_CODES.has(code as AuthError)) return code as AuthError
  if (/user verification/i.test(code)) return 'passkeyFailed'
  return 'networkError'
}

function memberForAccount(members: Member[], accountId: string): Member | undefined {
  return members.find((member) => member.accountId === accountId)
}

function kitchenOf(kitchens: Kitchen[], kitchenId: string | undefined): Kitchen | undefined {
  if (!kitchenId) return undefined
  return kitchens.find((kitchen) => kitchen.id === kitchenId)
}

function familyMembersOf(members: Member[], familyId: string | null, fallback?: Member): Member[] {
  if (!familyId) return fallback ? [fallback] : []
  return members.filter((member) => member.familyId === familyId)
}

function dayTotals(entries: FoodEntry[], date: string) {
  return entries
    .filter((entry) => entry.date === date)
    .reduce(
      (acc, entry) => ({
        kcal: acc.kcal + entry.kcal,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    )
}

export function useAppStore() {
  const [status, setStatus] = useState<'loading' | 'anon' | 'ready'>('loading')
  const [workspace, setWorkspace] = useState<WorkspaceDTO | null>(null)
  const [theme, setThemeState] = useState<ThemeId>(defaultTheme)
  const [locale, setLocaleState] = useState<Locale>('en')

  const applyWorkspace = useCallback((next: WorkspaceDTO) => {
    setWorkspace(next)
    setThemeState(next.theme)
    setLocaleState(next.locale)
    setStatus('ready')
  }, [])

  const mutate = useCallback(
    async (body: Record<string, unknown>) => {
      const next = await api<WorkspaceDTO>('/api/workspace', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      applyWorkspace(next)
      return next
    },
    [applyWorkspace],
  )

  useEffect(() => {
    let cancelled = false
    const local = loadState()
    setThemeState(local.theme)
    setLocaleState(local.locale)

    void (async () => {
      try {
        const next = await api<WorkspaceDTO>('/api/workspace')
        if (cancelled) return
        applyWorkspace(next)
        const mine = memberForAccount(next.members, next.account.id)
        const kit = kitchenOf(next.kitchens, mine?.kitchenId)
        const empty =
          !mine?.plan &&
          (mine?.entries.length ?? 0) === 0 &&
          (kit?.inventory.length ?? 0) === 0 &&
          (kit?.customRecipes.length ?? 0) === 0
        const legacy = local.legacy
        if (empty && legacy) {
          const imported = await api<WorkspaceDTO>('/api/workspace', {
            method: 'POST',
            body: JSON.stringify({ action: 'importLegacy', ...legacy }),
          })
          if (!cancelled) applyWorkspace(imported)
        }
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          setStatus('anon')
          setWorkspace(null)
          return
        }
        setStatus('anon')
        setWorkspace(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applyWorkspace])

  useEffect(() => {
    if (status === 'loading') return
    saveState({
      accounts: [],
      sessionAccountId: null,
      activeMemberId: workspace?.activeMemberId ?? null,
      families: workspace?.family ? [workspace.family] : [],
      members: workspace?.members ?? [],
      kitchens: workspace?.kitchens ?? [],
      legacy: null,
      theme,
      locale,
    })
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.lang = locale
    document.title = locale === 'es' ? 'meat · control de calorías' : 'meat · calorie tracker'
  }, [status, workspace, theme, locale])

  const account: Account | null = workspace?.account ?? null
  const members = workspace?.members ?? []
  const kitchens = workspace?.kitchens ?? []
  const family = workspace?.family ?? null
  const myMember = account ? memberForAccount(members, account.id) ?? null : null
  const activeMember =
    members.find((member) => member.id === workspace?.activeMemberId) ?? myMember
  const kitchen = kitchenOf(kitchens, activeMember?.kitchenId) ?? null
  const household = useMemo(
    () => familyMembersOf(members, activeMember?.familyId ?? null, activeMember ?? undefined),
    [members, activeMember],
  )
  const isOwner = Boolean(account && family && family.ownerAccountId === account.id)

  const setTheme = useCallback(
    (next: ThemeId) => {
      setThemeState(next)
      if (status === 'ready') void mutate({ action: 'setTheme', theme: next })
    },
    [mutate, status],
  )

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next)
      if (status === 'ready') void mutate({ action: 'setLocale', locale: next })
    },
    [mutate, status],
  )

  const registerPasskey = useCallback(async (nickname?: string): Promise<AuthError | null> => {
    const { startRegistration, browserSupportsWebAuthn } = await import('@simplewebauthn/browser')
    if (!browserSupportsWebAuthn()) return 'passkeyUnsupported'
    try {
      const options = await api<Record<string, unknown>>('/api/auth/webauthn/register', {
        method: 'POST',
      })
      const response = await startRegistration({ optionsJSON: options as never })
      await api('/api/auth/webauthn/register', {
        method: 'PUT',
        body: JSON.stringify({ response, nickname }),
      })
      return null
    } catch (error) {
      return toAuthError(error)
    }
  }, [])

  const signUp = useCallback(
    async (input: {
      email: string
      displayName: string
      inviteCode?: string
    }): Promise<AuthError | null> => {
      const email = input.email.trim().toLowerCase()
      const displayName = input.displayName.trim()
      if (!email) return 'emailRequired'
      if (!displayName) return 'nameRequired'
      const { browserSupportsWebAuthn } = await import('@simplewebauthn/browser')
      if (!browserSupportsWebAuthn()) return 'passkeyUnsupported'
      try {
        const next = await api<WorkspaceDTO>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, displayName }),
        })
        const passkeyError = await registerPasskey(displayName)
        if (passkeyError) {
          await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
          return passkeyError
        }
        const local = loadState()
        let workspace = next
        if (local.legacy) {
          workspace = await api<WorkspaceDTO>('/api/workspace', {
            method: 'POST',
            body: JSON.stringify({ action: 'importLegacy', ...local.legacy }),
          })
        }
        if (input.inviteCode) {
          workspace = await api<WorkspaceDTO>('/api/workspace', {
            method: 'POST',
            body: JSON.stringify({ action: 'joinFamily', code: input.inviteCode }),
          })
        }
        applyWorkspace(workspace)
        return null
      } catch (error) {
        return toAuthError(error)
      }
    },
    [applyWorkspace, registerPasskey],
  )

  const logIn = useCallback(
    async (input: { email?: string; inviteCode?: string }): Promise<AuthError | null> => {
      const { startAuthentication, browserSupportsWebAuthn } = await import(
        '@simplewebauthn/browser'
      )
      if (!browserSupportsWebAuthn()) return 'passkeyUnsupported'
      try {
        const email = input.email?.trim().toLowerCase()
        const options = await api<Record<string, unknown>>('/api/auth/webauthn/login', {
          method: 'POST',
          body: JSON.stringify(email ? { email } : {}),
        })
        const response = await startAuthentication({ optionsJSON: options as never })
        let next = await api<WorkspaceDTO>('/api/auth/webauthn/login', {
          method: 'PUT',
          body: JSON.stringify({ response }),
        })
        if (input.inviteCode && !next.family) {
          next = await api<WorkspaceDTO>('/api/workspace', {
            method: 'POST',
            body: JSON.stringify({ action: 'joinFamily', code: input.inviteCode }),
          })
        }
        applyWorkspace(next)
        return null
      } catch (error) {
        return toAuthError(error)
      }
    },
    [applyWorkspace],
  )

  const logOut = useCallback(() => {
    void api('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setWorkspace(null)
    setStatus('anon')
  }, [])

  const setActiveMember = useCallback(
    (memberId: string) => {
      void mutate({ action: 'setActiveMember', memberId })
    },
    [mutate],
  )

  const createFamily = useCallback(
    async (name: string): Promise<AuthError | null> => {
      try {
        await mutate({ action: 'createFamily', name })
        return null
      } catch (error) {
        return toAuthError(error)
      }
    },
    [mutate],
  )

  const joinFamily = useCallback(
    async (code: string): Promise<AuthError | null> => {
      try {
        await mutate({ action: 'joinFamily', code })
        return null
      } catch (error) {
        return toAuthError(error)
      }
    },
    [mutate],
  )

  const leaveFamily = useCallback(async (): Promise<AuthError | null> => {
    try {
      await mutate({ action: 'leaveFamily' })
      return null
    } catch (error) {
      return toAuthError(error)
    }
  }, [mutate])

  const dissolveFamily = useCallback(async (): Promise<AuthError | null> => {
    try {
      await mutate({ action: 'dissolveFamily' })
      return null
    } catch (error) {
      return toAuthError(error)
    }
  }, [mutate])

  const addManagedMember = useCallback(
    async (name: string): Promise<AuthError | null> => {
      try {
        await mutate({ action: 'addManagedMember', name })
        return null
      } catch (error) {
        return toAuthError(error)
      }
    },
    [mutate],
  )

  const removeMember = useCallback(
    async (memberId: string): Promise<AuthError | null> => {
      try {
        await mutate({ action: 'removeMember', memberId })
        return null
      } catch (error) {
        return toAuthError(error)
      }
    },
    [mutate],
  )

  const regenerateInviteCode = useCallback(() => {
    void mutate({ action: 'regenerateInviteCode' })
  }, [mutate])

  const savePlan = useCallback(
    (plan: CaloriePlan, memberId?: string) => {
      void mutate({ action: 'savePlan', plan, memberId })
    },
    [mutate],
  )

  const clearPlan = useCallback(
    (memberId?: string) => {
      void mutate({ action: 'clearPlan', memberId })
    },
    [mutate],
  )

  const addEntry = useCallback(
    (
      entry: Omit<FoodEntry, 'id' | 'createdAt' | 'date'> & { date?: string },
      memberIds?: string[],
    ) => {
      void mutate({ action: 'addEntry', entry, memberIds })
    },
    [mutate],
  )

  const logRecipeWithInventory = useCallback(
    async (input: {
      meal: MealType
      name: string
      detail?: string
      recipeId: string
      portions: {
        memberId: string
        servings: number
        kcal: number
        protein: number
        carbs: number
        fat: number
      }[]
    }) => {
      if (!input.recipeId || input.portions.length === 0) return false
      try {
        await mutate({ action: 'logRecipeWithInventory', ...input })
        return true
      } catch {
        return false
      }
    },
    [mutate],
  )

  const recipes = useMemo(
    () => mergeRecipeLibrary(kitchen?.customRecipes ?? [], kitchen?.recipeOverrides ?? {}),
    [kitchen],
  )

  const recipeById = useCallback(
    (id: string) =>
      findMergedRecipe(id, kitchen?.customRecipes ?? [], kitchen?.recipeOverrides ?? {}),
    [kitchen],
  )

  const saveRecipe = useCallback(
    (input: Omit<Recipe, 'id'> & { id?: string }) => {
      const id = input.id ?? `${USER_RECIPE_PREFIX}${uid()}`
      const recipe: Recipe = {
        ...input,
        id,
        name: input.name.trim() || 'Untitled recipe',
        nameEs: (input.nameEs || input.name).trim() || 'Untitled recipe',
        servings: Math.max(1, input.servings || 4),
        ingredients: input.ingredients.filter((line) => line.ingredientId && line.grams > 0),
        steps: (input.steps ?? []).map((step) => step.trim()).filter(Boolean),
      }
      void mutate({ action: 'saveRecipe', recipe })
      return recipe
    },
    [mutate],
  )

  const deleteRecipe = useCallback(
    (id: string) => {
      void mutate({ action: 'deleteRecipe', id })
    },
    [mutate],
  )

  const resetRecipe = useCallback(
    (id: string) => {
      if (isUserRecipe(id)) return
      void mutate({ action: 'resetRecipe', id })
    },
    [mutate],
  )

  const removeEntry = useCallback(
    (id: string) => {
      void mutate({ action: 'removeEntry', id })
    },
    [mutate],
  )

  const setWater = useCallback(
    (date: string, glasses: number, memberId?: string) => {
      void mutate({ action: 'setWater', date, glasses, memberId })
    },
    [mutate],
  )

  const addExercise = useCallback(
    (input: {
      kind: ExerciseEntry['kind']
      name: string
      minutes: number
      date?: string
      members: { memberId: string; kcal: number }[]
    }) => {
      void mutate({ action: 'addExercise', ...input })
    },
    [mutate],
  )

  const removeExercise = useCallback(
    (id: string) => {
      void mutate({ action: 'removeExercise', id })
    },
    [mutate],
  )

  const addInventoryItem = useCallback(
    (item: Pick<InventoryItem, 'ingredientId' | 'boughtOn' | 'grams'>) => {
      void mutate({ action: 'addInventoryItem', ...item })
    },
    [mutate],
  )

  const updateInventoryLot = useCallback(
    (id: string, patch: Partial<Pick<InventoryItem, 'grams' | 'boughtOn'>>) => {
      void mutate({ action: 'updateInventoryLot', id, ...patch })
    },
    [mutate],
  )

  const removeInventoryItem = useCallback(
    (id: string) => {
      void mutate({ action: 'removeInventoryItem', id })
    },
    [mutate],
  )

  const gramsOnHand = useCallback(
    (ingredientId: string) =>
      (kitchen?.inventory ?? [])
        .filter((item) => item.ingredientId === ingredientId)
        .reduce((sum, item) => sum + item.grams, 0),
    [kitchen],
  )

  const addToPurchaseList = useCallback(
    (items: { ingredientId: string; grams: number }[]) => {
      void mutate({ action: 'addToPurchaseList', items })
    },
    [mutate],
  )

  const updatePurchaseItem = useCallback(
    (id: string, grams: number) => {
      void mutate({ action: 'updatePurchaseItem', id, grams })
    },
    [mutate],
  )

  const removePurchaseItem = useCallback(
    (id: string) => {
      void mutate({ action: 'removePurchaseItem', id })
    },
    [mutate],
  )

  const completePurchaseList = useCallback(() => {
    void mutate({ action: 'completePurchaseList' })
  }, [mutate])

  const today = todayKey()
  const entries = activeMember?.entries ?? []
  const water = activeMember?.water ?? {}
  const plan = myMember?.plan ?? activeMember?.plan ?? null

  const householdTodayEntries = useMemo(() => {
    const list: (FoodEntry & { memberId: string; memberName: string })[] = []
    for (const member of household) {
      for (const entry of member.entries) {
        if (entry.date === today) {
          list.push({ ...entry, memberId: member.id, memberName: member.name })
        }
      }
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [household, today])

  const todayEntries = householdTodayEntries

  const todayTotals = useMemo(
    () =>
      householdTodayEntries.reduce(
        (acc, entry) => ({
          kcal: acc.kcal + entry.kcal,
          protein: acc.protein + entry.protein,
          carbs: acc.carbs + entry.carbs,
          fat: acc.fat + entry.fat,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [householdTodayEntries],
  )
  const waterToday = water[today] ?? 0

  const entriesByMeal = useMemo(() => {
    const map: Record<MealType, (FoodEntry & { memberId: string; memberName: string })[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snack: [],
    }
    for (const entry of householdTodayEntries) map[entry.meal].push(entry)
    return map
  }, [householdTodayEntries])

  const historyDays = useMemo(() => {
    const dates = new Set<string>()
    for (const member of household) {
      for (const entry of member.entries) dates.add(entry.date)
      for (const item of member.exercises ?? []) dates.add(item.date)
      for (const [date, glasses] of Object.entries(member.water)) {
        if ((glasses ?? 0) > 0) dates.add(date)
      }
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a))
  }, [household])

  const familyToday = useMemo(
    () =>
      household.map((member) => ({
        member,
        totals: dayTotals(member.entries, today),
        burned: (member.exercises ?? [])
          .filter((item) => item.date === today)
          .reduce((sum, item) => sum + item.kcal, 0),
        water: member.water[today] ?? 0,
      })),
    [household, today],
  )

  const todayExercises = useMemo(() => {
    const list: (ExerciseEntry & { memberId: string; memberName: string })[] = []
    for (const member of household) {
      for (const item of member.exercises ?? []) {
        if (item.date === today) {
          list.push({ ...item, memberId: member.id, memberName: member.name })
        }
      }
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [household, today])

  const todayBurned = useMemo(
    () => todayExercises.reduce((sum, item) => sum + item.kcal, 0),
    [todayExercises],
  )

  const householdGoal = useMemo(
    () => household.reduce((sum, member) => sum + (member.plan?.dailyCalories ?? 0), 0),
    [household],
  )

  const householdMacros = useMemo(
    () =>
      household.reduce(
        (acc, member) => {
          if (!member.plan) return acc
          return {
            proteinG: acc.proteinG + member.plan.macros.proteinG,
            carbsG: acc.carbsG + member.plan.macros.carbsG,
            fatG: acc.fatG + member.plan.macros.fatG,
            waterGlasses: acc.waterGlasses + member.plan.waterGlasses,
          }
        },
        { proteinG: 0, carbsG: 0, fatG: 0, waterGlasses: 0 },
      ),
    [household],
  )

  return {
    status,
    account,
    myMember,
    activeMember,
    family,
    household,
    familyToday,
    householdGoal,
    householdMacros,
    isOwner,
    isLoggedIn: status === 'ready' && Boolean(account),
    plan,
    entries,
    water,
    inventory: kitchen?.inventory ?? [],
    purchaseList: kitchen?.purchaseList ?? [],
    customRecipes: kitchen?.customRecipes ?? [],
    recipeOverrides: kitchen?.recipeOverrides ?? {},
    theme,
    locale,
    setLocale,
    today,
    todayEntries,
    todayTotals,
    todayExercises,
    todayBurned,
    waterToday,
    entriesByMeal,
    historyDays,
    setTheme,
    signUp,
    logIn,
    registerPasskey,
    logOut,
    setActiveMember,
    createFamily,
    joinFamily,
    leaveFamily,
    dissolveFamily,
    addManagedMember,
    removeMember,
    regenerateInviteCode,
    savePlan,
    clearPlan,
    addEntry,
    logRecipeWithInventory,
    removeEntry,
    addExercise,
    removeExercise,
    setWater,
    gramsOnHand,
    addInventoryItem,
    updateInventoryLot,
    removeInventoryItem,
    addToPurchaseList,
    updatePurchaseItem,
    removePurchaseItem,
    completePurchaseList,
    recipes,
    recipeById,
    saveRecipe,
    deleteRecipe,
    resetRecipe,
  }
}

export type AppStore = ReturnType<typeof useAppStore>
export type { AuthError }
