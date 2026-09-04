export type LocationScope = 'local' | 'regional' | 'us' | 'global'

export const LOCATION_SCOPES: { value: LocationScope; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'regional', label: 'Regional' },
  { value: 'us', label: 'US' },
  { value: 'global', label: 'Global' },
]

export const DEFAULT_LOCATION_SCOPE: LocationScope = 'local'

export const LOCATION_SCOPE_LABELS: Record<LocationScope, string> = {
  local: 'Local',
  regional: 'Regional',
  us: 'US',
  global: 'Global',
}

export const LOCATION_SCOPE_DEFAULTS: Record<LocationScope, string> = {
  local: '',
  regional: 'Regional area',
  us: 'United States',
  global: 'Worldwide',
}

export function parseLocationScope(value: unknown): LocationScope {
  if (value === 'local' || value === 'regional' || value === 'us' || value === 'global') {
    return value
  }
  return DEFAULT_LOCATION_SCOPE
}
