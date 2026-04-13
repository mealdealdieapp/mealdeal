import { useState } from 'react'
import { Settings, ArrowLeft } from 'lucide-react'
import { PageLayout } from '../components/layout/PageLayout'
import { PageHeader } from '../components/layout/PageHeader'
import { ProfileSettings } from '../components/profile/ProfileSettings'
import { ProfileMain } from '../components/profile/ProfileMain'
import { FavoritesView } from '../components/profile/FavoritesView'
import { MyRecipesView } from '../components/profile/MyRecipesView'
import { WatchlistView } from '../components/profile/WatchlistView'
import { HistoryView } from '../components/profile/HistoryView'

type View = 'main' | 'settings' | 'favorites' | 'watchlist' | 'history' | 'myrecipes'

const VIEW_TITLES: Record<View, string> = {
  main: 'Profil', settings: 'Einstellungen', favorites: 'Favoriten',
  watchlist: 'Watchlist', history: 'Kaufverlauf', myrecipes: 'Meine Rezepte',
}

export function ProfilePage() {
  const [view, setView] = useState<View>('main')

  return (
    <PageLayout>
      <PageHeader rightContent={view === 'main' ? (
        <button onClick={() => setView('settings')}
          className="w-8 h-8 flex items-center justify-center rounded-full" style={{ border: '1.5px solid #EBEBEB' }}>
          <Settings size={15} className="text-muted" />
        </button>
      ) : undefined} />

      <div className="px-4 pb-24">
        {view !== 'main' && (
          <button onClick={() => setView('main')} className="flex items-center gap-1.5 text-[13px] text-muted font-medium mb-3">
            <ArrowLeft size={15} /> {VIEW_TITLES[view]}
          </button>
        )}

        {view === 'main' && <ProfileMain setView={setView} />}
        {view === 'settings' && <ProfileSettings />}
        {view === 'favorites' && <FavoritesView />}
        {view === 'myrecipes' && <MyRecipesView />}
        {view === 'watchlist' && <WatchlistView />}
        {view === 'history' && <HistoryView />}
      </div>
    </PageLayout>
  )
}
