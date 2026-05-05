<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [val: boolean] }>()

const apiKey = ref(localStorage.getItem('bazi_ds_key') || '')

function saveKey() {
  const key = apiKey.value.trim()
  if (key) {
    localStorage.setItem('bazi_ds_key', key)
  } else {
    localStorage.removeItem('bazi_ds_key')
  }
  emit('update:visible', false)
}
</script>

<template>
  <Teleport to="body">
    <div class="drawer-overlay" v-if="visible" @click="emit('update:visible', false)">
      <div class="drawer" @click.stop>
        <h3>设置</h3>
        <div class="form-group">
          <label>DeepSeek API Key</label>
          <input
            class="form-input"
            type="password"
            v-model="apiKey"
            placeholder="sk-..."
          />
          <p style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">
            Key 仅存储在浏览器本地，不会上传
          </p>
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-top: 12px;" @click="saveKey">
          保存
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.drawer {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius) var(--radius) 0 0;
  padding: 24px;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
}
.drawer h3 {
  font-size: 16px;
  color: var(--accent);
  margin-bottom: 16px;
}
@media (min-width: 768px) {
  .drawer-overlay {
    align-items: center;
  }
  .drawer {
    border-radius: var(--radius);
  }
}
</style>
