export interface CityInfo {
  name: string
  province: string
  lat: string
  lon: string
  gpsLat: number
  gpsLon: number
}

export interface BaziPillar {
  ganZhi: string
  tianGan: string
  diZhi: string
  tianGanWuxing: string
  diZhiWuxing: string
  shiShen: string
  cangGan: Array<{ gan: string; wuxing: string; shiShen: string }>
  naYin: string
}

export interface DaYun {
  ganZhi: string
  startAge: number
  startYear: number
  endYear: number
  shiShen: string
}

export interface BaziResult {
  // 原始结果
  raw: any
  // 格式化数据
  fourPillars: {
    year: BaziPillar
    month: BaziPillar
    day: BaziPillar
    hour: BaziPillar
  }
  dayMaster: string
  dayMasterWuxing: string
  gender: '男' | '女'
  solarTime: string
  lunarTime: string
  daYun: DaYun[]
}
