import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, ExternalLink, Lightbulb, Search } from 'lucide-react'
import { t, type Locale } from '../i18n'
import { getHelpContent, type HelpSection } from '../lib/help/content'
import type { View } from '../types'

interface Props {
  locale: Locale
  onGo: (view: View) => void
}

function sectionMatches(section: HelpSection, q: string): boolean {
  if (!q) return true
  const hay = [
    section.title,
    section.summary,
    ...section.paragraphs,
    ...(section.bullets || []).flatMap((b) => [b.title, b.body]),
    ...(section.tips || []),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

export function HelpView({ locale, onGo }: Props) {
  const content = useMemo(() => getHelpContent(locale), [locale])
  const [query, setQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [activeId, setActiveId] = useState('')

  const q = query.trim().toLowerCase()
  const filteredGroups = useMemo(
    () =>
      content.groups
        .map((group) => ({
          ...group,
          sections: group.sections.filter((section) => sectionMatches(section, q)),
        }))
        .filter((group) => group.sections.length > 0),
    [content.groups, q],
  )

  useEffect(() => {
    if (q) {
      const groups: Record<string, boolean> = {}
      const sections: Record<string, boolean> = {}
      for (const group of filteredGroups) {
        groups[group.id] = true
        for (const section of group.sections) sections[section.id] = true
      }
      setOpenGroups(groups)
      setOpenSections(sections)
      return
    }
    setOpenGroups((prev) => {
      if (Object.keys(prev).length > 0) return prev
      const first = content.groups[0]?.id
      return first ? { [first]: true } : {}
    })
  }, [q, filteredGroups, content.groups])

  function expandAll() {
    const groups: Record<string, boolean> = {}
    const sections: Record<string, boolean> = {}
    for (const group of content.groups) {
      groups[group.id] = true
      for (const section of group.sections) sections[section.id] = true
    }
    setOpenGroups(groups)
    setOpenSections(sections)
  }

  function goToSection(groupId: string, sectionId: string) {
    setOpenGroups((prev) => ({ ...prev, [groupId]: true }))
    setOpenSections((prev) => ({ ...prev, [sectionId]: true }))
    setActiveId(sectionId)
    requestAnimationFrame(() => {
      document.getElementById(`help-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const totalSections = content.groups.reduce((n, group) => n + group.sections.length, 0)
  const shownSections = filteredGroups.reduce((n, group) => n + group.sections.length, 0)

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'helpTitle')}</h2>
        <span>{t(locale, 'helpSub')}</span>
      </div>

      <div className="card">
        <p className="sub" style={{ marginTop: 0 }}>
          {content.intro}
        </p>
        <div className="field help-search">
          <Search size={14} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, 'helpSearch')}
            aria-label={t(locale, 'helpSearch')}
          />
        </div>
        <p className="field-hint">
          {q
            ? t(locale, 'helpResults', { n: shownSections, total: totalSections })
            : t(locale, 'helpCount', { n: totalSections })}
          {' · '}
          <button type="button" className="help-text-btn" onClick={expandAll}>
            {t(locale, 'helpExpand')}
          </button>
          {' · '}
          <button
            type="button"
            className="help-text-btn"
            onClick={() => {
              setOpenGroups({})
              setOpenSections({})
            }}
          >
            {t(locale, 'helpCollapse')}
          </button>
        </p>
      </div>

      <div className="help-layout">
        <nav className="card help-toc" aria-label={t(locale, 'helpToc')}>
          <div className="card-header">
            <h4>
              <BookOpen size={14} aria-hidden /> {t(locale, 'helpToc')}
            </h4>
          </div>
          {filteredGroups.map((group) => (
            <div key={group.id} className="help-toc-group">
              <p className="help-toc-label">{group.title}</p>
              <ul>
                {group.sections.map((section) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      className={`help-toc-btn${activeId === section.id ? ' is-active' : ''}`}
                      onClick={() => goToSection(group.id, section.id)}
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {filteredGroups.length === 0 && <p className="field-hint">{t(locale, 'helpNone')}</p>}
        </nav>

        <div className="stack-lg">
          {filteredGroups.length === 0 && (
            <div className="card">
              <p className="sub">{t(locale, 'helpNone')}</p>
            </div>
          )}
          {filteredGroups.map((group) => {
            const groupOpen = Boolean(openGroups[group.id])
            return (
              <div key={group.id} className="card">
                <button
                  type="button"
                  className="help-group-toggle"
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                  aria-expanded={groupOpen}
                >
                  {groupOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <div>
                    <h4>{group.title}</h4>
                    <p className="sub">{group.description}</p>
                  </div>
                  <span className="help-count">{group.sections.length}</span>
                </button>
                {groupOpen && (
                  <div className="help-sections">
                    {group.sections.map((section) => {
                      const open = Boolean(openSections[section.id])
                      return (
                        <article key={section.id} id={`help-${section.id}`} className="help-section">
                          <button
                            type="button"
                            className="help-section-toggle"
                            onClick={() => {
                              setOpenSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
                              setActiveId(section.id)
                            }}
                            aria-expanded={open}
                          >
                            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <div>
                              <h3>{section.title}</h3>
                              <p>{section.summary}</p>
                            </div>
                          </button>
                          {open && (
                            <div className="help-section-body">
                              {section.paragraphs.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                              ))}
                              {section.bullets && section.bullets.length > 0 && (
                                <ul className="help-bullets">
                                  {section.bullets.map((bullet) => (
                                    <li key={bullet.title}>
                                      <strong>{bullet.title}</strong>
                                      <span>{bullet.body}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {section.tips && section.tips.length > 0 && (
                                <div className="help-tips">
                                  <p>
                                    <Lightbulb size={14} /> {t(locale, 'helpTips')}
                                  </p>
                                  <ul>
                                    {section.tips.map((tip) => (
                                      <li key={tip}>{tip}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {section.view && (
                                <button
                                  type="button"
                                  className="help-text-btn help-open"
                                  onClick={() => onGo(section.view!)}
                                >
                                  {t(locale, 'helpOpen')} <ExternalLink size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
