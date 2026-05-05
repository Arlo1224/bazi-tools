import { ref, computed } from 'vue'

export interface CityData {
  name: string
  province: string
  gpsLat: number
  gpsLon: number
}

const provinces = ref<Record<string, CityData[]>>({})
const loaded = ref(false)

export function useCities() {
  async function loadCities() {
    if (loaded.value) return
    const resp = await fetch(import.meta.env.BASE_URL + 'cities.json')
    const data = await resp.json()
    const result: Record<string, CityData[]> = {}
    for (const [province, cities] of Object.entries(data)) {
      result[province] = (cities as any[]).map(c => ({
        name: c[0],
        province,
        gpsLat: c[3],
        gpsLon: c[4],
      }))
    }
    provinces.value = result
    loaded.value = true
  }

  const provinceList = computed(() => Object.keys(provinces.value))

  function getCities(province: string): CityData[] {
    return provinces.value[province] || []
  }

  function findCity(name: string): CityData | undefined {
    for (const cities of Object.values(provinces.value)) {
      const found = cities.find(c => c.name === name)
      if (found) return found
    }
    return undefined
  }

  return { loadCities, provinceList, getCities, findCity, loaded }
}
