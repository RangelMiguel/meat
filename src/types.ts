import type { Recipe } from './data/types'
import type { Locale } from './i18n'
import type { ThemeId } from './themes'

export type Sex = 'male' | 'female'
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'
export type Goal = 'lose' | 'maintain' | 'gain'
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
export type View =
  | 'today'
  | 'plan'
  | 'week'
  | 'history'
  | 'recipes'
  | 'inventory'
  | 'purchase'
  | 'exercise'
  | 'settings'

/** One planned dish for a person on a given day and meal. */
export interface WeekMealSlot {
  id: string
  date: string
  meal: MealType
  recipeId: string
  servings: number
  memberId: string
}

export interface WeekPlan {
  slots: WeekMealSlot[]
}

export type ExerciseKind =
  | 'walk'
  | 'run'
  | 'cycle'
  | 'swim'
  | 'weights'
  | 'yoga'
  | 'hiit'
  | 'hike'
  | 'dance'
  | 'sport'
  | 'other'

export interface CookSession {
  recipeId: string
  servings: number
  meal: MealType
  eaterNames?: string[]
}

export interface PlanInput {
  name: string
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  goal: Goal
  /** Weekly kg change for lose/gain (e.g. 0.5). Ignored for maintain. */
  weeklyChangeKg: number
}

export interface MacroTargets {
  proteinG: number
  carbsG: number
  fatG: number
}

export interface CaloriePlan {
  input: PlanInput
  bmr: number
  tdee: number
  dailyCalories: number
  macros: MacroTargets
  waterGlasses: number
  createdAt: string
  updatedAt: string
}

export interface ExerciseEntry {
  id: string
  date: string
  kind: ExerciseKind
  name: string
  minutes: number
  kcal: number
  createdAt: string
}

export interface FoodEntry {
  id: string
  date: string // YYYY-MM-DD
  meal: MealType
  name: string
  detail?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  createdAt: string
  /** Set when logged from the recipe catalog with a plan-adapted portion */
  recipeId?: string
  servings?: number
}

export interface DayExtras {
  /** date -> glasses */
  water: Record<string, number>
}

/** A catalog ingredient the user currently has on hand. */
export interface InventoryItem {
  id: string
  ingredientId: string
  /** Amount on hand, in the ingredient’s unit (g or ml). */
  grams: number
  /** YYYY-MM-DD the user last bought / acquired it */
  boughtOn: string
  createdAt: string
}

/** Something to buy — usually a shortfall vs a recipe serving. */
export interface PurchaseItem {
  id: string
  ingredientId: string
  grams: number
  createdAt: string
}

export interface Account {
  id: string
  email: string
  displayName: string
  createdAt: string
}

export interface Family {
  id: string
  name: string
  inviteCode: string
  ownerAccountId: string
  createdAt: string
}

/** One person’s calorie plan and food diary. */
export interface Member {
  id: string
  /** Linked login. Null for a managed profile (e.g. a child). */
  accountId: string | null
  familyId: string | null
  kitchenId: string
  name: string
  plan: CaloriePlan | null
  entries: FoodEntry[]
  exercises: ExerciseEntry[]
  water: Record<string, number>
}

/** Shared pantry for a solo user or a family. */
export interface Kitchen {
  id: string
  familyId: string | null
  ownerAccountId: string | null
  inventory: InventoryItem[]
  purchaseList: PurchaseItem[]
  customRecipes: Recipe[]
  recipeOverrides: Record<string, Recipe>
  weekPlan: WeekPlan
}

/** Snapshot of pre-account local data, applied on first sign-up. */
export interface LegacyWorkspace {
  plan: CaloriePlan | null
  entries: FoodEntry[]
  water: Record<string, number>
  inventory: InventoryItem[]
  purchaseList: PurchaseItem[]
  customRecipes: Recipe[]
  recipeOverrides: Record<string, Recipe>
}

export interface AppState {
  accounts: Account[]
  sessionAccountId: string | null
  activeMemberId: string | null
  families: Family[]
  members: Member[]
  kitchens: Kitchen[]
  legacy: LegacyWorkspace | null
  theme: ThemeId
  locale: Locale
}

export const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string; factor: number }[] = [
  { value: 'sedentary', label: 'Sedentary', hint: 'Desk job, little exercise', factor: 1.2 },
  { value: 'light', label: 'Lightly active', hint: 'Exercise 1–3 days/week', factor: 1.375 },
  { value: 'moderate', label: 'Moderately active', hint: 'Exercise 3–5 days/week', factor: 1.55 },
  { value: 'active', label: 'Very active', hint: 'Exercise 6–7 days/week', factor: 1.725 },
  { value: 'very_active', label: 'Athlete', hint: 'Hard training / physical job', factor: 1.9 },
]

export const GOAL_OPTIONS: { value: Goal; label: string; hint: string }[] = [
  { value: 'lose', label: 'Lose weight', hint: 'Calorie deficit' },
  { value: 'maintain', label: 'Maintain', hint: 'Stay at current weight' },
  { value: 'gain', label: 'Gain weight', hint: 'Calorie surplus' },
]
