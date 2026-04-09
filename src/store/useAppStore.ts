import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile, TabName } from '../types/app.types'

interface AppState {
  session: Session | null
  profile: UserProfile | null
  activeTab: TabName
  setSession: (session: Session | null) => void
  setProfile: (profile: UserProfile | null) => void
  setActiveTab: (tab: TabName) => void
}

export const useAppStore = create<AppState>((set) => ({
  session: null,
  profile: null,
  activeTab: 'recipes',
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))
