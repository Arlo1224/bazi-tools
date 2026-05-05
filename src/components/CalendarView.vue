<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getChineseCalendar } from 'cantian-tymext'

const today = new Date()
const year = ref(today.getFullYear())
const month = ref(today.getMonth() + 1)
const day = ref(today.getDate())

const maxDays = computed(() => new Date(year.value, month.value, 0).getDate())

watch([year, month], () => {
  if (day.value > maxDays.value) day.value = maxDays.value
})

const calendarData = computed(() => {
  try {
    return getChineseCalendar({ year: year.value, month: month.value, day: day.value })
  } catch {
    return null
  }
})

function setToday() {
  const now = new Date()
  year.value = now.getFullYear()
  month.value = now.getMonth() + 1
  day.value = now.getDate()
}

function changeDay(offset: number) {
  const d = new Date(year.value, month.value - 1, day.value + offset)
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
  day.value = d.getDate()
}
</script>

<template>
  <div class="calendar-page">
    <!-- 日期选择 -->
    <div class="card date-picker-card">
      <div class="date-nav">
        <button class="nav-btn" @click="changeDay(-1)">&lt;</button>
        <div class="date-selectors">
          <select class="form-input" v-model.number="year">
            <option v-for="y in Array.from({length: 87}, (_, i) => 2026 - i)" :key="y" :value="y">{{ y }}年</option>
          </select>
          <select class="form-input" v-model.number="month">
            <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
          </select>
          <select class="form-input" v-model.number="day">
            <option v-for="d in maxDays" :key="d" :value="d">{{ d }}日</option>
          </select>
        </div>
        <button class="nav-btn" @click="changeDay(1)">&gt;</button>
      </div>
      <button class="btn btn-outline today-btn" @click="setToday">今天</button>
    </div>

    <!-- 黄历信息 -->
    <div v-if="calendarData" class="card calendar-card">
      <div class="cal-header">
        <div class="cal-solar">{{ calendarData.公历 }}</div>
        <div class="cal-lunar">{{ calendarData.农历 }}</div>
        <div class="cal-ganzhi">{{ calendarData.干支日期 }}</div>
        <div class="cal-zodiac">
          <span>{{ calendarData.生肖 }}年</span>
          <span>{{ calendarData.纳音 }}</span>
        </div>
      </div>

      <!-- 节气 -->
      <div v-if="calendarData.节气" class="cal-section jieqi-section">
        <span class="jieqi-current">{{ calendarData.节气.term }}后第{{ calendarData.节气.afterDays }}天</span>
        <span v-if="calendarData.节气.nextTerm" class="jieqi-next">
          距{{ calendarData.节气.nextTerm }}还有{{ calendarData.节气.beforeNextTermDays }}天
        </span>
      </div>

      <!-- 节日 -->
      <div v-if="calendarData.农历节日 || calendarData.公历节日" class="cal-section festival-section">
        <span v-if="calendarData.农历节日" class="festival lunar-festival">{{ calendarData.农历节日 }}</span>
        <span v-if="calendarData.公历节日" class="festival solar-festival">{{ calendarData.公历节日 }}</span>
      </div>

      <!-- 宜忌 -->
      <div class="cal-section yiji-section">
        <div class="yi-block">
          <h4 class="yi-title">宜</h4>
          <p class="yi-content">{{ calendarData.宜 || '无' }}</p>
        </div>
        <div class="ji-block">
          <h4 class="ji-title">忌</h4>
          <p class="ji-content">{{ calendarData.忌 || '无' }}</p>
        </div>
      </div>

      <!-- 方位 / 其他 -->
      <div class="cal-section info-grid">
        <div class="info-item">
          <span class="info-label">冲煞</span>
          <span class="info-value">{{ calendarData.冲煞 }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">彭祖百忌</span>
          <span class="info-value">{{ calendarData.彭祖百忌 }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">二十八宿</span>
          <span class="info-value">{{ calendarData.二十八宿 }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">喜神</span>
          <span class="info-value">{{ calendarData.喜神方位 }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">财神</span>
          <span class="info-value">{{ calendarData.财神方位 }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">福神</span>
          <span class="info-value">{{ calendarData.福神方位 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-page { display: flex; flex-direction: column; gap: 16px; }

.date-picker-card { padding: 16px; }
.date-nav {
  display: flex; align-items: center; gap: 8px;
}
.nav-btn {
  background: none; border: 1px solid var(--border); color: var(--text);
  width: 36px; height: 36px; border-radius: var(--radius-sm);
  cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
  transition: border-color 0.2s;
}
.nav-btn:hover { border-color: var(--accent); color: var(--accent); }
.date-selectors {
  display: flex; gap: 6px; flex: 1;
}
.date-selectors .form-input { min-width: 0; padding: 8px 6px; font-size: 13px; }
.today-btn { margin-top: 10px; width: 100%; padding: 8px; font-size: 13px; }

.calendar-card { padding: 20px; }
.cal-header { margin-bottom: 16px; text-align: center; }
.cal-solar { font-size: 13px; color: var(--text-dim); }
.cal-lunar { font-size: 18px; font-weight: 700; color: var(--text); margin: 4px 0; }
.cal-ganzhi { font-size: 15px; color: var(--accent); font-weight: 600; }
.cal-zodiac { font-size: 12px; color: var(--text-dim); margin-top: 4px; display: flex; gap: 12px; justify-content: center; }

.cal-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }

.jieqi-section { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; }
.jieqi-current { color: var(--accent); }
.jieqi-next { color: var(--text-dim); }

.festival-section { display: flex; gap: 8px; flex-wrap: wrap; }
.festival {
  padding: 3px 10px; border-radius: 4px; font-size: 12px;
}
.lunar-festival { background: var(--red-soft); color: var(--red); }
.solar-festival { background: var(--blue-soft); color: var(--blue); }

.yiji-section { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.yi-block, .ji-block { padding: 12px; border-radius: var(--radius-sm); }
.yi-block { background: var(--green-soft); }
.ji-block { background: var(--red-soft); }
.yi-title { color: var(--green); font-size: 13px; margin-bottom: 6px; }
.ji-title { color: var(--red); font-size: 13px; margin-bottom: 6px; }
.yi-content, .ji-content { font-size: 12px; line-height: 1.8; color: var(--text); }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.info-item { font-size: 12px; }
.info-label { color: var(--text-dim); margin-right: 6px; }
.info-value { color: var(--text); }
</style>
