<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { buildBaziFromSolar, SolarDay, LunarHour } from 'cantian-tymext'
import { useCities } from '@/composables/useCities'
import { calcTrueSolarTime, formatTime } from '@/lib/trueSolarTime'

const emit = defineEmits<{ 'update:result': [val: any] }>()

const { loadCities, provinceList, getCities, findCity } = useCities()

// ── 表单状态 ──
const personName = ref('')
const birthYear = ref(1990)
const birthMonth = ref(6)
const birthDay = ref(15)
const birthHour = ref(8)
const birthMinute = ref(30)
const province = ref('安徽省')
const city = ref('芜湖')
const gender = ref<0 | 1>(1)
const useTrueSolar = ref(true)

// ── 排盘结果 / 存档 ──
const result = ref<any>(null)
const error = ref('')
const archives = ref<any[]>([])

// ── 流运状态 ──
const fortuneLevel = ref<'year' | 'month' | 'day' | 'hour'>('year')
const fStartYear = ref(new Date().getFullYear())
const fMonth = ref(new Date().getMonth() + 1)
const fDay = ref(new Date().getDate())
const fRangeYears = ref(10)

const cityList = computed(() => getCities(province.value))
const maxDays = computed(() => new Date(birthYear.value, birthMonth.value, 0).getDate())
const fMaxDays = computed(() => new Date(fStartYear.value, fMonth.value, 0).getDate())

watch(province, () => {
  const cities = getCities(province.value)
  if (cities.length > 0) city.value = cities[0].name
})

onMounted(async () => {
  await loadCities()
  if (provinceList.value.includes('安徽省')) {
    province.value = '安徽省'
    city.value = '芜湖'
  }
  // 读取存档
  try {
    archives.value = JSON.parse(localStorage.getItem('bazi_archive') || '[]')
  } catch { archives.value = [] }
})

// ── 五行/十神工具 ──
const ganWuxingMap: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
}
const zhiWuxingMap: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水'
}
const ganYinYang: Record<string, string> = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴',
  '戊': '阳', '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴'
}

function wuxingClass(w: string) {
  const m: Record<string, string> = { '木': 'wuxing-wood', '火': 'wuxing-fire', '土': 'wuxing-earth', '金': 'wuxing-metal', '水': 'wuxing-water' }
  return m[w] || ''
}
function charWuxingClass(c: string) {
  return wuxingClass(ganWuxingMap[c] || zhiWuxingMap[c] || '')
}

function getShiShen(dm: string, t: string) {
  if (!dm || !t) return ''
  const dmWx = ganWuxingMap[dm], tWx = ganWuxingMap[t]
  if (!dmWx || !tWx) return ''
  const sameYy = ganYinYang[dm] === ganYinYang[t]
  const sheng: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
  const ke: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' }
  if (dmWx === tWx) return sameYy ? '比肩' : '劫财'
  if (sheng[dmWx] === tWx) return sameYy ? '食神' : '伤官'
  if (ke[dmWx] === tWx) return sameYy ? '偏财' : '正财'
  if (sheng[tWx] === dmWx) return sameYy ? '偏印' : '正印'
  if (ke[tWx] === dmWx) return sameYy ? '七杀' : '正官'
  return ''
}

// ── 日主 ──
const dayMaster = computed(() => result.value?.日柱?.天干?.天干 || '')

// ── 排盘 ──
function doPaipan() {
  error.value = ''
  try {
    const cityInfo = findCity(city.value)
    const longitude = cityInfo?.gpsLon ?? 120

    const inputTime = { year: birthYear.value, month: birthMonth.value, day: birthDay.value, hour: birthHour.value, minute: birthMinute.value, second: 0 }
    let solarTimeStr: string, correction = 0

    if (useTrueSolar.value) {
      const tr = calcTrueSolarTime(inputTime, longitude)
      solarTimeStr = formatTime(tr.result)
      correction = tr.correctionMinutes
    } else {
      solarTimeStr = formatTime(inputTime)
    }

    const baziResult = buildBaziFromSolar({ solarTime: solarTimeStr, sect: 2, gender: gender.value })
    result.value = {
      ...baziResult,
      _meta: { inputTime: formatTime(inputTime), trueSolarTime: solarTimeStr, correction, city: city.value, longitude, useTrueSolar: useTrueSolar.value }
    }
    emit('update:result', result.value)

    // 自动存档
    const entry = {
      id: Date.now(),
      time: new Date().toLocaleString('zh-CN'),
      name: personName.value || '未命名',
      bazi: baziResult.八字,
      dayMaster: baziResult.日主,
      solar: baziResult.阳历,
      lunar: baziResult.农历,
      gender: baziResult.性别,
      meta: result.value._meta,
      result: JSON.parse(JSON.stringify(baziResult)),
    }
    archives.value.unshift(entry)
    if (archives.value.length > 50) archives.value = archives.value.slice(0, 50)
    localStorage.setItem('bazi_archive', JSON.stringify(archives.value))
  } catch (e: any) { error.value = e.message || '排盘失败'; console.error(e) }
}

function loadArchive(item: any) {
  result.value = { ...item.result, _meta: item.meta }
  personName.value = item.name || ''
  emit('update:result', result.value)
  document.querySelector('.result-card')?.scrollIntoView({ behavior: 'smooth' })
}

function delArchive(id: number) {
  archives.value = archives.value.filter(a => a.id !== id)
  localStorage.setItem('bazi_archive', JSON.stringify(archives.value))
}

// ── 流运计算 ──
const fortuneResults = computed(() => {
  const results: any[] = []
  if (fortuneLevel.value === 'year') {
    for (let y = fStartYear.value; y < fStartYear.value + fRangeYears.value; y++) {
      try {
        const sd = SolarDay.fromYmd(y, 6, 1)
        const sc = sd.getLunarDay().getLunarMonth().getLunarYear().getSixtyCycle()
        const gz = sc.getName()
        results.push({ label: `${y}年`, gz, s0: getShiShen(dayMaster.value, gz[0]), s1: '' })
      } catch {}
    }
  } else if (fortuneLevel.value === 'month') {
    for (let m = 1; m <= 12; m++) {
      try {
        const sd = SolarDay.fromYmd(fStartYear.value, m, 15)
        const sc = sd.getLunarDay().getLunarMonth().getSixtyCycle()
        const gz = sc.getName()
        results.push({ label: `${m}月`, gz, s0: getShiShen(dayMaster.value, gz[0]), s1: '' })
      } catch {}
    }
  } else if (fortuneLevel.value === 'day') {
    for (let d = 1; d <= fMaxDays.value; d++) {
      try {
        const sd = SolarDay.fromYmd(fStartYear.value, fMonth.value, d)
        const sc = sd.getLunarDay().getSixtyCycle()
        const gz = sc.getName()
        results.push({ label: `${d}日`, gz, s0: getShiShen(dayMaster.value, gz[0]), s1: '' })
      } catch {}
    }
  } else {
    const scNames = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    for (let h = 0; h < 24; h += 2) {
      try {
        const lh = LunarHour.fromYmdHms(fStartYear.value, fMonth.value, fDay.value, h, 0, 0)
        const sc = lh.getSixtyCycle()
        const gz = sc.getName()
        results.push({ label: `${scNames[h / 2]}时`, sub: `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:59`, gz, s0: getShiShen(dayMaster.value, gz[0]), s1: '' })
      } catch {}
    }
  }
  return results
})
</script>

<template>
  <div class="bazi-page">
    <!-- ── 存档列表 ── -->
    <div v-if="archives.length > 0 && !result" class="archive-section">
      <h3 class="section-title">历史排盘</h3>
      <div class="archive-list">
        <div v-for="a in archives" :key="a.id" class="archive-item" @click="loadArchive(a)">
          <div class="archive-main">
            <span class="archive-name">{{ a.name }}</span>
            <span class="archive-bazi">{{ a.bazi }}</span>
            <span class="archive-meta">{{ a.gender }} · {{ a.solar }} · {{ a.lunar }}</span>
          </div>
          <button class="archive-del" @click.stop="delArchive(a.id)" title="删除">×</button>
        </div>
      </div>
    </div>

    <!-- ── 输入表单 ── -->
    <div class="card form-card">
      <h3 class="card-title">出生信息</h3>
      <div class="form-row">
        <div class="form-group">
          <label>姓名</label>
          <input class="form-input" v-model="personName" placeholder="选填" />
        </div>
      </div>
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
          真太阳时修正
        </label>
        <button v-if="archives.length > 0" class="btn btn-outline" style="font-size:12px; padding:6px 12px;" @click="result = null">
          查看存档 ({{ archives.length }})
        </button>
      </div>
      <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" @click="doPaipan">排盘</button>
    </div>

    <!-- 错误 -->
    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- ── 排盘结果 ── -->
    <div v-if="result" class="card result-card">
      <div class="result-header">
        <div>
          <div v-if="personName" class="person-name">{{ personName }}</div>
          <div class="meta-info">
            <span>{{ result.阳历 }}</span>
            <span>农历：{{ result.农历 }}</span>
            <span>生肖：{{ result.生肖 }}</span>
            <span v-if="result._meta.useTrueSolar" class="true-solar-tag">真太阳时（修正{{ result._meta.correction > 0 ? '+' : '' }}{{ result._meta.correction }}分）</span>
          </div>
          <div class="bazi-display">
            <span class="bazi-text">{{ result.八字 }}</span>
            <span class="day-master">日主：<strong :class="charWuxingClass(result.日主)">{{ result.日主 }}</strong>（{{ ganWuxingMap[result.日主] }}{{ ganYinYang[result.日主] }}）</span>
          </div>
        </div>
      </div>

      <!-- 四柱表格 -->
      <div class="table-scroll">
        <table class="pillar-table">
          <thead>
            <tr><th></th><th>年柱</th><th>月柱</th><th>日柱</th><th>时柱</th></tr>
          </thead>
          <tbody>
            <tr>
              <td class="row-label">天干</td>
              <td v-for="key in ['年柱','月柱','日柱','时柱']" :key="key">
                <span class="gan" :class="wuxingClass(result[key]?.天干?.五行)">{{ result[key]?.天干?.天干 }}</span>
                <span class="shishen">{{ result[key]?.天干?.十神 || '日主' }}</span>
              </td>
            </tr>
            <tr>
              <td class="row-label">地支</td>
              <td v-for="key in ['年柱','月柱','日柱','时柱']" :key="key">
                <span class="zhi" :class="wuxingClass(result[key]?.地支?.五行)">{{ result[key]?.地支?.地支 }}</span>
              </td>
            </tr>
            <tr>
              <td class="row-label">藏干</td>
              <td v-for="key in ['年柱','月柱','日柱','时柱']" :key="key">
                <div class="canggan">
                  <span v-if="result[key]?.地支?.藏干?.主气" :class="charWuxingClass(result[key].地支.藏干.主气.天干)">
                    {{ result[key].地支.藏干.主气.天干 }}<small>{{ result[key].地支.藏干.主气.十神 }}</small>
                  </span>
                  <span v-if="result[key]?.地支?.藏干?.中气" :class="charWuxingClass(result[key].地支.藏干.中气.天干)">
                    {{ result[key].地支.藏干.中气.天干 }}<small>{{ result[key].地支.藏干.中气.十神 }}</small>
                  </span>
                  <span v-if="result[key]?.地支?.藏干?.余气" :class="charWuxingClass(result[key].地支.藏干.余气.天干)">
                    {{ result[key].地支.藏干.余气.天干 }}<small>{{ result[key].地支.藏干.余气.十神 }}</small>
                  </span>
                </div>
              </td>
            </tr>
            <tr>
              <td class="row-label">纳音</td>
              <td v-for="key in ['年柱','月柱','日柱','时柱']" :key="key">
                <span class="nayin">{{ result[key]?.纳音 }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="extra-info">
        <span>胎元：{{ result.胎元 }}</span>
        <span>命宫：{{ result.命宫 }}</span>
        <span>身宫：{{ result.身宫 }}</span>
      </div>

      <!-- 神煞 -->
      <div v-if="result.神煞" class="section-block">
        <h4>神煞</h4>
        <div class="shensha-grid">
          <div v-for="key in ['年柱','月柱','日柱','时柱']" :key="key">
            <span class="shensha-label">{{ key }}：</span><span>{{ result.神煞[key]?.join('、') || '无' }}</span>
          </div>
        </div>
      </div>

      <!-- 大运 -->
      <div v-if="result.大运" class="section-block">
        <h4>大运 <small>（{{ result.大运.起运年龄 }}岁起运 · {{ result.大运.起运日期 }}）</small></h4>
        <div class="dayun-scroll">
          <div v-for="(dy, i) in result.大运.大运?.slice(0, 8)" :key="i" class="dayun-item">
            <span class="dayun-year">{{ dy.开始年份 }}–{{ dy.结束 }}</span>
            <span class="dayun-age">{{ dy.开始年龄 }}–{{ dy.结束年龄 }}岁</span>
            <span class="dayun-ganzi">
              <span :class="(dy.干支||'')[0] ? charWuxingClass((dy.干支)[0]) : ''">{{ (dy.干支||'')[0]||'' }}</span><span :class="(dy.干支||'')[1] ? charWuxingClass((dy.干支)[1]) : ''">{{ (dy.干支||'')[1]||'' }}</span>
            </span>
            <span class="dayun-shishen">{{ dy.天干十神 }}/{{ Array.isArray(dy.地支十神) ? dy.地支十神[0] : '' }}</span>
          </div>
        </div>
      </div>

      <!-- ── 流运查询 ── -->
      <div class="section-block">
        <h4>流运查询</h4>
        <div class="fortune-tabs">
          <button v-for="l in (['year','month','day','hour'] as const)" :key="l" :class="{ active: fortuneLevel === l }" @click="fortuneLevel = l">
            {{ { year: '流年', month: '流月', day: '流日', hour: '流时' }[l] }}
          </button>
        </div>
        <div class="fortune-params">
          <template v-if="fortuneLevel === 'year'">
            <select class="form-input" v-model.number="fStartYear" style="max-width:120px">
              <option v-for="y in Array.from({length:50},(_,i)=>2000+i)" :key="y" :value="y">{{ y }}年</option>
            </select>
            <select class="form-input" v-model.number="fRangeYears" style="max-width:100px">
              <option :value="5">5年</option><option :value="10">10年</option><option :value="20">20年</option>
            </select>
          </template>
          <template v-else-if="fortuneLevel === 'month'">
            <select class="form-input" v-model.number="fStartYear" style="max-width:120px">
              <option v-for="y in Array.from({length:50},(_,i)=>2000+i)" :key="y" :value="y">{{ y }}年</option>
            </select>
          </template>
          <template v-else>
            <select class="form-input" v-model.number="fStartYear" style="max-width:120px">
              <option v-for="y in Array.from({length:50},(_,i)=>2000+i)" :key="y" :value="y">{{ y }}年</option>
            </select>
            <select class="form-input" v-model.number="fMonth" style="max-width:100px">
              <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
            </select>
            <select v-if="fortuneLevel === 'hour'" class="form-input" v-model.number="fDay" style="max-width:100px">
              <option v-for="d in fMaxDays" :key="d" :value="d">{{ d }}日</option>
            </select>
          </template>
        </div>
        <div class="fortune-grid" :class="{ 'fortune-grid-dense': fortuneLevel === 'day' }">
          <div v-for="(item, i) in fortuneResults" :key="i" class="fortune-item" :class="{ 'fortune-item-sm': fortuneLevel === 'day' }">
            <span class="f-label">{{ item.label }}</span>
            <span v-if="item.sub" class="f-sub">{{ item.sub }}</span>
            <span class="f-ganzi">
              <span :class="charWuxingClass(item.gz[0])">{{ item.gz[0] }}</span><span :class="charWuxingClass(item.gz[1])">{{ item.gz[1] }}</span>
            </span>
            <span class="f-shishen">{{ item.s0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bazi-page { display: flex; flex-direction: column; gap: 16px; }

.card-title { font-size: 15px; font-weight: 600; color: var(--accent); margin-bottom: 16px; }

.form-card { padding: 20px; }
.form-row { display: flex; gap: 8px; flex-wrap: wrap; }
.form-row .form-group { flex: 1; min-width: 80px; }

.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-dim); cursor: pointer; }
.checkbox-label input { accent-color: var(--accent); }

.error-msg { background: var(--red-soft); border: 1px solid var(--red); color: #e0a0a0; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 13px; }

/* 存档 */
.section-title { font-size: 15px; color: var(--accent); margin-bottom: 12px; }
.archive-list { display: flex; flex-direction: column; gap: 6px; }
.archive-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-sm); cursor: pointer; transition: border-color 0.2s;
}
.archive-item:hover { border-color: var(--accent); }
.archive-main { display: flex; flex-direction: column; gap: 2px; }
.archive-name { font-size: 13px; font-weight: 600; color: var(--text); }
.archive-bazi { font-size: 15px; font-weight: 700; color: var(--accent); letter-spacing: 2px; }
.archive-meta { font-size: 11px; color: var(--text-dim); }
.archive-del { background: none; border: none; color: var(--text-dim); font-size: 18px; cursor: pointer; padding: 4px 8px; }
.archive-del:hover { color: var(--red); }

/* 排盘结果 */
.result-card { padding: 20px; }
.person-name { font-size: 17px; font-weight: 700; color: var(--accent); margin-bottom: 4px; }

.meta-info { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--text-dim); margin-bottom: 8px; }
.true-solar-tag { background: var(--accent-dim); color: var(--accent); padding: 2px 8px; border-radius: 4px; font-size: 11px; }

.bazi-display { display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px; }
.bazi-text { font-size: 22px; font-weight: 700; letter-spacing: 4px; color: var(--accent); }
.day-master { font-size: 13px; color: var(--text-dim); }
.day-master strong { font-size: 16px; }

.table-scroll { overflow-x: auto; margin-bottom: 16px; }
.pillar-table { width: 100%; min-width: 360px; border-collapse: collapse; font-size: 14px; }
.pillar-table th, .pillar-table td { padding: 8px 6px; text-align: center; border: 1px solid var(--border); }
.pillar-table th { background: var(--accent-dim); color: var(--accent); font-weight: 600; font-size: 12px; }
.pillar-table td { background: var(--bg); }
.row-label { font-weight: 600; color: var(--text-dim); font-size: 12px; white-space: nowrap; }
.gan, .zhi { font-size: 20px; font-weight: 700; display: block; }
.shishen { font-size: 11px; color: var(--text-dim); display: block; margin-top: 2px; }
.canggan { font-size: 12px; }
.canggan span { display: block; margin: 2px 0; }
.canggan small { color: var(--text-dim); margin-left: 2px; }
.nayin { font-size: 11px; color: var(--text-dim); }

.extra-info { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--text-dim); margin-bottom: 8px; }

.section-block { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
.section-block h4 { font-size: 14px; color: var(--accent); margin-bottom: 8px; }
.section-block h4 small { font-size: 12px; color: var(--text-dim); font-weight: 400; }

.shensha-grid { font-size: 12px; }
.shensha-grid > div { margin-bottom: 4px; }
.shensha-label { color: var(--text-dim); }

.dayun-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; }
.dayun-item {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 14px; background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-sm); font-size: 12px; min-width: 70px;
}
.dayun-age { color: var(--text-dim); }
.dayun-ganzi { font-size: 16px; font-weight: 700; }
.dayun-shishen { color: var(--text-dim); font-size: 11px; }
.dayun-year { color: var(--text-muted); font-size: 11px; }

/* 流运 */
.fortune-tabs { display: flex; gap: 4px; margin-bottom: 10px; }
.fortune-tabs button {
  flex: 1; padding: 6px; border: 1px solid var(--border); background: var(--bg);
  color: var(--text-dim); border-radius: var(--radius-sm); cursor: pointer; font-family: inherit; font-size: 12px; transition: all 0.2s;
}
.fortune-tabs button.active { background: var(--accent-dim); color: var(--accent); border-color: var(--accent-dim); }

.fortune-params { display: flex; gap: 8px; margin-bottom: 12px; }

.fortune-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 6px; }
.fortune-grid-dense { grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); }
.fortune-item {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 8px 4px; background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-sm); text-align: center;
}
.fortune-item-sm { padding: 5px 3px; }
.f-label { font-size: 10px; color: var(--text-dim); }
.f-sub { font-size: 9px; color: var(--text-muted); }
.f-ganzi { font-size: 15px; font-weight: 700; }
.fortune-item-sm .f-ganzi { font-size: 13px; }
.f-shishen { font-size: 10px; color: var(--text-dim); }
</style>
