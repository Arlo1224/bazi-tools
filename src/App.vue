<script setup lang="ts">
import { ref } from 'vue'
import TabBar from './components/TabBar.vue'
import BaziPage from './components/BaziPage.vue'
import CasesPage from './components/CasesPage.vue'
import CalendarView from './components/CalendarView.vue'
import ChatPanel from './components/ChatPanel.vue'
import SettingsDrawer from './components/SettingsDrawer.vue'

const activeTab = ref<'bazi' | 'cases' | 'calendar' | 'chat'>('bazi')
const showSettings = ref(false)

// 排盘结果，供多个 Tab 共享
const baziResult = ref<any>(null)

function onCaseSelect(result: any, _name: string) {
  baziResult.value = result
  activeTab.value = 'bazi'
}
</script>

<template>
  <header class="app-header">
    <h1>诗心闲堂</h1>
    <button class="header-btn" @click="showSettings = true" title="设置">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  </header>

  <main class="page-content">
    <BaziPage v-if="activeTab === 'bazi'" v-model:result="baziResult" :loaded-result="baziResult" />
    <CasesPage v-else-if="activeTab === 'cases'" @select="onCaseSelect" />
    <CalendarView v-else-if="activeTab === 'calendar'" />
    <ChatPanel v-else-if="activeTab === 'chat'" :bazi-result="baziResult" />
  </main>

  <TabBar v-model="activeTab" />
  <SettingsDrawer v-model:visible="showSettings" />
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.app-header h1 {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 2px;
}
.header-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: color 0.2s;
}
.header-btn:hover { color: var(--accent); }

@media (min-width: 768px) {
  .app-header {
    padding: 16px 24px;
  }
  .app-header h1 {
    font-size: 22px;
  }
}
</style>
