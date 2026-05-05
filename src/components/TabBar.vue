<script setup lang="ts">
const model = defineModel<'bazi' | 'calendar' | 'fortune' | 'chat'>()

const tabs = [
  { key: 'bazi', label: '排盘' },
  { key: 'calendar', label: '黄历' },
  { key: 'fortune', label: '流运' },
  { key: 'chat', label: 'AI' },
] as const
</script>

<template>
  <nav class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-item"
      :class="{ active: model === tab.key }"
      @click="model = tab.key"
    >
      <span class="tab-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tab-bar {
  display: flex;
  border-top: 1px solid var(--border);
  background: var(--card);
  flex-shrink: 0;
  padding: 4px 0;
  padding-bottom: env(safe-area-inset-bottom, 4px);
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 4px;
  border: none;
  background: none;
  color: var(--text-dim);
  cursor: pointer;
  font-family: inherit;
  transition: color 0.2s;
}
.tab-item.active { color: var(--accent); }
.tab-item:hover:not(.active) { color: var(--text); }
.tab-label { font-size: 14px; font-weight: 600; }

@media (min-width: 768px) {
  .tab-bar {
    border-top: none;
    border-bottom: 1px solid var(--border);
    padding: 0 16px;
    gap: 4px;
    justify-content: center;
    order: -1;
  }
  .tab-item {
    flex: none;
    flex-direction: row;
    gap: 6px;
    padding: 12px 24px;
    border-bottom: 2px solid transparent;
    border-radius: 0;
  }
  .tab-item.active { border-bottom-color: var(--accent); }
  .tab-icon { font-size: 14px; }
  .tab-label { font-size: 14px; }
}
</style>
