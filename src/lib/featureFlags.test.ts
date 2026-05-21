import { describe, it, expect, vi, afterEach } from 'vitest'
import { isFeatureEnabled } from './featureFlags'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isFeatureEnabled', () => {
  it('ist standardmaessig aus, wenn keine ENV gesetzt ist', () => {
    expect(isFeatureEnabled('matched_offers')).toBe(false)
  })
  it('ist an, wenn die ENV auf "true" steht', () => {
    vi.stubEnv('VITE_FEATURE_MATCHED_OFFERS', 'true')
    expect(isFeatureEnabled('matched_offers')).toBe(true)
  })
  it('ist an, wenn die ENV auf "1" steht', () => {
    vi.stubEnv('VITE_FEATURE_MATCHED_OFFERS', '1')
    expect(isFeatureEnabled('matched_offers')).toBe(true)
  })
  it('ist aus bei einem anderen Wert', () => {
    vi.stubEnv('VITE_FEATURE_MATCHED_OFFERS', 'false')
    expect(isFeatureEnabled('matched_offers')).toBe(false)
  })
})
