<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { SolarDay, LunarHour } from 'cantian-tymext'

const props = defineProps<{ baziResult: any }>()

const queryLevel = ref<'year' | 'month' | 'day' | 'hour'>('year')
const startYear = ref(new Date().getFullYear())
const queryMonth = ref(new Date().getMonth() + 1)
const queryDay = ref(new Date().getDate())
const rangeYears = ref(10)

// 十神计算：日主天干 vs 目标天干
const tianGanWuxing: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火',
  '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
}
const tianGanYinYang: Record<string, string> = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴',
  '戊': '阳', '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴'
}

function getShiShen(dayMaster: string, target: string): string {
  if (!dayMaster || !target) return ''
  const dmWx = tianGanWuxing[dayMaster]
  const tWx = tianGanWuxing[target]
  const dmYy = tianGanYinYang[dayMaster]
  const tYy = tianGanYinYang[target]
  if (!dmWx || !tWx) return ''

  const sameYy = dmYy === tYy
  // 五行生克关系
  const shengMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
  const keMap: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' }

  if (dmWx === tWx) return sameYy ? '比肩' : '劫财'
  if (shengMap[dmWx] === tWx) return sameYy ? '食神' : '伤官'
  if (keMap[dmWx] === tWx) return sameYy ? '偏财' : '正财'
  if (shengMap[tWx] === dmWx) return sameYy ? '偏印' : '正印'
  if (keMap[tWx] === dmWx) return sameYy ? '七杀' : '正官'
  return ''
}

const dayMaster = computed(() => {
  return props.baziResult?.日柱?.天干?.天干 || ''
})

// 流年查询
const liuNianResults = computed(() => {
  if (queryLevel.value !== 'year') return []
  const results: any[] = []
  for (let y = startYear.value; y < startYear.value + rangeYears.value; y++) {
    try {
      const sd = SolarDay.fromYmd(y, 6, 1)
      const ly = sd.getLunarDay().getLunarMonth().getLunarYear()
      const sc = ly.getSixtyCycle()
      const ganZhi = sc.getName()
      const gan = ganZhi[0]
      const zhi = ganZhi[1]
      results.push({
        year: y,
        ganZhi,
        tianGan: gan,
        diZhi: zhi,
        wuxing: tianGanWuxing[gan] || '',
        shiShen: getShiShen(dayMaster.value, gan),
      })
    } catch { /* skip */ }
  }
  return results
})

// 流月查询
const liuYueResults = computed(() => {
  if (queryLevel.value !== 'month') return []
  const results: any[] = []
  for (let m = 1; m <= 12; m++) {
    try {
      const sd = SolarDay.fromYmd(startYear.value, m, 15)
      const lm = sd.getLunarDay().getLunarMonth()
      const sc = lm.getSixtyCycle()
      const ganZhi = sc.getName()
      const gan = ganZhi[0]
      results.push({
        month: m,
        ganZhi,
        tianGan: gan,
        wuxing: tianGanWuxing[gan] || '',
        shiShen: getShiShen(dayMaster.value, gan),
      })
    } catch { /* skip */ }
  }
  return results
})

// 流日查询
const liuRiResults = computed(() => {
  if (queryLevel.value !== 'day') return []
  const results: any[] = []
  const maxDay = new Date(startYear.value, queryMonth.value, 0).getDate()
  for (let d = 1; d <= maxDay; d++) {
    try {
      const sd = SolarDay.fromYmd(startYear.value, queryMonth.value, d)
      const ld = sd.getLunarDay()
      const sc = ld.getSixtyCycle()
      const ganZhi = sc.getName()
      const gan = ganZhi[0]
      results.push({
        day: d,
        ganZhi,
        tianGan: gan,
        wuxing: tianGanWuxing[gan] || '',
        shiShen: getShiShen(dayMaster.value, gan),
      })
    } catch { /* skip */ }
  }
  return results
})

// 流时查询
const liuShiResults = computed(() => {
  if (queryLevel.value !== 'hour') return []
  const results: any[] = []
  // 十二时辰（每 2 小时一个）
  const shichen = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  for (let h = 0; h < 24; h += 2) {
    try {
      const lh = LunarHour.fromYmdHms(startYear.value, queryMonth.value, queryDay.value, h, 0, 0)
      const sc = lh.getSixtyCycle()
      const ganZhi = sc.getName()
      const gan = ganZhi[0]
      results.push({
        hour: h,
        shichen: shichen[Math.floor(h / 2)] + '时',
        timeRange: `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:59`,
        ganZhi,
        tianGan: gan,
        wuxing: tianGanWuxing[gan] || '',
        shiShen: getShiShen(dayMaster.value, gan),
      })
    } catch { /* skip */ }
  }
  return results
})

function wuxingClass(wuxing: string): string {
  const map: Record<string, string> = { '木': 'wuxing-wood', '火': 'wuxing-fire', '土': 'wuxing-earth', '金': 'wuxing-metal', '水': 'wuxing-water' }
  return map[wuxing] || ''
}
</script>

<template>
  <div class="fortune-page">
    <!-- 提示 -->
    <div v-if="!baziResult" class="card hint-card">
      <p>请先在「排盘」页面完成排盘，才能查询流运</p>
    </div>

    <template v-else>
      <!-- 日主信息 -->
      <div class="day-master-bar">
        日主：<strong :class="wuxingClass(tianGanWuxing[dayMaster] || '')">{{ dayMaster }}</strong>
        <span class="dm-wuxing">（{{ tianGanWuxing[dayMaster] }}）</span>
      </div>

      <!-- 查询级别切换 -->
      <div class="card query-card">
        <div class="level-tabs">
          <button :class="{ active: queryLevel === 'year' }" @click="queryLevel = 'year'">流年</button>
          <button :class="{ active: queryLevel === 'month' }" @click="queryLevel = 'month'">流月</button>
          <button :class="{ active: queryLevel === 'day' }" @click="queryLevel = 'day'">流日</button>
          <button :class="{ active: queryLevel === 'hour' }" @click="queryLevel = 'hour'">流时</button>
        </div>

        <!-- 查询参数 -->
        <div class="query-params">
          <div class="form-group" v-if="queryLevel === 'year'">
            <label>起始年份</label>
            <div style="display:flex; gap:8px;">
              <select class="form-input" v-model.number="startYear">
                <option v-for="y in Array.from({length: 50}, (_, i) => 2000 + i)" :key="y" :value="y">{{ y }}年</option>
              </select>
              <select class="form-input" v-model.number="rangeYears" style="max-width:100px;">
                <option :value="5">5年</option>
                <option :value="10">10年</option>
                <option :value="20">20年</option>
              </select>
            </div>
          </div>
          <div class="form-group" v-if="queryLevel === 'month'">
            <label>查询年份</label>
            <select class="form-input" v-model.number="startYear">
              <option v-for="y in Array.from({length: 50}, (_, i) => 2000 + i)" :key="y" :value="y">{{ y }}年</option>
            </select>
          </div>
          <div class="form-group" v-if="queryLevel === 'day'">
            <label>查询月份</label>
            <div style="display:flex; gap:8px;">
              <select class="form-input" v-model.number="startYear">
                <option v-for="y in Array.from({length: 50}, (_, i) => 2000 + i)" :key="y" :value="y">{{ y }}年</option>
              </select>
              <select class="form-input" v-model.number="queryMonth">
                <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
              </select>
            </div>
          </div>
          <div class="form-group" v-if="queryLevel === 'hour'">
            <label>查询日期</label>
            <div style="display:flex; gap:8px;">
              <select class="form-input" v-model.number="startYear">
                <option v-for="y in Array.from({length: 50}, (_, i) => 2000 + i)" :key="y" :value="y">{{ y }}年</option>
              </select>
              <select class="form-input" v-model.number="queryMonth">
                <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
              </select>
              <select class="form-input" v-model.number="queryDay">
                <option v-for="d in 31" :key="d" :value="d">{{ d }}日</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 结果展示 -->
      <div class="card result-card">
        <!-- 流年 -->
        <div v-if="queryLevel === 'year'" class="fortune-grid">
          <div v-for="item in liuNianResults" :key="item.year" class="fortune-item">
            <span class="f-label">{{ item.year }}年</span>
            <span class="f-ganzi" :class="wuxingClass(item.wuxing)">{{ item.ganZhi }}</span>
            <span class="f-shishen">{{ item.shiShen }}</span>
          </div>
        </div>

        <!-- 流月 -->
        <div v-if="queryLevel === 'month'" class="fortune-grid">
          <div v-for="item in liuYueResults" :key="item.month" class="fortune-item">
            <span class="f-label">{{ item.month }}月</span>
            <span class="f-ganzi" :class="wuxingClass(item.wuxing)">{{ item.ganZhi }}</span>
            <span class="f-shishen">{{ item.shiShen }}</span>
          </div>
        </div>

        <!-- 流日 -->
        <div v-if="queryLevel === 'day'" class="fortune-grid fortune-grid-dense">
          <div v-for="item in liuRiResults" :key="item.day" class="fortune-item fortune-item-sm">
            <span class="f-label">{{ item.day }}日</span>
            <span class="f-ganzi" :class="wuxingClass(item.wuxing)">{{ item.ganZhi }}</span>
            <span class="f-shishen">{{ item.shiShen }}</span>
          </div>
        </div>

        <!-- 流时 -->
        <div v-if="queryLevel === 'hour'" class="fortune-grid">
          <div v-for="item in liuShiResults" :key="item.hour" class="fortune-item">
            <span class="f-label">{{ item.shichen }}</span>
            <span class="f-time">{{ item.timeRange }}</span>
            <span class="f-ganzi" :class="wuxingClass(item.wuxing)">{{ item.ganZhi }}</span>
            <span class="f-shishen">{{ item.shiShen }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.fortune-page { display: flex; flex-direction: column; gap: 16px; }

.hint-card { text-align: center; color: var(--text-dim); padding: 40px 20px; font-size: 14px; }

.day-master-bar {
  font-size: 14px; color: var(--text-dim);
  padding: 8px 16px; background: var(--card); border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.day-master-bar strong { font-size: 16px; }
.dm-wuxing { font-size: 12px; }

.query-card { padding: 16px; }
.level-tabs {
  display: flex; gap: 4px; margin-bottom: 12px;
}
.level-tabs button {
  flex: 1; padding: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text-dim); border-radius: var(--radius-sm);
  cursor: pointer; font-family: inherit; font-size: 13px; transition: all 0.2s;
}
.level-tabs button.active {
  background: var(--accent-dim); color: var(--accent); border-color: var(--accent-dim);
}

.query-params .form-group { margin-bottom: 0; }

.result-card { padding: 16px; }
.fortune-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px;
}
.fortune-grid-dense {
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 6px;
}
.fortune-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 6px; background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-sm); text-align: center;
}
.fortune-item-sm { padding: 6px 4px; }
.f-label { font-size: 11px; color: var(--text-dim); }
.f-time { font-size: 10px; color: var(--text-muted); }
.f-ganzi { font-size: 16px; font-weight: 700; }
.fortune-item-sm .f-ganzi { font-size: 14px; }
.f-shishen { font-size: 11px; color: var(--text-dim); }
</style>
