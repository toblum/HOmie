import { useEffect, useMemo } from 'react'
import './App.css'
import { classifyMonthStatus } from './domain/monthStatus'
import HeroPanel from './app/components/HeroPanel'
import MonthOverview from './app/components/MonthOverview'
import YearOverview from './app/components/YearOverview'
import SettingsPage from './app/components/SettingsPage'
import DetailDialog from './app/components/DetailDialog'
import {
  DEFAULT_STORAGE,
  DEFAULT_TODAY,
  TRANSLATIONS,
  buildCalendarMonthViewModel,
  buildYearOverviewViewModel,
  getVisiblePolicyHistory,
  resolveThemePreference,
  useHomieStore,
} from './app/model'
import type { BrowserStorage } from './storage/browserStorage'
import type { IsoDate } from './domain/types'

interface AppProps {
  storage?: BrowserStorage
  today?: IsoDate
}

function App({ storage = DEFAULT_STORAGE, today = DEFAULT_TODAY }: AppProps) {
  const initialize = useHomieStore((state) => state.initialize)
  const error = useHomieStore((state) => state.error)
  const isLoading = useHomieStore((state) => state.isLoading)
  const snapshot = useHomieStore((state) => state.snapshot)
  const viewMode = useHomieStore((state) => state.viewMode)
  const lastOverviewMode = useHomieStore((state) => state.lastOverviewMode)
  const selectedMonth = useHomieStore((state) => state.selectedMonth)
  const selectedYear = useHomieStore((state) => state.selectedYear)
  const selectedToday = useHomieStore((state) => state.today)
  const navigateMonth = useHomieStore((state) => state.navigateMonth)
  const navigateYear = useHomieStore((state) => state.navigateYear)
  const openYearOverview = useHomieStore((state) => state.openYearOverview)
  const openMonthOverview = useHomieStore((state) => state.openMonthOverview)
  const openSettingsPage = useHomieStore((state) => state.openSettingsPage)
  const selectMonth = useHomieStore((state) => state.selectMonth)
  const cycleDayStatus = useHomieStore((state) => state.cycleDayStatus)
  const openDetailView = useHomieStore((state) => state.openDetailView)
  const updatePreferences = useHomieStore((state) => state.updatePreferences)
  const addPolicyHistoryEntry = useHomieStore((state) => state.addPolicyHistoryEntry)
  const restoreSnapshot = useHomieStore((state) => state.restoreSnapshot)
  const exportState = useHomieStore((state) => state.storage.exportState)
  const detailDate = useHomieStore((state) => state.detailDate)
  const detailStatus = useHomieStore((state) => state.detailStatus)
  const detailNote = useHomieStore((state) => state.detailNote)
  const closeDetailView = useHomieStore((state) => state.closeDetailView)
  const setDetailStatus = useHomieStore((state) => state.setDetailStatus)
  const setDetailNote = useHomieStore((state) => state.setDetailNote)
  const saveDetailEntry = useHomieStore((state) => state.saveDetailEntry)

  useEffect(() => {
    void initialize({ storage, today })
  }, [initialize, storage, today])

  useEffect(() => {
    if (!snapshot) {
      return
    }

    const theme = snapshot.preferences.theme

    const applyTheme = () => {
      const resolvedTheme = resolveThemePreference(theme)
      document.documentElement.dataset.theme = resolvedTheme
      document.documentElement.dataset.themePreference = theme
      document.documentElement.style.colorScheme = resolvedTheme
    }

    applyTheme()

    if (theme === 'system' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', applyTheme)
      return () => {
        mediaQuery.removeEventListener('change', applyTheme)
      }
    }
  }, [snapshot])

  const language = snapshot?.preferences.language ?? 'de'
  const t = TRANSLATIONS[language]
  const visiblePolicyHistory = useMemo(
    () => (snapshot ? getVisiblePolicyHistory(snapshot.policyHistory) : []),
    [snapshot],
  )
  const calendar = useMemo(
    () =>
      snapshot && viewMode === 'month'
        ? buildCalendarMonthViewModel(selectedMonth, selectedToday, snapshot, language)
        : null,
    [viewMode, selectedMonth, selectedToday, snapshot, language],
  )
  const monthStatus = useMemo(
    () =>
      calendar && snapshot
        ? classifyMonthStatus({
            evaluation: calendar.evaluation,
            warningThreshold: snapshot.preferences.warningThreshold,
          })
        : null,
    [calendar, snapshot],
  )
  const yearOverview = useMemo(
    () =>
      snapshot && viewMode === 'year'
        ? buildYearOverviewViewModel(selectedYear, selectedToday, snapshot, language)
        : null,
    [viewMode, selectedYear, selectedToday, snapshot, language],
  )

  if (error) {
    return (
      <main className="app-shell loading-state">
        <p className="eyebrow">Monatsübersicht</p>
        <h1>Speicherfehler</h1>
        <p className="lead">{error}</p>
      </main>
    )
  }

  if (isLoading || !snapshot) {
    return (
      <main className="app-shell loading-state">
        <p className="eyebrow">Monatsübersicht</p>
        <h1>HOmie wird geladen</h1>
      </main>
    )
  }

  const heroTitle =
    viewMode === 'month' && calendar
      ? calendar.heading
      : viewMode === 'year' && yearOverview
        ? String(yearOverview.year)
        : t.settings
  const heroEyebrow =
    viewMode === 'month' ? t.monthOverview : viewMode === 'year' ? t.yearOverview : t.settings
  const heroLead =
    viewMode === 'month' && calendar
      ? t.monthLead({
          openWorkingDays: calendar.evaluation.openWorkingDays,
          usagePercentage: calendar.evaluation.usagePercentage,
        })
      : viewMode === 'year'
        ? t.yearLead
        : t.settingsLead
  const settingsReturnLabel = lastOverviewMode === 'year' ? t.openYearOverview : t.openMonthOverview
  const quotaLabel =
    calendar && monthStatus
      ? `${t.quota} ${Math.round(calendar.policy.quota * 100)} % · ${t.federalState} ${calendar.policy.bundesland}`
      : undefined

  return (
    <main className="app-shell">
      <HeroPanel
        viewMode={viewMode}
        lastOverviewMode={lastOverviewMode}
        title={heroTitle}
        eyebrow={heroEyebrow}
        lead={heroLead}
        language={language}
        monthStatus={monthStatus}
        quotaLabel={quotaLabel}
        visiblePolicyHistoryCount={visiblePolicyHistory.length}
        settingsReturnLabel={settingsReturnLabel}
        onNavigatePrevious={() => {
          if (viewMode === 'month') {
            navigateMonth(-1)
            return
          }
          navigateYear(-1)
        }}
        onNavigateNext={() => {
          if (viewMode === 'month') {
            navigateMonth(1)
            return
          }
          navigateYear(1)
        }}
        onOpenSettings={openSettingsPage}
        onOpenYearOverview={openYearOverview}
        onOpenMonthOverview={openMonthOverview}
        t={t}
      />

      {viewMode === 'month' && calendar && monthStatus ? (
        <MonthOverview
          calendar={calendar}
          monthStatus={monthStatus}
          language={language}
          selectedMonth={selectedMonth}
          t={t}
          onCycleDayStatus={(date) => {
            void cycleDayStatus(date)
          }}
          onOpenDetailView={openDetailView}
        />
      ) : null}

      {viewMode === 'year' && yearOverview ? (
        <YearOverview
          yearOverview={yearOverview}
          language={language}
          t={t}
          onSelectMonth={selectMonth}
        />
      ) : null}

      {viewMode === 'settings' ? (
        <SettingsPage
          snapshot={snapshot}
          language={language}
          today={selectedToday}
          t={t}
          onUpdatePreferences={(preferences) => {
            void updatePreferences(preferences)
          }}
          onAddPolicyHistoryEntry={(entry) => {
            void addPolicyHistoryEntry(entry)
          }}
          onRestoreSnapshot={restoreSnapshot}
          onExportJson={exportState}
        />
      ) : null}

      <DetailDialog
        detailDate={detailDate}
        detailStatus={detailStatus}
        detailNote={detailNote}
        language={language}
        t={t}
        onClose={closeDetailView}
        onSetStatus={setDetailStatus}
        onSetNote={setDetailNote}
        onSave={() => {
          void saveDetailEntry()
        }}
      />
    </main>
  )
}

export default App
