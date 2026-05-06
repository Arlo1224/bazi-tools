<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { buildBaziFromSolar } from 'cantian-tymext'

const emit = defineEmits<{ 'select': [result: any, name: string] }>()

const archives = ref<any[]>([])
const expanded = ref<number | null>(null)

onMounted(() => {
  try {
    archives.value = JSON.parse(localStorage.getItem('bazi_archive') || '[]')
  } catch { archives.value = [] }
})

const namedCases = computed(() => archives.value.filter(a => a.name && a.name !== '未命名'))

function delCase(id: number) {
  archives.value = archives.value.filter(a => a.id !== id)
  localStorage.setItem('bazi_archive', JSON.stringify(archives.value))
  expanded.value = null
}

function loadCase(item: any) {
  emit('select', item.result, item.name)
}

const ganWx: Record<string,string> = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' }
const zhiWx: Record<string,string> = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' }
function chCls(c: string) { const m: Record<string,string> = { '木':'wuxing-wood','火':'wuxing-fire','土':'wuxing-earth','金':'wuxing-metal','水':'wuxing-water' }; return m[ganWx[c]||zhiWx[c]||'']||'' }
</script>

<template>
  <div class="cases-page">
    <div v-if="namedCases.length === 0" class="card empty-card">
      <p>暂无案例。在排盘页面输入姓名排盘后，自动存入此处。</p>
    </div>

    <div v-else class="case-list">
      <div v-for="c in namedCases" :key="c.id" class="card case-card">
        <div class="case-header" @click="expanded = expanded === c.id ? null : c.id">
          <div class="case-info">
            <span class="case-name">{{ c.name }}</span>
            <span class="case-bazi">{{ c.bazi }}</span>
            <span class="case-meta">{{ c.gender }} · {{ c.solar }} · {{ c.lunar }}</span>
          </div>
          <div class="case-actions">
            <button class="btn btn-outline btn-xs" @click.stop="loadCase(c)">查看</button>
            <button class="case-del" @click.stop="delCase(c.id)">×</button>
          </div>
        </div>
        <div v-if="expanded === c.id" class="case-detail">
          <div class="detail-row"><span>八字：</span><span>{{ c.bazi }}</span></div>
          <div class="detail-row"><span>日主：</span><span :class="chCls(c.dayMaster||'')">{{ c.dayMaster }}</span></div>
          <div class="detail-row"><span>阳历：</span><span>{{ c.solar }}</span></div>
          <div class="detail-row"><span>农历：</span><span>{{ c.lunar }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cases-page { display: flex; flex-direction: column; gap: 12px; }
.empty-card { text-align: center; color: var(--text-dim); padding: 60px 20px; font-size: 14px; }
.case-list { display: flex; flex-direction: column; gap: 8px; }
.case-card { padding: 14px; cursor: pointer; }
.case-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.case-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.case-name { font-size: 15px; font-weight: 700; color: var(--accent); }
.case-bazi { font-size: 14px; font-weight: 600; color: var(--text); letter-spacing: 2px; }
.case-meta { font-size: 11px; color: var(--text-dim); }
.case-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.btn-xs { font-size: 11px; padding: 4px 10px; }
.case-del { background: none; border: none; color: var(--text-dim); font-size: 18px; cursor: pointer; padding: 2px 4px; }
.case-del:hover { color: var(--red); }
.case-detail { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); }
.detail-row { font-size: 12px; margin-bottom: 3px; color: var(--text-dim); }
.detail-row span + span { color: var(--text); }
</style>
