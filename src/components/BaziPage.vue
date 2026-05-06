<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { buildBaziFromSolar, SolarDay, LunarHour } from 'cantian-tymext'
import { useCities } from '@/composables/useCities'
import { calcTrueSolarTime, formatTime } from '@/lib/trueSolarTime'

const emit = defineEmits<{ 'update:result': [val: any] }>()
const { loadCities, provinceList, getCities, findCity } = useCities()

// ── 表单 ──
const personName = ref('')
const birthYear = ref(1990); const birthMonth = ref(6); const birthDay = ref(15)
const birthHour = ref(8); const birthMinute = ref(30)
const province = ref('安徽省'); const city = ref('芜湖'); const gender = ref<0|1>(1); const useTrueSolar = ref(true)
const result = ref<any>(null); const error = ref(''); const archives = ref<any[]>([])
const selectedDayunIdx = ref<number|null>(null)
const selectedLiuNian = ref<string|null>(null); const selectedLiuNianYear = ref<number|null>(null)
const fortuneLevel = ref<'year'|'month'|'day'|'hour'>('year')
const fStartYear = ref(new Date().getFullYear()); const fMonth = ref(new Date().getMonth()+1); const fDay = ref(new Date().getDate()); const fRangeYears = ref(10)

const cityList = computed(() => getCities(province.value))
const maxDays = computed(() => new Date(birthYear.value, birthMonth.value, 0).getDate())
const fMaxDays = computed(() => new Date(fStartYear.value, fMonth.value, 0).getDate())
watch(province, () => { const cs = getCities(province.value); if (cs.length) city.value = cs[0].name })
onMounted(async () => {
  await loadCities(); if (provinceList.value.includes('安徽省')) { province.value = '安徽省'; city.value = '芜湖' }
  try { archives.value = JSON.parse(localStorage.getItem('bazi_archive')||'[]') } catch { archives.value = [] }
})

// ── 五行/十神/藏干/纳音 ──
const ganWx: Record<string,string> = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' }
const zhiWx: Record<string,string> = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' }
const ganYy: Record<string,string> = { '甲':'阳','乙':'阴','丙':'阳','丁':'阴','戊':'阳','己':'阴','庚':'阳','辛':'阴','壬':'阳','癸':'阴' }
const zhiCg: Record<string,string[]> = { '子':['癸'],'丑':['己','癸','辛'],'寅':['甲','丙','戊'],'卯':['乙'],'辰':['戊','乙','癸'],'巳':['丙','庚','戊'],'午':['丁','己'],'未':['己','丁','乙'],'申':['庚','壬','戊'],'酉':['辛'],'戌':['戊','辛','丁'],'亥':['壬','甲'] }
const nayinTable: string[] = '海中金 炉中火 大林木 路旁土 剑锋金 山头火 涧下水 城头土 白蜡金 杨柳木 泉中水 屋上土 霹雳火 松柏木 长流水 沙中金 山下火 平地木 壁上土 金箔金 覆灯火 天河水 大驿土 钗钏金 桑柘木 大溪水 沙中土 天上火 石榴木 大海水'.split(' ')
const ganSeq = '甲乙丙丁戊己庚辛壬癸'.split(''); const zhiSeq = '子丑寅卯辰巳午未申酉戌亥'.split('')
function getNayin(gz: string): string {
  if (gz.length < 2) return ''
  const gi = ganSeq.indexOf(gz[0]); const zi = zhiSeq.indexOf(gz[1]); if (gi < 0 || zi < 0) return ''
  return nayinTable[gi + zi * 10 >= 60 ? 0 : Math.floor((gi + zi * 10) / 2)] || ''
}
function wxCls(w: string) { const m: Record<string,string> = { '木':'wuxing-wood','火':'wuxing-fire','土':'wuxing-earth','金':'wuxing-metal','水':'wuxing-water' }; return m[w]||'' }
function chCls(c: string) { return wxCls(ganWx[c] || zhiWx[c] || '') }
function getSs(dm: string, t: string) {
  if (!dm||!t) return ''; const dw = ganWx[dm], tw = ganWx[t]; if (!dw||!tw) return ''
  const sy = ganYy[dm]===ganYy[t]; const sg: Record<string,string> = { '木':'火','火':'土','土':'金','金':'水','水':'木' }
  const ke: Record<string,string> = { '木':'土','火':'金','土':'水','金':'木','水':'火' }
  if (dw===tw) return sy?'比肩':'劫财'; if (sg[dw]===tw) return sy?'食神':'伤官'; if (ke[dw]===tw) return sy?'偏财':'正财'
  if (sg[tw]===dw) return sy?'偏印':'正印'; if (ke[tw]===dw) return sy?'七杀':'正官'; return ''
}
const dayMaster = computed(() => result.value?.日柱?.天干?.天干 || '')

// ── 六柱数据 ──
interface ExData { gan: string; zhi: string; ganWx: string; zhiWx: string; ganSs: string; zhiSs: string; cangGan: Array<{ gan: string; ss: string }>; nayin: string }
const extraPillars = computed(() => {
  const cols: { label: string; data: ExData }[] = []
  if (selectedLiuNian.value) {
    const g = selectedLiuNian.value; const z = g[1]||''; const cgs = (zhiCg[z]||[]).map(c => ({ gan: c, ss: getSs(dayMaster.value, c) }))
    cols.push({ label: '流年', data: { gan: g[0]||'', zhi: z, ganWx: ganWx[g[0]]||'', zhiWx: zhiWx[z]||'', ganSs: getSs(dayMaster.value, g[0]), zhiSs: '', cangGan: cgs, nayin: getNayin(g) } })
  }
  const dy = result.value?.大运?.大运?.[selectedDayunIdx.value ?? 0]
  if (dy) {
    const g = dy.干支||''; const z = g[1]||''; const cgs = (zhiCg[z]||[]).map(c => ({ gan: c, ss: getSs(dayMaster.value, c) }))
    cols.push({ label: '大运', data: { gan: g[0]||'', zhi: z, ganWx: ganWx[g[0]]||'', zhiWx: zhiWx[z]||'', ganSs: dy.天干十神||'', zhiSs: (Array.isArray(dy.地支十神)?dy.地支十神[0]:'')||'', cangGan: cgs, nayin: getNayin(g) } })
  }
  return cols
})

// ── 干支关系连线图 ──
interface RelEdge { from: number; to: number; scope: string; type: string; detail: string; el?: string }
const relationDiagram = computed(() => {
  const xch = result.value?.刑冲合会; if (!xch) return { nodes: [] as string[], edges: [] as RelEdge[] }
  // 构建所有可见的柱子列表
  const nodes: string[] = []; const idxMap: Record<string, number> = {}
  if (selectedLiuNian.value) { idxMap['流年'] = nodes.length; nodes.push('流年') }
  if (selectedDayunIdx.value != null) { idxMap['大运'] = nodes.length; nodes.push('大运') }
  for (const p of ['年','月','日','时'] as const) { idxMap[p+'柱'] = nodes.length; nodes.push(p+'柱') }

  const edges: RelEdge[] = []; const seen = new Set<string>()
  for (const p of ['年','月','日','时'] as const) {
    const pd = xch[p]; if (!pd) continue
    const fromIdx = idxMap[p+'柱']; if (fromIdx == null) continue
    const scopes = [{ key: '天干', rels: ['合','冲','刑','害'] }, { key: '地支', rels: ['合','冲','刑','害','破'] }] as const
    for (const sc of scopes) {
      const part = pd[sc.key] || {}
      for (const rel of sc.rels) {
        for (const item of (part[rel] || [])) {
          const to = item.柱+'柱'; const toIdx = idxMap[to]; if (toIdx == null) continue
          const key = [fromIdx, toIdx, sc.key, rel].sort().join('-')
          if (seen.has(key)) continue; seen.add(key)
          edges.push({ from: Math.min(fromIdx, toIdx), to: Math.max(fromIdx, toIdx), scope: sc.key, type: rel, detail: item.知识点, el: item.元素 })
        }
      }
    }
  }
  return { nodes, edges }
})

const relLineColors: Record<string, string> = { '合': '#5a8a5a', '冲': '#c05050', '刑': '#c08040', '害': '#8a5aaa', '破': '#6a6a6a' }
const svgHeight = computed(() => 40 + relationDiagram.value.edges.length * 20 + 10)

// ── 排盘 ──
function doPaipan() {
  error.value = ''; selectedDayunIdx.value = null; selectedLiuNian.value = null; selectedLiuNianYear.value = null
  try {
    const ci = findCity(city.value); const lon = ci?.gpsLon ?? 120
    const it = { year: birthYear.value, month: birthMonth.value, day: birthDay.value, hour: birthHour.value, minute: birthMinute.value, second: 0 }
    let ss: string, cor = 0
    if (useTrueSolar.value) { const tr = calcTrueSolarTime(it, lon); ss = formatTime(tr.result); cor = tr.correctionMinutes } else { ss = formatTime(it) }
    const br = buildBaziFromSolar({ solarTime: ss, sect: 2, gender: gender.value })
    result.value = { ...br, _meta: { inputTime: formatTime(it), trueSolarTime: ss, correction: cor, city: city.value, longitude: lon, useTrueSolar: useTrueSolar.value } }
    emit('update:result', result.value)
    const e = { id: Date.now(), time: new Date().toLocaleString('zh-CN'), name: personName.value||'未命名', bazi: br.八字, dayMaster: br.日主, solar: br.阳历, lunar: br.农历, gender: br.性别, meta: result.value._meta, result: JSON.parse(JSON.stringify(br)) }
    archives.value.unshift(e); if (archives.value.length > 50) archives.value = archives.value.slice(0, 50)
    localStorage.setItem('bazi_archive', JSON.stringify(archives.value))
  } catch (e: any) { error.value = e.message||'排盘失败'; console.error(e) }
}
function loadArchive(item: any) { result.value = { ...item.result, _meta: item.meta }; personName.value = item.name||''; selectedDayunIdx.value = null; selectedLiuNian.value = null; emit('update:result', result.value); document.querySelector('.result-card')?.scrollIntoView({ behavior: 'smooth' }) }
function delArchive(id: number) { archives.value = archives.value.filter(a => a.id!==id); localStorage.setItem('bazi_archive', JSON.stringify(archives.value)) }
function selDayun(i: number) { selectedDayunIdx.value = selectedDayunIdx.value===i ? null : i }
function selFortune(item: any) {
  if (fortuneLevel.value==='year') { selectedLiuNian.value = item.gz; selectedLiuNianYear.value = item.year }
  else { selectedLiuNian.value = null; selectedLiuNianYear.value = null }
}

const fortuneResults = computed(() => {
  const rs: any[] = []
  if (fortuneLevel.value==='year') { for (let y=fStartYear.value; y<fStartYear.value+fRangeYears.value; y++) { try { const gz = SolarDay.fromYmd(y,6,1).getLunarDay().getLunarMonth().getLunarYear().getSixtyCycle().getName(); rs.push({ label:`${y}年`, year:y, gz, s0:getSs(dayMaster.value,gz[0]) }) } catch {} } }
  else if (fortuneLevel.value==='month') { for (let m=1; m<=12; m++) { try { const gz = SolarDay.fromYmd(fStartYear.value,m,15).getLunarDay().getLunarMonth().getSixtyCycle().getName(); rs.push({ label:`${m}月`, gz, s0:getSs(dayMaster.value,gz[0]) }) } catch {} } }
  else if (fortuneLevel.value==='day') { for (let d=1; d<=fMaxDays.value; d++) { try { const gz = SolarDay.fromYmd(fStartYear.value,fMonth.value,d).getLunarDay().getSixtyCycle().getName(); rs.push({ label:`${d}日`, gz, s0:getSs(dayMaster.value,gz[0]) }) } catch {} } }
  else { const sn = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']; for (let h=0; h<24; h+=2) { try { const gz = LunarHour.fromYmdHms(fStartYear.value,fMonth.value,fDay.value,h,0,0).getSixtyCycle().getName(); rs.push({ label:`${sn[h/2]}时`, sub:`${String(h).padStart(2,'0')}:00-${String(h+1).padStart(2,'0')}:59`, gz, s0:getSs(dayMaster.value,gz[0]) }) } catch {} } }
  return rs
})
</script>

<template>
  <div class="bazi-page">
    <!-- 存档 -->
    <div v-if="archives.length>0 && !result" class="archive-section">
      <h3 class="section-title">历史排盘</h3>
      <div class="archive-list">
        <div v-for="a in archives" :key="a.id" class="archive-item" @click="loadArchive(a)">
          <div class="archive-main"><span class="archive-name">{{ a.name }}</span><span class="archive-bazi">{{ a.bazi }}</span><span class="archive-meta">{{ a.gender }} · {{ a.solar }} · {{ a.lunar }}</span></div>
          <button class="archive-del" @click.stop="delArchive(a.id)">×</button>
        </div>
      </div>
    </div>

    <!-- 表单 -->
    <div class="card form-card">
      <h3 class="card-title">出生信息</h3>
      <div class="form-row"><div class="form-group"><label>姓名</label><input class="form-input" v-model="personName" placeholder="选填"/></div></div>
      <div class="form-row">
        <div class="form-group"><label>年</label><select class="form-input" v-model.number="birthYear"><option v-for="y in Array.from({length:87},(_,i)=>2026-i)" :key="y" :value="y">{{y}}年</option></select></div>
        <div class="form-group"><label>月</label><select class="form-input" v-model.number="birthMonth"><option v-for="m in 12" :key="m" :value="m">{{m}}月</option></select></div>
        <div class="form-group"><label>日</label><select class="form-input" v-model.number="birthDay"><option v-for="d in maxDays" :key="d" :value="d">{{d}}日</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>时</label><select class="form-input" v-model.number="birthHour"><option v-for="h in 24" :key="h-1" :value="h-1">{{String(h-1).padStart(2,'0')}}时</option></select></div>
        <div class="form-group"><label>分</label><select class="form-input" v-model.number="birthMinute"><option v-for="m in Array.from({length:12},(_,i)=>i*5)" :key="m" :value="m">{{String(m).padStart(2,'0')}}分</option></select></div>
        <div class="form-group"><label>性别</label><select class="form-input" v-model.number="gender"><option :value="1">男</option><option :value="0">女</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>省份</label><select class="form-input" v-model="province"><option v-for="p in provinceList" :key="p" :value="p">{{p}}</option></select></div>
        <div class="form-group"><label>城市</label><select class="form-input" v-model="city"><option v-for="c in cityList" :key="c.name" :value="c.name">{{c.name}}</option></select></div>
      </div>
      <div class="form-row form-row-end">
        <label class="checkbox-label"><input type="checkbox" v-model="useTrueSolar"/>真太阳时修正</label>
        <button v-if="archives.length>0" class="btn btn-outline btn-sm" @click="result=null">查看存档({{archives.length}})</button>
      </div>
      <button class="btn btn-primary btn-full" @click="doPaipan">排盘</button>
    </div>

    <div v-if="error" class="error-msg">{{error}}</div>

    <!-- 结果 -->
    <div v-if="result" class="card result-card">
      <div v-if="personName" class="person-name">{{personName}}</div>
      <div class="meta-info">
        <span>{{result.阳历}}</span><span>农历：{{result.农历}}</span><span>生肖：{{result.生肖}}</span>
        <span v-if="result._meta.useTrueSolar" class="true-solar-tag">真太阳时（修正{{result._meta.correction>0?'+':''}}{{result._meta.correction}}分）</span>
      </div>
      <div class="bazi-display">
        <span class="bazi-text">{{result.八字}}</span>
        <span v-if="extraPillars.length" class="six-text">{{ extraPillars.map(e=>e.data.gan+e.data.zhi).join(' ') }}</span>
        <span class="day-master">日主：<strong :class="chCls(result.日主)">{{result.日主}}</strong>（{{ganWx[result.日主]}}{{ganYy[result.日主]}}）</span>
      </div>

      <!-- 柱表格 -->
      <div class="table-scroll">
        <table class="pillar-table">
          <thead><tr><th></th><th v-for="ep in extraPillars" :key="ep.label" class="th-extra">{{ep.label}}</th><th>年柱</th><th>月柱</th><th>日柱</th><th>时柱</th></tr></thead>
          <tbody>
            <tr>
              <td class="row-label">天干</td>
              <td v-for="ep in extraPillars" :key="'g'+ep.label" class="td-extra"><span class="gan" :class="wxCls(ep.data.ganWx)">{{ep.data.gan}}</span><span class="shishen">{{ep.data.ganSs}}</span></td>
              <td v-for="k in ['年柱','月柱','日柱','时柱']" :key="k"><span class="gan" :class="wxCls(result[k]?.天干?.五行)">{{result[k]?.天干?.天干}}</span><span class="shishen">{{result[k]?.天干?.十神||'日主'}}</span></td>
            </tr>
            <tr>
              <td class="row-label">地支</td>
              <td v-for="ep in extraPillars" :key="'z'+ep.label" class="td-extra"><span class="zhi" :class="wxCls(ep.data.zhiWx)">{{ep.data.zhi}}</span></td>
              <td v-for="k in ['年柱','月柱','日柱','时柱']" :key="k"><span class="zhi" :class="wxCls(result[k]?.地支?.五行)">{{result[k]?.地支?.地支}}</span></td>
            </tr>
            <tr>
              <td class="row-label">藏干</td>
              <td v-for="ep in extraPillars" :key="'cg'+ep.label" class="td-extra"><div class="canggan"><span v-for="(h,i) in ep.data.cangGan" :key="i" :class="chCls(h.gan)">{{h.gan}}<small>{{h.ss}}</small></span></div></td>
              <td v-for="k in ['年柱','月柱','日柱','时柱']" :key="k"><div class="canggan"><span v-if="result[k]?.地支?.藏干?.主气" :class="chCls(result[k].地支.藏干.主气.天干)">{{result[k].地支.藏干.主气.天干}}<small>{{result[k].地支.藏干.主气.十神}}</small></span><span v-if="result[k]?.地支?.藏干?.中气" :class="chCls(result[k].地支.藏干.中气.天干)">{{result[k].地支.藏干.中气.天干}}<small>{{result[k].地支.藏干.中气.十神}}</small></span><span v-if="result[k]?.地支?.藏干?.余气" :class="chCls(result[k].地支.藏干.余气.天干)">{{result[k].地支.藏干.余气.天干}}<small>{{result[k].地支.藏干.余气.十神}}</small></span></div></td>
            </tr>
            <tr>
              <td class="row-label">纳音</td>
              <td v-for="ep in extraPillars" :key="'ny'+ep.label" class="td-extra"><span class="nayin">{{ep.data.nayin}}</span></td>
              <td v-for="k in ['年柱','月柱','日柱','时柱']" :key="k"><span class="nayin">{{result[k]?.纳音}}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="extra-info"><span>胎元：{{result.胎元}}</span><span>命宫：{{result.命宫}}</span><span>身宫：{{result.身宫}}</span></div>

      <!-- 干支关系连线图 -->
      <div v-if="relationDiagram.edges.length>0" class="section-block">
        <h4>干支关系</h4>
        <div class="rel-legend">
          <span v-for="(clr,typ) in relLineColors" :key="typ" class="rel-legend-item"><i :style="{background:clr}"></i>{{typ}}</span>
        </div>
        <svg :viewBox="'0 0 360 '+svgHeight" class="rel-svg" :style="{height:svgHeight+'px'}">
          <!-- 节点 -->
          <g v-for="(n,ni) in relationDiagram.nodes" :key="ni">
            <rect :x="18+ni*56" y="4" width="52" height="24" rx="4" fill="var(--bg)" stroke="var(--border)" stroke-width="1"/>
            <text :x="18+ni*56+26" y="20" text-anchor="middle" fill="var(--text-dim)" font-size="10">{{n}}</text>
          </g>
          <!-- 每层一个关系，互不重叠 -->
          <g v-for="(e,ei) in relationDiagram.edges" :key="ei">
            <line :x1="18+e.from*56+26" :y1="40+ei*20" :x2="18+e.to*56+26" :y2="40+ei*20" :stroke="relLineColors[e.type]" stroke-width="1.5" :stroke-dasharray="e.type==='冲'||e.type==='刑'?'4,2':(e.type==='害'||e.type==='破'?'2,3':'none')"/>
            <line :x1="18+e.from*56+26" :y1="28" :x2="18+e.from*56+26" :y2="40+ei*20" :stroke="relLineColors[e.type]" stroke-width="0.8" :stroke-dasharray="e.type==='冲'||e.type==='刑'?'4,2':(e.type==='害'||e.type==='破'?'2,3':'none')"/>
            <line :x1="18+e.to*56+26" :y1="28" :x2="18+e.to*56+26" :y2="40+ei*20" :stroke="relLineColors[e.type]" stroke-width="0.8" :stroke-dasharray="e.type==='冲'||e.type==='刑'?'4,2':(e.type==='害'||e.type==='破'?'2,3':'none')"/>
            <text :x="18+(e.from+e.to)/2*56+26" :y="38+ei*20" text-anchor="middle" :fill="relLineColors[e.type]" font-size="9">{{e.scope}}{{e.type}} {{e.detail}}</text>
          </g>
        </svg>
      </div>

      <!-- 神煞 -->
      <div v-if="result.神煞" class="section-block"><h4>神煞</h4><div class="shensha-grid"><div v-for="k in ['年柱','月柱','日柱','时柱']" :key="k"><span class="shensha-label">{{k}}：</span><span>{{result.神煞[k]?.join('、')||'无'}}</span></div></div></div>

      <!-- 大运 -->
      <div v-if="result.大运" class="section-block">
        <h4>大运 <small>（{{result.大运.起运年龄}}岁起运 · {{result.大运.起运日期}}）点选展开六柱</small></h4>
        <div class="dayun-scroll">
          <div v-for="(dy,i) in result.大运.大运?.slice(0,8)" :key="i" class="dayun-item" :class="{'dayun-sel':selectedDayunIdx===Number(i)}" @click="selDayun(Number(i))">
            <span class="dayun-year">{{dy.开始年份}}–{{dy.结束}}</span><span class="dayun-age">{{dy.开始年龄}}–{{dy.结束年龄}}岁</span>
            <span class="dayun-ganzi"><span :class="chCls((dy.干支||'')[0])">{{(dy.干支||'')[0]||''}}</span><span :class="chCls((dy.干支||'')[1])">{{(dy.干支||'')[1]||''}}</span></span>
            <span class="dayun-shishen">{{dy.天干十神}}/{{Array.isArray(dy.地支十神)?dy.地支十神[0]:''}}</span>
          </div>
        </div>
      </div>

      <!-- 流运 -->
      <div class="section-block">
        <h4>流运查询</h4>
        <div class="fortune-tabs"><button v-for="l in (['year','month','day','hour'] as const)" :key="l" :class="{active:fortuneLevel===l}" @click="fortuneLevel=l">{{{year:'流年',month:'流月',day:'流日',hour:'流时'}[l]}}</button></div>
        <div class="fortune-params">
          <template v-if="fortuneLevel==='year'"><select class="form-input" v-model.number="fStartYear" style="max-width:120px"><option v-for="y in Array.from({length:50},(_,i)=>2000+i)" :key="y" :value="y">{{y}}年</option></select><select class="form-input" v-model.number="fRangeYears" style="max-width:100px"><option :value="5">5年</option><option :value="10">10年</option><option :value="20">20年</option></select></template>
          <template v-else-if="fortuneLevel==='month'"><select class="form-input" v-model.number="fStartYear" style="max-width:120px"><option v-for="y in Array.from({length:50},(_,i)=>2000+i)" :key="y" :value="y">{{y}}年</option></select></template>
          <template v-else><select class="form-input" v-model.number="fStartYear" style="max-width:120px"><option v-for="y in Array.from({length:50},(_,i)=>2000+i)" :key="y" :value="y">{{y}}年</option></select><select class="form-input" v-model.number="fMonth" style="max-width:100px"><option v-for="m in 12" :key="m" :value="m">{{m}}月</option></select><select v-if="fortuneLevel==='hour'" class="form-input" v-model.number="fDay" style="max-width:100px"><option v-for="d in fMaxDays" :key="d" :value="d">{{d}}日</option></select></template>
          <span v-if="selectedLiuNian&&fortuneLevel==='year'" class="liunian-tag">已选：{{selectedLiuNianYear}}年 {{selectedLiuNian}} → 展开六柱</span>
        </div>
        <div class="fortune-grid" :class="{'fortune-grid-dense':fortuneLevel==='day'}">
          <div v-for="(item,i) in fortuneResults" :key="i" class="fortune-item" :class="{'fortune-item-sm':fortuneLevel==='day','fortune-sel':fortuneLevel==='year'&&selectedLiuNian===item.gz}" @click="selFortune(item)">
            <span class="f-label">{{item.label}}</span><span v-if="item.sub" class="f-sub">{{item.sub}}</span>
            <span class="f-ganzi"><span :class="chCls(item.gz[0])">{{item.gz[0]}}</span><span :class="chCls(item.gz[1])">{{item.gz[1]}}</span></span>
            <span class="f-shishen">{{item.s0}}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bazi-page{display:flex;flex-direction:column;gap:16px}.card-title{font-size:15px;font-weight:600;color:var(--accent);margin-bottom:16px}.form-card{padding:20px}.form-row{display:flex;gap:8px;flex-wrap:wrap}.form-row .form-group{flex:1;min-width:80px}.form-row-end{align-items:center;gap:12px;margin-top:4px}.checkbox-label{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-dim);cursor:pointer}.checkbox-label input{accent-color:var(--accent)}.btn-sm{font-size:12px;padding:6px 12px}.btn-full{width:100%;margin-top:16px}.error-msg{background:var(--red-soft);border:1px solid var(--red);color:#e0a0a0;padding:12px 16px;border-radius:var(--radius-sm);font-size:13px}
.archive-section{margin-bottom:4px}.archive-list{display:flex;flex-direction:column;gap:6px}.archive-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;transition:border-color .2s}.archive-item:hover{border-color:var(--accent)}.archive-main{display:flex;flex-direction:column;gap:2px}.archive-name{font-size:13px;font-weight:600;color:var(--text)}.archive-bazi{font-size:15px;font-weight:700;color:var(--accent);letter-spacing:2px}.archive-meta{font-size:11px;color:var(--text-dim)}.archive-del{background:none;border:none;color:var(--text-dim);font-size:18px;cursor:pointer;padding:4px 8px}.archive-del:hover{color:var(--red)}
.result-card{padding:20px}.person-name{font-size:17px;font-weight:700;color:var(--accent);margin-bottom:4px}.meta-info{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--text-dim);margin-bottom:8px}.true-solar-tag{background:var(--accent-dim);color:var(--accent);padding:2px 8px;border-radius:4px;font-size:11px}.bazi-display{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:16px}.bazi-text{font-size:22px;font-weight:700;letter-spacing:4px;color:var(--accent)}.six-text{font-size:16px;font-weight:600;color:var(--text);letter-spacing:2px}.day-master{font-size:13px;color:var(--text-dim)}.day-master strong{font-size:16px}
.table-scroll{overflow-x:auto;margin-bottom:16px}.pillar-table{width:100%;min-width:360px;border-collapse:collapse;font-size:14px}.pillar-table td,.pillar-table th{padding:8px 6px;text-align:center;border:1px solid var(--border)}.pillar-table th{background:var(--accent-dim);color:var(--accent);font-weight:600;font-size:12px}.pillar-table td{background:var(--bg)}.th-extra{background:var(--accent-dim);color:#e0a060}.td-extra{background:#1f1f18!important}.row-label{font-weight:600;color:var(--text-dim);font-size:12px;white-space:nowrap}.gan,.zhi{font-size:20px;font-weight:700;display:block}.shishen{font-size:11px;color:var(--text-dim);display:block;margin-top:2px}.canggan{font-size:12px}.canggan span{display:block;margin:2px 0}.canggan small{color:var(--text-dim);margin-left:2px}.nayin{font-size:11px;color:var(--text-dim)}.extra-info{display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:var(--text-dim);margin-bottom:8px}
.section-block{margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}.section-block h4{font-size:14px;color:var(--accent);margin-bottom:8px}.section-block h4 small{font-size:11px;color:var(--text-muted);font-weight:400}
.rel-legend{display:flex;gap:12px;margin-bottom:8px;flex-wrap:wrap}.rel-legend-item{font-size:10px;color:var(--text-dim);display:flex;align-items:center;gap:4px}.rel-legend-item i{display:inline-block;width:16px;height:2px;border-radius:1px}.rel-svg{width:100%;overflow:visible}
.shensha-grid{font-size:12px}.shensha-label{color:var(--text-dim)}
.dayun-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px}.dayun-item{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 14px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12px;min-width:70px;cursor:pointer;transition:all .2s}.dayun-item:hover{border-color:var(--accent)}.dayun-sel{border-color:var(--accent);background:var(--accent-dim);box-shadow:0 0 8px rgba(201,169,110,.2)}.dayun-age{color:var(--text-dim)}.dayun-ganzi{font-size:16px;font-weight:700}.dayun-shishen{color:var(--text-dim);font-size:11px}.dayun-year{color:var(--text-muted);font-size:11px}
.fortune-tabs{display:flex;gap:4px;margin-bottom:10px}.fortune-tabs button{flex:1;padding:6px;border:1px solid var(--border);background:var(--bg);color:var(--text-dim);border-radius:var(--radius-sm);cursor:pointer;font-family:inherit;font-size:12px;transition:all .2s}.fortune-tabs button.active{background:var(--accent-dim);color:var(--accent);border-color:var(--accent-dim)}.fortune-params{display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap}.liunian-tag{font-size:11px;color:var(--accent);background:var(--accent-dim);padding:4px 8px;border-radius:4px}.fortune-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px}.fortune-grid-dense{grid-template-columns:repeat(auto-fill,minmax(64px,1fr))}.fortune-item{display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 4px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);text-align:center;cursor:pointer;transition:all .15s}.fortune-item:hover{border-color:var(--accent)}.fortune-sel{border-color:var(--accent);background:var(--accent-dim)}.fortune-item-sm{padding:5px 3px}.f-label{font-size:10px;color:var(--text-dim)}.f-sub{font-size:9px;color:var(--text-muted)}.f-ganzi{font-size:15px;font-weight:700}.fortune-item-sm .f-ganzi{font-size:13px}.f-shishen{font-size:10px;color:var(--text-dim)}
.section-title{font-size:15px;color:var(--accent);margin-bottom:12px}
</style>