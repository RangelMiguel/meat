import { Download, Smartphone } from 'lucide-react'
import { t } from '../i18n'
import { isIosDevice } from '../lib/pwa'
import { usePwa } from './PwaProvider'
import type { AppStore } from '../hooks/useAppStore'

export function PwaInstallCard({ store }: { store: AppStore }) {
  const locale = store.locale
  const pwa = usePwa()
  const ios = isIosDevice()

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h4>{t(locale, 'installApp')}</h4>
          <p className="sub">
            {pwa.installed
              ? t(locale, 'installedApp')
              : pwa.canInstall
                ? t(locale, 'installAppHint')
                : ios
                  ? t(locale, 'installIos')
                  : t(locale, 'installManual')}
          </p>
        </div>
      </div>
      {pwa.installed ? (
        <p className="sub" style={{ margin: 0 }}>
          <Smartphone size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          {t(locale, 'installedApp')}
        </p>
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (pwa.canInstall) void pwa.install()
          }}
        >
          <Download size={16} />
          {pwa.canInstall ? t(locale, 'installAppCta') : t(locale, 'howToInstall')}
        </button>
      )}
    </div>
  )
}
