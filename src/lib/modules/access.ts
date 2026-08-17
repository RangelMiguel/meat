import { prisma } from '../db'
import { ForbiddenError } from '../auth'
import { getModule, isAddonModule } from './catalog'

export async function listInstalledModuleIds(householdId: string): Promise<string[]> {
  const rows = await prisma.householdModule.findMany({
    where: { householdId },
    select: { moduleId: true },
  })
  return rows.map((row) => row.moduleId)
}

export async function isModuleInstalled(householdId: string, moduleId: string): Promise<boolean> {
  if (!isAddonModule(moduleId)) return true
  const row = await prisma.householdModule.findUnique({
    where: { householdId_moduleId: { householdId, moduleId } },
    select: { id: true },
  })
  return Boolean(row)
}

export async function requireAddon(householdId: string, moduleId: string): Promise<void> {
  const def = getModule(moduleId)
  if (!def || def.kind !== 'addon') {
    throw new ForbiddenError('Módulo no válido')
  }
  const ok = await isModuleInstalled(householdId, moduleId)
  if (!ok) {
    throw new ForbiddenError('Este módulo no está instalado')
  }
}
