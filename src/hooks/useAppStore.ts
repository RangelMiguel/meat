import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Recipe } from '../data/types'
import { clampBoughtOn, clampGrams, todayKey, uid } from '../lib/calories'
import {
  hashPassword,
  makeInviteCode,
  normalizeEmail,
  normalizeInviteCode,
  randomSalt,
  verifyPassword,
} from '../lib/auth'
import { consumeInventoryLots, recipeNeedsForServings } from '../lib/portions'
import {
  findMergedRecipe,
  isUserRecipe,
  mergeRecipeLibrary,
  USER_RECIPE_PREFIX,
} from '../lib/recipeLibrary'
import { loadState, saveState } from '../lib/storage'
import type { Locale } from '../i18n'
import type { ThemeId } from '../themes'
import type {
  Account,
  AppState,
  CaloriePlan,
  ExerciseEntry,
  Family,
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
  | 'familyNameRequired'
  | 'badInvite'
  | 'alreadyInFamily'
  | 'notInFamily'
  | 'ownerMustDissolve'
  | 'cannotRemoveSelf'

function emptyKitchen(partial: Pick<Kitchen, 'id' | 'familyId' | 'ownerAccountId'>): Kitchen {
  return {
    ...partial,
    inventory: [],
    purchaseList: [],
    customRecipes: [],
    recipeOverrides: {},
  }
}

function emptyMember(
  partial: Pick<Member, 'id' | 'accountId' | 'familyId' | 'kitchenId' | 'name'>,
): Member {
  return {
    ...partial,
    plan: null,
    entries: [],
    exercises: [],
    water: {},
  }
}

function memberForAccount(state: AppState, accountId: string): Member | undefined {
  return state.members.find((member) => member.accountId === accountId)
}

function activeMemberOf(state: AppState): Member | undefined {
  return state.members.find((member) => member.id === state.activeMemberId)
}

function kitchenOf(state: AppState, kitchenId: string | undefined): Kitchen | undefined {
  if (!kitchenId) return undefined
  return state.kitchens.find((kitchen) => kitchen.id === kitchenId)
}

function familyMembersOf(state: AppState, familyId: string | null): Member[] {
  if (!familyId) {
    const member = activeMemberOf(state)
    return member ? [member] : []
  }
  return state.members.filter((member) => member.familyId === familyId)
}

function canViewMember(state: AppState, memberId: string): boolean {
  const accountId = state.sessionAccountId
  if (!accountId) return false
  const mine = memberForAccount(state, accountId)
  const target = state.members.find((member) => member.id === memberId)
  if (!mine || !target) return false
  if (target.id === mine.id) return true
  return Boolean(mine.familyId && mine.familyId === target.familyId)
}

function patchMember(
  state: AppState,
  memberId: string,
  patch: (member: Member) => Member,
): AppState {
  return {
    ...state,
    members: state.members.map((member) => (member.id === memberId ? patch(member) : member)),
  }
}

function patchKitchen(
  state: AppState,
  kitchenId: string,
  patch: (kitchen: Kitchen) => Kitchen,
): AppState {
  return {
    ...state,
    kitchens: state.kitchens.map((kitchen) =>
      kitchen.id === kitchenId ? patch(kitchen) : kitchen,
    ),
  }
}

function mergeKitchens(into: Kitchen, from: Kitchen): Kitchen {
  const inventory = [...into.inventory]
  for (const lot of from.inventory) {
    const idx = inventory.findIndex(
      (item) => item.ingredientId === lot.ingredientId && item.boughtOn === lot.boughtOn,
    )
    if (idx === -1) inventory.push(lot)
    else inventory[idx] = { ...inventory[idx], grams: clampGrams(inventory[idx].grams + lot.grams) }
  }
  const purchaseList = [...into.purchaseList]
  for (const item of from.purchaseList) {
    const idx = purchaseList.findIndex((row) => row.ingredientId === item.ingredientId)
    if (idx === -1) purchaseList.push(item)
    else purchaseList[idx] = { ...purchaseList[idx], grams: clampGrams(purchaseList[idx].grams + item.grams) }
  }
  const customIds = new Set(into.customRecipes.map((recipe) => recipe.id))
  return {
    ...into,
    inventory,
    purchaseList,
    customRecipes: [
      ...into.customRecipes,
      ...from.customRecipes.filter((recipe) => !customIds.has(recipe.id)),
    ],
    recipeOverrides: { ...from.recipeOverrides, ...into.recipeOverrides },
  }
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
  const [state, setState] = useState(() => loadState())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveState(state)
    document.documentElement.setAttribute('data-theme', state.theme)
    document.documentElement.lang = state.locale ?? 'en'
  }, [state, hydrated])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  useEffect(() => {
    const locale = state.locale ?? 'en'
    document.documentElement.lang = locale
    document.title = locale === 'es' ? 'meat · control de calorías' : 'meat · calorie tracker'
  }, [state.locale])

  useEffect(() => {
    if (!state.sessionAccountId) return
    const mine = memberForAccount(state, state.sessionAccountId)
    if (!mine) return
    if (state.activeMemberId && canViewMember(state, state.activeMemberId)) return
    setState((s) => ({ ...s, activeMemberId: mine.id }))
  }, [state])

  const account = useMemo(
    () => state.accounts.find((item) => item.id === state.sessionAccountId) ?? null,
    [state.accounts, state.sessionAccountId],
  )
  const myMember = useMemo(
    () => (account ? memberForAccount(state, account.id) ?? null : null),
    [account, state],
  )
  const activeMember = useMemo(() => activeMemberOf(state) ?? myMember, [state, myMember])
  const kitchen = useMemo(
    () => kitchenOf(state, activeMember?.kitchenId) ?? null,
    [state, activeMember],
  )
  const family = useMemo(
    () =>
      activeMember?.familyId
        ? (state.families.find((item) => item.id === activeMember.familyId) ?? null)
        : null,
    [state.families, activeMember],
  )
  const household = useMemo(
    () => familyMembersOf(state, activeMember?.familyId ?? null),
    [state, activeMember],
  )
  const isOwner = Boolean(account && family && family.ownerAccountId === account.id)

  const setTheme = useCallback((theme: ThemeId) => {
    setState((s) => ({ ...s, theme }))
  }, [])

  const setLocale = useCallback((locale: Locale) => {
    setState((s) => ({ ...s, locale }))
  }, [])

  const signUp = useCallback(
    async (input: {
      email: string
      password: string
      displayName: string
    }): Promise<AuthError | null> => {
      const email = normalizeEmail(input.email)
      const displayName = input.displayName.trim()
      if (!email) return 'emailRequired'
      if (!displayName) return 'nameRequired'
      if (input.password.length < 6) return 'weakPassword'

      const salt = randomSalt()
      const passwordHash = await hashPassword(input.password, salt)
      let error: AuthError | null = null
      setState((s) => {
        if (s.accounts.some((item) => item.email === email)) {
          error = 'emailTaken'
          return s
        }
        const now = new Date().toISOString()
        const accountId = uid()
        const memberId = uid()
        const kitchenId = uid()
        const newAccount: Account = {
          id: accountId,
          email,
          displayName,
          passwordHash,
          passwordSalt: salt,
          createdAt: now,
        }
        const kitchen = emptyKitchen({
          id: kitchenId,
          familyId: null,
          ownerAccountId: accountId,
        })
        const member = emptyMember({
          id: memberId,
          accountId,
          familyId: null,
          kitchenId,
          name: displayName,
        })
        if (s.legacy) {
          member.plan = s.legacy.plan
          member.entries = s.legacy.entries
          member.water = s.legacy.water
          kitchen.inventory = s.legacy.inventory
          kitchen.purchaseList = s.legacy.purchaseList
          kitchen.customRecipes = s.legacy.customRecipes
          kitchen.recipeOverrides = s.legacy.recipeOverrides
        }
        return {
          ...s,
          accounts: [...s.accounts, newAccount],
          members: [...s.members, member],
          kitchens: [...s.kitchens, kitchen],
          sessionAccountId: accountId,
          activeMemberId: memberId,
          legacy: null,
        }
      })
      return error
    },
    [],
  )

  const logIn = useCallback(
    async (input: { email: string; password: string }): Promise<AuthError | null> => {
      const email = normalizeEmail(input.email)
      if (!email || !input.password) return 'badLogin'
      const found = state.accounts.find((item) => item.email === email)
      if (!found) return 'badLogin'
      const ok = await verifyPassword(input.password, found.passwordSalt, found.passwordHash)
      if (!ok) return 'badLogin'
      setState((s) => {
        const member = memberForAccount(s, found.id)
        return {
          ...s,
          sessionAccountId: found.id,
          activeMemberId: member?.id ?? s.activeMemberId,
        }
      })
      return null
    },
    [state.accounts],
  )

  const logOut = useCallback(() => {
    setState((s) => ({ ...s, sessionAccountId: null, activeMemberId: null }))
  }, [])

  const setActiveMember = useCallback((memberId: string) => {
    setState((s) => (canViewMember(s, memberId) ? { ...s, activeMemberId: memberId } : s))
  }, [])

  const createFamily = useCallback((name: string): AuthError | null => {
    const trimmed = name.trim()
    if (!trimmed) return 'familyNameRequired'
    let error: AuthError | null = null
    setState((s) => {
      if (!s.sessionAccountId) {
        error = 'badLogin'
        return s
      }
      const mine = memberForAccount(s, s.sessionAccountId)
      if (!mine) {
        error = 'badLogin'
        return s
      }
      if (mine.familyId) {
        error = 'alreadyInFamily'
        return s
      }
      const familyId = uid()
      const inviteCode = makeInviteCode(new Set(s.families.map((item) => item.inviteCode)))
      const family: Family = {
        id: familyId,
        name: trimmed,
        inviteCode,
        ownerAccountId: s.sessionAccountId,
        createdAt: new Date().toISOString(),
      }
      return {
        ...s,
        families: [...s.families, family],
        members: s.members.map((member) =>
          member.id === mine.id ? { ...member, familyId } : member,
        ),
        kitchens: s.kitchens.map((item) =>
          item.id === mine.kitchenId
            ? { ...item, familyId, ownerAccountId: s.sessionAccountId }
            : item,
        ),
      }
    })
    return error
  }, [])

  const joinFamily = useCallback((code: string): AuthError | null => {
    const invite = normalizeInviteCode(code)
    if (!invite) return 'badInvite'
    let error: AuthError | null = null
    setState((s) => {
      if (!s.sessionAccountId) {
        error = 'badLogin'
        return s
      }
      const mine = memberForAccount(s, s.sessionAccountId)
      if (!mine) {
        error = 'badLogin'
        return s
      }
      if (mine.familyId) {
        error = 'alreadyInFamily'
        return s
      }
      const family = s.families.find((item) => item.inviteCode === invite)
      if (!family) {
        error = 'badInvite'
        return s
      }
      const host = s.members.find((member) => member.familyId === family.id)
      const hostKitchen = host ? kitchenOf(s, host.kitchenId) : undefined
      if (!host || !hostKitchen) {
        error = 'badInvite'
        return s
      }
      const myKitchen = kitchenOf(s, mine.kitchenId)
      const merged = myKitchen ? mergeKitchens(hostKitchen, myKitchen) : hostKitchen
      return {
        ...s,
        members: s.members.map((member) =>
          member.id === mine.id
            ? { ...member, familyId: family.id, kitchenId: hostKitchen.id }
            : member,
        ),
        kitchens: s.kitchens
          .filter((item) => item.id !== mine.kitchenId)
          .map((item) => (item.id === hostKitchen.id ? merged : item)),
        activeMemberId: mine.id,
      }
    })
    return error
  }, [])

  const leaveFamily = useCallback((): AuthError | null => {
    let error: AuthError | null = null
    setState((s) => {
      if (!s.sessionAccountId) {
        error = 'badLogin'
        return s
      }
      const mine = memberForAccount(s, s.sessionAccountId)
      if (!mine?.familyId) {
        error = 'notInFamily'
        return s
      }
      const fam = s.families.find((item) => item.id === mine.familyId)
      if (!fam) {
        error = 'notInFamily'
        return s
      }
      const others = s.members.filter(
        (member) => member.familyId === fam.id && member.id !== mine.id,
      )
      if (fam.ownerAccountId === s.sessionAccountId && others.length > 0) {
        error = 'ownerMustDissolve'
        return s
      }
      if (others.length === 0) {
        return {
          ...s,
          families: s.families.filter((item) => item.id !== fam.id),
          members: s.members.map((member) =>
            member.id === mine.id ? { ...member, familyId: null } : member,
          ),
          kitchens: s.kitchens.map((item) =>
            item.id === mine.kitchenId
              ? { ...item, familyId: null, ownerAccountId: s.sessionAccountId }
              : item,
          ),
          activeMemberId: mine.id,
        }
      }
      const kitchenId = uid()
      return {
        ...s,
        members: s.members.map((member) =>
          member.id === mine.id ? { ...member, familyId: null, kitchenId } : member,
        ),
        kitchens: [
          ...s.kitchens,
          emptyKitchen({
            id: kitchenId,
            familyId: null,
            ownerAccountId: s.sessionAccountId,
          }),
        ],
        activeMemberId: mine.id,
      }
    })
    return error
  }, [])

  const dissolveFamily = useCallback((): AuthError | null => {
    let error: AuthError | null = null
    setState((s) => {
      if (!s.sessionAccountId) {
        error = 'badLogin'
        return s
      }
      const mine = memberForAccount(s, s.sessionAccountId)
      const fam = mine?.familyId
        ? s.families.find((item) => item.id === mine.familyId)
        : undefined
      if (!mine || !fam || fam.ownerAccountId !== s.sessionAccountId) {
        error = 'notInFamily'
        return s
      }
      const extraKitchens: Kitchen[] = []
      const members = s.members.map((member) => {
        if (member.familyId !== fam.id) return member
        if (member.id === mine.id) return { ...member, familyId: null }
        const kitchenId = uid()
        extraKitchens.push(
          emptyKitchen({
            id: kitchenId,
            familyId: null,
            ownerAccountId: member.accountId,
          }),
        )
        return { ...member, familyId: null, kitchenId }
      })
      return {
        ...s,
        families: s.families.filter((item) => item.id !== fam.id),
        members,
        kitchens: [
          ...s.kitchens.map((item) =>
            item.id === mine.kitchenId ? { ...item, familyId: null } : item,
          ),
          ...extraKitchens,
        ],
        activeMemberId: mine.id,
      }
    })
    return error
  }, [])

  const addManagedMember = useCallback((name: string): AuthError | null => {
    const trimmed = name.trim()
    if (!trimmed) return 'nameRequired'
    let error: AuthError | null = null
    setState((s) => {
      if (!s.sessionAccountId) {
        error = 'badLogin'
        return s
      }
      const mine = memberForAccount(s, s.sessionAccountId)
      if (!mine?.familyId) {
        error = 'notInFamily'
        return s
      }
      const member = emptyMember({
        id: uid(),
        accountId: null,
        familyId: mine.familyId,
        kitchenId: mine.kitchenId,
        name: trimmed,
      })
      return { ...s, members: [...s.members, member], activeMemberId: member.id }
    })
    return error
  }, [])

  const removeMember = useCallback((memberId: string): AuthError | null => {
    let error: AuthError | null = null
    setState((s) => {
      if (!s.sessionAccountId) {
        error = 'badLogin'
        return s
      }
      const mine = memberForAccount(s, s.sessionAccountId)
      const target = s.members.find((member) => member.id === memberId)
      const fam = mine?.familyId
        ? s.families.find((item) => item.id === mine.familyId)
        : undefined
      if (!mine || !target || !fam || fam.ownerAccountId !== s.sessionAccountId) {
        error = 'notInFamily'
        return s
      }
      if (target.id === mine.id) {
        error = 'cannotRemoveSelf'
        return s
      }
      if (target.accountId) {
        const kitchenId = uid()
        return {
          ...s,
          members: s.members.map((member) =>
            member.id === target.id
              ? { ...member, familyId: null, kitchenId }
              : member,
          ),
          kitchens: [
            ...s.kitchens,
            emptyKitchen({
              id: kitchenId,
              familyId: null,
              ownerAccountId: target.accountId,
            }),
          ],
          activeMemberId: s.activeMemberId === target.id ? mine.id : s.activeMemberId,
        }
      }
      return {
        ...s,
        members: s.members.filter((member) => member.id !== target.id),
        activeMemberId: s.activeMemberId === target.id ? mine.id : s.activeMemberId,
      }
    })
    return error
  }, [])

  const regenerateInviteCode = useCallback(() => {
    setState((s) => {
      if (!s.sessionAccountId) return s
      const mine = memberForAccount(s, s.sessionAccountId)
      const fam = mine?.familyId
        ? s.families.find((item) => item.id === mine.familyId)
        : undefined
      if (!fam || fam.ownerAccountId !== s.sessionAccountId) return s
      const inviteCode = makeInviteCode(
        new Set(s.families.filter((item) => item.id !== fam.id).map((item) => item.inviteCode)),
      )
      return {
        ...s,
        families: s.families.map((item) => (item.id === fam.id ? { ...item, inviteCode } : item)),
      }
    })
  }, [])

  const savePlan = useCallback((plan: CaloriePlan, memberId?: string) => {
    setState((s) => {
      const id = memberId ?? s.activeMemberId
      const member = s.members.find((item) => item.id === id)
      if (!member) return s
      const named = plan.input.name.trim() || member.name
      const nextPlan: CaloriePlan = {
        ...plan,
        input: { ...plan.input, name: named },
      }
      return patchMember(s, member.id, (item) => ({
        ...item,
        name: named,
        plan: nextPlan,
      }))
    })
  }, [])

  const clearPlan = useCallback((memberId?: string) => {
    setState((s) => {
      const id = memberId ?? s.activeMemberId
      if (!id) return s
      return patchMember(s, id, (item) => ({ ...item, plan: null }))
    })
  }, [])

  const addEntry = useCallback(
    (
      entry: Omit<FoodEntry, 'id' | 'createdAt' | 'date'> & { date?: string },
      memberIds?: string[],
    ) => {
      const date = entry.date ?? todayKey()
      const createdAt = new Date().toISOString()
      setState((s) => {
        const targets =
          memberIds && memberIds.length > 0
            ? memberIds
            : s.activeMemberId
              ? [s.activeMemberId]
              : []
        if (targets.length === 0) return s
        let next = s
        for (const memberId of targets) {
          if (!s.members.some((member) => member.id === memberId)) continue
          const full: FoodEntry = {
            id: uid(),
            createdAt,
            date,
            meal: entry.meal,
            name: entry.name,
            detail: entry.detail,
            kcal: entry.kcal,
            protein: entry.protein,
            carbs: entry.carbs,
            fat: entry.fat,
            recipeId: entry.recipeId,
            servings: entry.servings,
          }
          next = patchMember(next, memberId, (item) => ({
            ...item,
            entries: [full, ...item.entries],
          }))
        }
        return next
      })
    },
    [],
  )

  const logRecipeWithInventory = useCallback(
    (input: {
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
      const totalServings = input.portions.reduce((sum, part) => sum + part.servings, 0)
      if (totalServings <= 0) return false
      let ok = false
      const date = todayKey()
      const createdAt = new Date().toISOString()
      setState((s) => {
        const host = activeMemberOf(s) ?? memberForAccount(s, s.sessionAccountId ?? '')
        const kit = kitchenOf(s, host?.kitchenId)
        if (!kit) return s
        const recipe = findMergedRecipe(
          input.recipeId,
          kit.customRecipes ?? [],
          kit.recipeOverrides ?? {},
        )
        if (!recipe) return s
        const needs = recipeNeedsForServings(recipe, totalServings)
        const nextInv = consumeInventoryLots(kit.inventory ?? [], needs)
        if (!nextInv) return s
        let next = patchKitchen(s, kit.id, (item) => ({ ...item, inventory: nextInv }))
        for (const part of input.portions) {
          if (!next.members.some((member) => member.id === part.memberId)) continue
          const full: FoodEntry = {
            id: uid(),
            createdAt,
            date,
            meal: input.meal,
            name: input.name,
            detail: input.detail,
            kcal: part.kcal,
            protein: part.protein,
            carbs: part.carbs,
            fat: part.fat,
            recipeId: input.recipeId,
            servings: part.servings,
          }
          next = patchMember(next, part.memberId, (item) => ({
            ...item,
            entries: [full, ...item.entries],
          }))
        }
        ok = true
        return next
      })
      return ok
    },
    [],
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

  const saveRecipe = useCallback((input: Omit<Recipe, 'id'> & { id?: string }) => {
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
    setState((s) => {
      const member = activeMemberOf(s)
      const kit = kitchenOf(s, member?.kitchenId)
      if (!kit) return s
      if (isUserRecipe(id) || (kit.customRecipes ?? []).some((item) => item.id === id)) {
        const list = kit.customRecipes ?? []
        const idx = list.findIndex((item) => item.id === id)
        const customRecipes =
          idx === -1 ? [recipe, ...list] : list.map((item) => (item.id === id ? recipe : item))
        return patchKitchen(s, kit.id, (item) => ({ ...item, customRecipes }))
      }
      return patchKitchen(s, kit.id, (item) => ({
        ...item,
        recipeOverrides: { ...(item.recipeOverrides ?? {}), [id]: recipe },
      }))
    })
    return recipe
  }, [])

  const deleteRecipe = useCallback((id: string) => {
    setState((s) => {
      const member = activeMemberOf(s)
      const kit = kitchenOf(s, member?.kitchenId)
      if (!kit) return s
      if (isUserRecipe(id)) {
        return patchKitchen(s, kit.id, (item) => ({
          ...item,
          customRecipes: (item.customRecipes ?? []).filter((row) => row.id !== id),
        }))
      }
      const next = { ...(kit.recipeOverrides ?? {}) }
      delete next[id]
      return patchKitchen(s, kit.id, (item) => ({ ...item, recipeOverrides: next }))
    })
  }, [])

  const resetRecipe = useCallback((id: string) => {
    setState((s) => {
      const member = activeMemberOf(s)
      const kit = kitchenOf(s, member?.kitchenId)
      if (!kit) return s
      const next = { ...(kit.recipeOverrides ?? {}) }
      delete next[id]
      return patchKitchen(s, kit.id, (item) => ({ ...item, recipeOverrides: next }))
    })
  }, [])

  const removeEntry = useCallback((id: string) => {
    setState((s) => {
      const owner = s.members.find((member) => member.entries.some((entry) => entry.id === id))
      if (!owner) return s
      return patchMember(s, owner.id, (item) => ({
        ...item,
        entries: item.entries.filter((entry) => entry.id !== id),
      }))
    })
  }, [])

  const setWater = useCallback((date: string, glasses: number, memberId?: string) => {
    setState((s) => {
      const id = memberId ?? s.activeMemberId
      if (!id) return s
      return patchMember(s, id, (item) => ({
        ...item,
        water: { ...item.water, [date]: Math.max(0, glasses) },
      }))
    })
  }, [])

  const addExercise = useCallback(
    (input: {
      kind: ExerciseEntry['kind']
      name: string
      minutes: number
      date?: string
      members: { memberId: string; kcal: number }[]
    }) => {
      const date = input.date ?? todayKey()
      const createdAt = new Date().toISOString()
      const minutes = Math.max(1, Math.round(input.minutes))
      setState((s) => {
        if (input.members.length === 0) return s
        let next = s
        for (const part of input.members) {
          if (!next.members.some((item) => item.id === part.memberId)) continue
          const full: ExerciseEntry = {
            id: uid(),
            createdAt,
            date,
            kind: input.kind,
            name: input.name.trim() || input.kind,
            minutes,
            kcal: Math.max(0, Math.round(part.kcal)),
          }
          next = patchMember(next, part.memberId, (item) => ({
            ...item,
            exercises: [full, ...(item.exercises ?? [])],
          }))
        }
        return next
      })
    },
    [],
  )

  const removeExercise = useCallback((id: string) => {
    setState((s) => {
      const owner = s.members.find((member) =>
        (member.exercises ?? []).some((item) => item.id === id),
      )
      if (!owner) return s
      return patchMember(s, owner.id, (item) => ({
        ...item,
        exercises: (item.exercises ?? []).filter((row) => row.id !== id),
      }))
    })
  }, [])

  const addInventoryItem = useCallback(
    (item: Pick<InventoryItem, 'ingredientId' | 'boughtOn' | 'grams'>) => {
      const grams = clampGrams(item.grams)
      const boughtOn = clampBoughtOn(item.boughtOn)
      setState((s) => {
        const member = activeMemberOf(s)
        const kit = kitchenOf(s, member?.kitchenId)
        if (!kit) return s
        const list = kit.inventory ?? []
        const idx = list.findIndex(
          (row) => row.ingredientId === item.ingredientId && row.boughtOn === boughtOn,
        )
        if (idx === -1) {
          const full: InventoryItem = {
            id: uid(),
            ingredientId: item.ingredientId,
            grams,
            boughtOn,
            createdAt: new Date().toISOString(),
          }
          return patchKitchen(s, kit.id, (row) => ({ ...row, inventory: [full, ...list] }))
        }
        const next = [...list]
        const cur = next[idx]
        next[idx] = { ...cur, grams: clampGrams(cur.grams + grams) }
        return patchKitchen(s, kit.id, (row) => ({ ...row, inventory: next }))
      })
    },
    [],
  )

  const updateInventoryLot = useCallback(
    (id: string, patch: Partial<Pick<InventoryItem, 'grams' | 'boughtOn'>>) => {
      setState((s) => {
        const member = activeMemberOf(s)
        const kit = kitchenOf(s, member?.kitchenId)
        if (!kit) return s
        return patchKitchen(s, kit.id, (row) => ({
          ...row,
          inventory: (row.inventory ?? []).map((item) => {
            if (item.id !== id) return item
            return {
              ...item,
              grams: patch.grams !== undefined ? clampGrams(patch.grams) : item.grams,
              boughtOn:
                patch.boughtOn !== undefined ? clampBoughtOn(patch.boughtOn) : item.boughtOn,
            }
          }),
        }))
      })
    },
    [],
  )

  const removeInventoryItem = useCallback((id: string) => {
    setState((s) => {
      const member = activeMemberOf(s)
      const kit = kitchenOf(s, member?.kitchenId)
      if (!kit) return s
      return patchKitchen(s, kit.id, (row) => ({
        ...row,
        inventory: (row.inventory ?? []).filter((item) => item.id !== id),
      }))
    })
  }, [])

  const gramsOnHand = useCallback(
    (ingredientId: string) =>
      (kitchen?.inventory ?? [])
        .filter((item) => item.ingredientId === ingredientId)
        .reduce((sum, item) => sum + item.grams, 0),
    [kitchen],
  )

  const addToPurchaseList = useCallback((items: { ingredientId: string; grams: number }[]) => {
    setState((s) => {
      const member = activeMemberOf(s)
      const kit = kitchenOf(s, member?.kitchenId)
      if (!kit) return s
      const list = [...(kit.purchaseList ?? [])]
      for (const item of items) {
        const grams = clampGrams(item.grams)
        if (grams <= 0) continue
        const idx = list.findIndex((row) => row.ingredientId === item.ingredientId)
        if (idx === -1) {
          list.unshift({
            id: uid(),
            ingredientId: item.ingredientId,
            grams,
            createdAt: new Date().toISOString(),
          })
        } else {
          list[idx] = { ...list[idx], grams: clampGrams(list[idx].grams + grams) }
        }
      }
      return patchKitchen(s, kit.id, (row) => ({ ...row, purchaseList: list }))
    })
  }, [])

  const updatePurchaseItem = useCallback((id: string, grams: number) => {
    const next = clampGrams(grams)
    setState((s) => {
      const member = activeMemberOf(s)
      const kit = kitchenOf(s, member?.kitchenId)
      if (!kit) return s
      return patchKitchen(s, kit.id, (row) => ({
        ...row,
        purchaseList: (row.purchaseList ?? []).map((item) =>
          item.id === id ? { ...item, grams: next } : item,
        ),
      }))
    })
  }, [])

  const removePurchaseItem = useCallback((id: string) => {
    setState((s) => {
      const member = activeMemberOf(s)
      const kit = kitchenOf(s, member?.kitchenId)
      if (!kit) return s
      return patchKitchen(s, kit.id, (row) => ({
        ...row,
        purchaseList: (row.purchaseList ?? []).filter((item) => item.id !== id),
      }))
    })
  }, [])

  const completePurchaseList = useCallback(() => {
    const boughtOn = todayKey()
    setState((s) => {
      const member = activeMemberOf(s)
      const kit = kitchenOf(s, member?.kitchenId)
      if (!kit) return s
      let inventory = [...(kit.inventory ?? [])]
      for (const item of kit.purchaseList ?? []) {
        const grams = clampGrams(item.grams)
        if (grams <= 0) continue
        const idx = inventory.findIndex(
          (lot) => lot.ingredientId === item.ingredientId && lot.boughtOn === boughtOn,
        )
        if (idx === -1) {
          inventory = [
            {
              id: uid(),
              ingredientId: item.ingredientId,
              grams,
              boughtOn,
              createdAt: new Date().toISOString(),
            },
            ...inventory,
          ]
        } else {
          const cur = inventory[idx]
          inventory[idx] = { ...cur, grams: clampGrams(cur.grams + grams) }
        }
      }
      return patchKitchen(s, kit.id, (row) => ({ ...row, inventory, purchaseList: [] }))
    })
  }, [])

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
    account,
    myMember,
    activeMember,
    family,
    household,
    familyToday,
    householdGoal,
    householdMacros,
    isOwner,
    isLoggedIn: Boolean(account),
    plan,
    entries,
    water,
    inventory: kitchen?.inventory ?? [],
    purchaseList: kitchen?.purchaseList ?? [],
    customRecipes: kitchen?.customRecipes ?? [],
    recipeOverrides: kitchen?.recipeOverrides ?? {},
    theme: state.theme,
    locale: state.locale ?? 'en',
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
