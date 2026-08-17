import type { Locale } from '../i18n'
import type { ThemeId } from '../themes'
import type { Account, Family, Kitchen, Member } from '../types'
import type { FinanceLinkPublic } from './finance'

export type WorkspaceDTO = {
  account: Account
  family: Family | null
  members: Member[]
  kitchens: Kitchen[]
  activeMemberId: string | null
  theme: ThemeId
  locale: Locale
  finance: FinanceLinkPublic
}
