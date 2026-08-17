import { useState, type FormEvent } from 'react'
import { Copy, Home, Link2, Plus, Trash2, Users } from 'lucide-react'
import type { AppStore, AuthError } from '../hooks/useAppStore'
import { t, type MsgId } from '../i18n'
import { inviteLink } from '../lib/inviteLink'

interface Props {
  store: AppStore
  onOpenMember: (memberId?: string) => void
}

export function FamilyView({ store, onOpenMember }: Props) {
  const locale = store.locale
  const [familyName, setFamilyName] = useState('')
  const [invite, setInvite] = useState('')
  const [profileName, setProfileName] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const showError = (code: AuthError | null) => {
    if (!code) {
      setError('')
      return
    }
    setError(t(locale, code as MsgId))
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    showError(await store.createFamily(familyName))
  }

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault()
    showError(await store.joinFamily(invite))
  }

  const handleAddProfile = async (e: FormEvent) => {
    e.preventDefault()
    const result = await store.addManagedMember(profileName)
    showError(result)
    if (!result) {
      setProfileName('')
      onOpenMember()
    }
  }

  if (!store.family) {
    return (
      <div className="stack-lg">
        <div className="section-title">
          <h2>{t(locale, 'family')}</h2>
          <span>{t(locale, 'familySoloTitle')}</span>
        </div>
        <div className="card">
          <p className="sub" style={{ marginTop: 0 }}>
            {t(locale, 'familySoloBody')}
          </p>
          {error && (
            <div className="alert alert-danger">
              <strong>{error}</strong>
            </div>
          )}
          <div className="grid-2" style={{ marginTop: '1rem' }}>
            <form className="stack-lg" onSubmit={(e) => void handleCreate(e)}>
              <h4>{t(locale, 'createFamily')}</h4>
              <div className="field">
                <label htmlFor="fam-name">{t(locale, 'familyName')}</label>
                <input
                  id="fam-name"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder={t(locale, 'familyNamePh')}
                />
              </div>
              <button className="btn btn-primary" type="submit">
                <Home size={16} />
                {t(locale, 'createFamily')}
              </button>
            </form>
            <form className="stack-lg" onSubmit={(e) => void handleJoin(e)}>
              <h4>{t(locale, 'joinFamily')}</h4>
              <div className="field">
                <label htmlFor="fam-code">{t(locale, 'inviteCode')}</label>
                <input
                  id="fam-code"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value.toUpperCase())}
                  placeholder={t(locale, 'inviteCodePh')}
                  autoCapitalize="characters"
                />
              </div>
              <button className="btn btn-secondary" type="submit">
                <Users size={16} />
                {t(locale, 'join')}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const copyValue = async (kind: 'code' | 'link') => {
    const value =
      kind === 'link' ? inviteLink(store.family!.inviteCode) : store.family!.inviteCode
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{store.family.name}</h2>
        <span>
          {t(locale, 'membersCount', {
            count: store.household.length,
            noun: t(locale, store.household.length === 1 ? 'memberOne' : 'memberMany'),
          })}
        </span>
      </div>

      {error && (
        <div className="alert alert-danger">
          <strong>{error}</strong>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'yourHousehold')}</h4>
            <p className="sub">{t(locale, 'householdKitchen')}</p>
          </div>
        </div>
        <ul className="family-member-list">
          {store.familyToday.map(({ member, totals }) => {
            const goal = member.plan?.dailyCalories
            const isActive = store.activeMember?.id === member.id
            const isYou = store.myMember?.id === member.id
            return (
              <li key={member.id} className={isActive ? 'is-active' : ''}>
                <button
                  type="button"
                  className="family-member-btn"
                  onClick={() => onOpenMember(member.id)}
                >
                  <strong>
                    {member.name}
                    {isYou ? ` · ${t(locale, 'you')}` : ''}
                  </strong>
                  <span>
                    {goal
                      ? t(locale, 'familyTodayKcal', {
                          eaten: Math.round(totals.kcal),
                          goal,
                        })
                      : t(locale, 'noPlanShort')}
                    {member.accountId
                      ? store.family?.ownerAccountId === member.accountId
                        ? ` · ${t(locale, 'owner')}`
                        : ''
                      : ` · ${t(locale, 'managed')}`}
                  </span>
                </button>
                {store.isOwner && !isYou && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon icon-danger"
                    aria-label={t(locale, 'removeMember')}
                    onClick={() => {
                      if (!confirm(t(locale, 'removeMemberConfirm', { name: member.name }))) return
                      void store.removeMember(member.id).then(showError)
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'inviteLink')}</h4>
            <p className="sub">{t(locale, 'inviteShare')}</p>
          </div>
          <strong className="invite-code">{store.family.inviteCode}</strong>
        </div>
        <p className="invite-link">{inviteLink(store.family.inviteCode)}</p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => void copyValue('link')}>
            <Link2 size={16} />
            {copied === 'link' ? t(locale, 'inviteLinkCopied') : t(locale, 'copyInviteLink')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void copyValue('code')}>
            <Copy size={16} />
            {copied === 'code' ? t(locale, 'copied') : t(locale, 'copyCode')}
          </button>
          {store.isOwner && (
            <button type="button" className="btn btn-ghost" onClick={store.regenerateInviteCode}>
              {t(locale, 'newCode')}
            </button>
          )}
        </div>
      </div>

      <form className="card" onSubmit={(e) => void handleAddProfile(e)}>
        <div className="card-header">
          <div>
            <h4>{t(locale, 'addProfile')}</h4>
            <p className="sub">{t(locale, 'addProfileSub')}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="prof-name">{t(locale, 'profileName')}</label>
            <input
              id="prof-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
            />
          </div>
        </div>
        <button className="btn btn-primary" type="submit">
          <Plus size={16} />
          {t(locale, 'addProfileBtn')}
        </button>
      </form>

      <div className="card danger-zone">
        <div>
          <h4>{store.isOwner ? t(locale, 'dissolveFamily') : t(locale, 'leaveFamily')}</h4>
          <p className="sub">
            {store.isOwner
              ? t(locale, 'dissolveFamilyConfirm')
              : t(locale, 'leaveFamilyConfirm')}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => {
            if (store.isOwner) {
              if (!confirm(t(locale, 'dissolveFamilyConfirm'))) return
              void store.dissolveFamily().then(showError)
            } else {
              if (!confirm(t(locale, 'leaveFamilyConfirm'))) return
              void store.leaveFamily().then(showError)
            }
          }}
        >
          {store.isOwner ? t(locale, 'dissolveFamily') : t(locale, 'leaveFamily')}
        </button>
      </div>
    </div>
  )
}
