import { UtensilsCrossed, Tag, CalendarDays, ShoppingCart, User } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import type { TabName } from '../../types/app.types'

const tabs: { name: TabName; label: string; icon: typeof UtensilsCrossed; path: string }[] = [
  { name: 'recipes', label: 'Rezepte', icon: UtensilsCrossed, path: '/recipes' },
  { name: 'offers', label: 'Angebote', icon: Tag, path: '/offers' },
  { name: 'weekly', label: 'Woche', icon: CalendarDays, path: '/weekly' },
  { name: 'shopping', label: 'Einkauf', icon: ShoppingCart, path: '/shopping' },
  { name: 'profile', label: 'Profil', icon: User, path: '/profile' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  // Derive active tab from URL, not from store
  const currentTab = tabs.find((t) => t.path === location.pathname)?.name ?? 'recipes'

  const handleTabClick = (tab: typeof tabs[number]) => {
    if (currentTab === tab.name && location.pathname === tab.path) {
      window.dispatchEvent(new CustomEvent('tab-reset', { detail: tab.name }))
      return
    }
    setActiveTab(tab.name)
    navigate(tab.path)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white z-50"
      style={{ borderTop: '1.5px solid #EBEBEB', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center h-[56px] max-w-[480px] mx-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.name
          const Icon = tab.icon
          return (
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-[2px] ${
                isActive ? 'text-primary' : 'text-muted'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.7} />
              <span className={`text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
