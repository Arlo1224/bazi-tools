/**
 * 真太阳时计算（纯数字运算，不受系统夏令时影响）
 */

export interface TimeComponents {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1]
}

function dayOfYear(year: number, month: number, day: number): number {
  let doy = 0
  for (let m = 1; m < month; m++) {
    doy += daysInMonth(year, m)
  }
  return doy + day
}

function equationOfTime(doy: number): number {
  // 时差方程近似公式（单位：分钟）
  const b = (2 * Math.PI * (doy - 81)) / 365
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
}

/**
 * 将时间组件加减分钟数，返回新的时间组件
 * 纯数字运算，不依赖 Date 对象，避免夏令时干扰
 */
function addMinutes(t: TimeComponents, minutes: number): TimeComponents {
  // 转为一天内的总分钟数
  let totalMinutes = t.hour * 60 + t.minute + t.second / 60 + minutes

  let { year, month, day } = t

  // 处理跨天
  while (totalMinutes >= 1440) {
    totalMinutes -= 1440
    day++
    if (day > daysInMonth(year, month)) {
      day = 1
      month++
      if (month > 12) { month = 1; year++ }
    }
  }
  while (totalMinutes < 0) {
    totalMinutes += 1440
    day--
    if (day < 1) {
      month--
      if (month < 1) { month = 12; year-- }
      day = daysInMonth(year, month)
    }
  }

  const hour = Math.floor(totalMinutes / 60)
  const minute = Math.floor(totalMinutes % 60)
  const second = Math.round((totalMinutes % 1) * 60)

  return { year, month, day, hour, minute, second }
}

/**
 * 计算真太阳时
 * @param time 北京时间（年月日时分秒）
 * @param longitude GPS 经度（东经为正）
 * @returns 修正后的时间组件 + 修正信息
 */
export function calcTrueSolarTime(time: TimeComponents, longitude: number): {
  result: TimeComponents
  correctionMinutes: number
  geoMinutes: number
  eotMinutes: number
} {
  const doy = dayOfYear(time.year, time.month, time.day)

  // 地理经度修正：(实际经度 - 标准经线120°) × 4分钟/度
  const geoMinutes = (longitude - 120) * 4

  // 时差方程修正
  const eotMinutes = equationOfTime(doy)

  // 总修正
  const correctionMinutes = geoMinutes + eotMinutes

  const result = addMinutes(time, correctionMinutes)

  return {
    result,
    correctionMinutes: Math.round(correctionMinutes),
    geoMinutes: Math.round(geoMinutes * 10) / 10,
    eotMinutes: Math.round(eotMinutes * 10) / 10,
  }
}

/**
 * 格式化时间组件为字符串
 */
export function formatTime(t: TimeComponents): string {
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')} ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}:${String(t.second).padStart(2, '0')}`
}
