<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { buildBaziFromSolar } from 'cantian-tymext'
import { useCities } from '@/composables/useCities'
import { calcTrueSolarTime, formatTime } from '@/lib/trueSolarTime'

const emit = defineEmits<{ 'update:result': [val: any] }>()

const { loadCities, provinceList, getCities, findCity, loaded } = useCities()

// 表单状态
const birthYear = ref(1990)
const birthMonth = ref(6)
const birthDay = ref(15)
const birthHour = ref(8)
const birthMinute = ref(30)
const province = ref('安徽省')
const city = ref('芜湖')
const gender = ref<0 | 1>(1)
const useTrueSolar = ref(true)

// 排盘结果
const result = ref<any>(null)
const error = ref('')

const cityList = computed(() => getCities(province.value))

const maxDays = computed(() => new Date(birthYear.value, birthMonth.value, 0).getDate())

watch(province, () => {
  const cities = getCities(province.value)
  if (cities.length > 0) city.value = cities[0].name
})

onMounted(async () => {
  await loadCities()
  // 默认选安徽省池州（齐云山）
  if (provinceList.value.includes('安徽省')) {
    province.value = '安徽省'
    city.value = '芜湖'
  }
})

function doPaipan() {
  error.value = ''
  try {
    const cityInfo = findCity(city.value)
    const longitude = cityInfo?.gpsLon ?? 120

    const inputTime = {
      year: birthYear.value,
      month: birthMonth.value,
      day: birthDay.value,
      hour: birthHour.value,
      minute: birthMinute.value,
      second: 0,
    }

    let solarTimeStr: string
    let correction = 0

    if (useTrueSolar.value) {
      const { result: trueTime, correctionMinutes } = calcTrueSolarTime(inputTime, longitude)
      solarTimeStr = formatTime(trueTime)
      correction = correctionMinutes
    } else {
      solarTimeStr = formatTime(inputTime)
    }

    const baziResult = buildBaziFromSolar({
      solarTime: solarTimeStr,
      sect: 2,
      gender: gender.value,
    })

    result.value = {
      ...baziResult,
      _meta: {
        inputTime: formatTime(inputTime),
        trueSolarTime: solarTimeStr,
        correction,
        city: city.value,
        longitude,
        useTrueSolar: useTrueSolar.value,
      }
    }
    emit('update:result', result.value)
  } catch (e: any) {
    error.value = e.message || '排盘失败'
    console.error(e)
  }
}

function wuxingClass(wuxing: string): string {
  const map: Record<string, string> = { '木': 'wuxing-wood', '火': 'wuxing-fire', '土': 'wuxing-earth', '金': 'wuxing-metal', '水': 'wuxing-water' }
  return map[wuxing] || ''
}
</script>

<template>
  <div class="bazi-page">
    <!-- 输入表单 -->
    <div class="card form-card">
      <h3 class="card-title">出生信息</h3>
      <div class="form-row">
        <div class="form-group">
          <label>年</label>
          <select class="form-input" v-model.number="birthYear">
            <option v-for="y in Array.from({length: 87}, (_, i) => 2026 - i)" :key="y" :value="y">{{ y }}年</option>
          </select>
        </div>
        <div class="form-group">
          <label>月</label>
          <select class="form-input" v-model.number="birthMonth">
            <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
          </select>
        </div>
        <div class="form-group">
          <label>日</label>
          <select class="form-input" v-model.number="birthDay">
            <option v-for="d in maxDays" :key="d" :value="d">{{ d }}日</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>时</label>
          <select class="form-input" v-model.number="birthHour">
            <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ String(h - 1).padStart(2, '0') }}时</option>
          </select>
        </div>
        <div class="form-group">
          <label>分</label>
          <select class="form-input" v-model.number="birthMinute">
            <option v-for="m in Array.from({length: 12}, (_, i) => i * 5)" :key="m" :value="m">{{ String(m).padStart(2, '0') }}分</option>
          </select>
        </div>
        <div class="form-group">
          <label>性别</label>
          <select class="form-input" v-model.number="gender">
            <option :value="1">男</option>
            <option :value="0">女</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>省份</label>
          <select class="form-input" v-model="province">
            <option v-for="p in provinceList" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>城市</label>
          <select class="form-input" v-model="city">
            <option v-for="c in cityList" :key="c.name" :value="c.name">{{ c.name }}</option>
          </select>
        </div>
      </div>
      <div class="form-row" style="align-items: center; gap: 12px; margin-top: 4px;">
        <label class="checkbox-label">
          <input type="checkbox" v-model="useTrueSolar" />
          <span>真太阳时修正</span>
        </label>
      </div>
      <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" @click="doPaipan">
        排盘
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- 排盘结果 -->
    <div v-if="result" class="card result-card">
      <!-- 基本信息 -->
      <div class="meta-info">
        <span>{{ result.阳历 }}</span>
        <span>农历：{{ result.农历 }}</span>
        <span>生肖：{{ result.生肖 }}</span>
        <span v-if="result._meta.useTrueSolar" class="true-solar-tag">
          真太阳时（修正{{ result._meta.correction > 0 ? '+' : '' }}{{ result._meta.correction }}分）
        </span>
      </div>

      <!-- 八字 -->
      <div class="bazi-display">
        <span class="bazi-text">{{ result.八字 }}</span>
        <span class="day-master">日主：<strong :class="wuxingClass(result.日主?.slice(0,1) === '甲' || result.日主?.slice(0,1) === '乙' ? '木' : '')">{{ result.日主 }}</strong></span>
      </div>

      <!-- 四柱表格 -->
      <table class="pillar-table">
        <thead>
          <tr><th></th><th>年柱</th><th>月柱</th><th>日柱</th><th>时柱</th></tr>
        </thead>
        <tbody>
          <tr>
            <td class="row-label">天干</td>
            <td v-for="key in ['年柱', '月柱', '日柱', '时柱']" :key="key">
              <span class="gan" :class="wuxingClass(result[key]?.天干?.五行)">
                {{ result[key]?.天干?.天干 }}
              </span>
              <span class="shishen">{{ result[key]?.天干?.十神 || '日主' }}</span>
            </td>
          </tr>
          <tr>
            <td class="row-label">地支</td>
            <td v-for="key in ['年柱', '月柱', '日柱', '时柱']" :key="key">
              <span class="zhi" :class="wuxingClass(result[key]?.地支?.五行)">
                {{ result[key]?.地支?.地支 }}
              </span>
            </td>
          </tr>
          <tr>
            <td class="row-label">藏干</td>
            <td v-for="key in ['年柱', '月柱', '日柱', '时柱']" :key="key">
              <div class="canggan">
                <span v-if="result[key]?.地支?.藏干?.主气" :class="wuxingClass('')">
                  {{ result[key].地支.藏干.主气.天干 }}<small>{{ result[key].地支.藏干.主气.十神 }}</small>
                </span>
                <span v-if="result[key]?.地支?.藏干?.中气">
                  {{ result[key].地支.藏干.中气.天干 }}<small>{{ result[key].地支.藏干.中气.十神 }}</small>
                </span>
                <span v-if="result[key]?.地支?.藏干?.余气">
                  {{ result[key].地支.藏干.余气.天干 }}<small>{{ result[key].地支.藏干.余气.十神 }}</small>
                </span>
              </div>
            </td>
          </tr>
          <tr>
            <td class="row-label">纳音</td>
            <td v-for="key in ['年柱', '月柱', '日柱', '时柱']" :key="key">
              <span class="nayin">{{ result[key]?.纳音 }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 补充信息 -->
      <div class="extra-info">
        <span>胎元：{{ result.胎元 }}</span>
        <span>命宫：{{ result.命宫 }}</span>
        <span>身宫：{{ result.身宫 }}</span>
      </div>

      <!-- 神煞 -->
      <div v-if="result.神煞" class="shensha-section">
        <h4>神煞</h4>
        <div class="shensha-grid">
          <div v-for="key in ['年柱', '月柱', '日柱', '时柱']" :key="key">
            <span class="shensha-label">{{ key }}：</span>
            <span class="shensha-list">{{ result.神煞[key]?.join('、') || '无' }}</span>
          </div>
        </div>
      </div>

      <!-- 大运 -->
      <div v-if="result.大运" class="dayun-section">
        <h4>大运 <small>（起运{{ result.大运.起运年龄 }}岁，{{ result.大运.起运日期 }}）</small></h4>
        <div class="dayun-scroll">
          <div v-for="(dy, i) in result.大运.大运?.slice(0, 8)" :key="i" class="dayun-item">
            <span class="dayun-age">{{ dy.起始年龄 }}岁</span>
            <span class="dayun-ganzi" :class="wuxingClass(dy.天干?.五行)">{{ dy.干支 }}</span>
            <span class="dayun-shishen">{{ dy.天干?.十神 }}</span>
            <span class="dayun-year">{{ dy.起始年份 }}年</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bazi-page { display: flex; flex-direction: column; gap: 16px; }

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 16px;
}

.form-card { padding: 20px; }
.form-row { display: flex; gap: 8px; flex-wrap: wrap; }
.form-row .form-group { flex: 1; min-width: 80px; }

.checkbox-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--text-dim); cursor: pointer;
}
.checkbox-label input { accent-color: var(--accent); }

.error-msg {
  background: var(--red-soft); border: 1px solid var(--red);
  color: #e0a0a0; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 13px;
}

.result-card { padding: 20px; }

.meta-info {
  display: flex; flex-wrap: wrap; gap: 12px;
  font-size: 12px; color: var(--text-dim); margin-bottom: 12px;
}
.true-solar-tag {
  background: var(--accent-dim); color: var(--accent);
  padding: 2px 8px; border-radius: 4px; font-size: 11px;
}

.bazi-display {
  display: flex; align-items: baseline; gap: 16px;
  margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);
}
.bazi-text { font-size: 22px; font-weight: 700; letter-spacing: 4px; color: var(--accent); }
.day-master { font-size: 13px; color: var(--text-dim); }
.day-master strong { color: var(--text); }

.pillar-table {
  width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;
}
.pillar-table th, .pillar-table td {
  padding: 8px 6px; text-align: center; border: 1px solid var(--border);
}
.pillar-table th {
  background: var(--accent-dim); color: var(--accent); font-weight: 600; font-size: 12px;
}
.pillar-table td { background: var(--bg); }
.row-label { font-weight: 600; color: var(--text-dim); font-size: 12px; white-space: nowrap; }
.gan, .zhi { font-size: 20px; font-weight: 700; display: block; }
.shishen { font-size: 11px; color: var(--text-dim); display: block; margin-top: 2px; }
.canggan { font-size: 12px; }
.canggan span { display: block; margin: 2px 0; }
.canggan small { color: var(--text-dim); margin-left: 2px; }
.nayin { font-size: 11px; color: var(--text-dim); }

.extra-info {
  display: flex; flex-wrap: wrap; gap: 16px;
  font-size: 13px; color: var(--text-dim); margin-bottom: 16px;
}

.shensha-section, .dayun-section {
  margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);
}
.shensha-section h4, .dayun-section h4 {
  font-size: 14px; color: var(--accent); margin-bottom: 8px;
}
.shensha-section h4 small, .dayun-section h4 small {
  font-size: 12px; color: var(--text-dim); font-weight: 400;
}
.shensha-grid { font-size: 12px; }
.shensha-grid > div { margin-bottom: 4px; }
.shensha-label { color: var(--text-dim); }
.shensha-list { color: var(--text); }

.dayun-scroll {
  display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px;
}
.dayun-item {
  flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 14px; background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-sm); font-size: 12px; min-width: 70px;
}
.dayun-age { color: var(--text-dim); }
.dayun-ganzi { font-size: 16px; font-weight: 700; }
.dayun-shishen { color: var(--text-dim); font-size: 11px; }
.dayun-year { color: var(--text-muted); font-size: 11px; }
</style>
