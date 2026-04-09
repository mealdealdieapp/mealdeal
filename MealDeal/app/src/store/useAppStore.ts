import { useState, useEffect, useCallback } from 'react';

export interface UserProfile {
  id: string;
  plz: string | null;
  markets: string[] | null;
  diets: string[] | null;
  preferences: string[] | null;
  goal: string | null;
  budget: number | null;
  cal_target: number | null;
  gender: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  activity: number | null;
}

// Simple global state (no zustand needed)
let _state = {
  profile: null as UserProfile | null,
  onboardingComplete: false,
};

const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

function _setState(partial: Partial<typeof _state>) {
  _state = { ..._state, ...partial };
  _notify();
}

// Public API — matches zustand selector pattern
export function useAppStore<T>(selector: (state: typeof _state) => T): T {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  return selector(_state);
}

// Actions — importable everywhere
export function setProfile(profile: UserProfile | null) {
  _setState({
    profile,
    onboardingComplete: !!(profile?.plz && profile?.markets?.length),
  });
}

export function updateProfile(partial: Partial<UserProfile>) {
  const current = _state.profile;
  if (current) {
    const updated = { ...current, ...partial };
    _setState({
      profile: updated,
      onboardingComplete: !!(updated.plz && updated.markets?.length),
    });
  }
}

export function setOnboardingComplete(complete: boolean) {
  _setState({ onboardingComplete: complete });
}
