type ReverseGeocodeResponse = {
  city?: string
  locality?: string
  principalSubdivision?: string
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        reject(new Error('Location permission denied. Enter your location manually.'))
        return
      }
      if (error.code === error.TIMEOUT) {
        reject(new Error('Location detection timed out. Enter your location manually.'))
        return
      }
      reject(new Error('Could not detect your location. Enter your location manually.'))
    }, {
      enableHighAccuracy: false,
      timeout: 15_000,
      maximumAge: 5 * 60_000,
    })
  })
}

async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResponse> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('localityLanguage', 'en')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error('Could not look up your location.')
  }

  return response.json() as Promise<ReverseGeocodeResponse>
}

export function formatLocalArea(data: ReverseGeocodeResponse): string {
  const city = data.city?.trim() || data.locality?.trim() || ''
  const state = data.principalSubdivision?.trim() || ''

  if (city && state) return `${city}, ${state}`
  return city || state
}

export async function detectLocalArea(): Promise<string> {
  const position = await getCurrentPosition()
  const data = await reverseGeocode(position.coords.latitude, position.coords.longitude)
  const location = formatLocalArea(data)

  if (!location) {
    throw new Error('Could not determine your city from geolocation.')
  }

  return location
}
