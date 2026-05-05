<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { CHAT_SYSTEM_PROMPT, buildChartContext } from '@/lib/prompts'

const props = defineProps<{ baziResult: any }>()

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
}

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const isLoading = ref(false)
const showReasoning = ref<Record<number, boolean>>({})
const chatContainer = ref<HTMLElement>()

const apiKey = computed(() => localStorage.getItem('bazi_ds_key') || '')

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  if (!apiKey.value) {
    alert('请先在设置中填入 DeepSeek API Key')
    return
  }

  if (!props.baziResult) {
    alert('请先在排盘页面完成排盘')
    return
  }

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  isLoading.value = true
  scrollToBottom()

  // 构建消息
  const chartContext = buildChartContext(props.baziResult)
  const systemMessages = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    { role: 'user', content: `以下是用户的八字命盘数据，请基于此回答用户问题：\n\n${chartContext}` },
    { role: 'assistant', content: '好的，我已经看到命盘数据了。请问您想了解哪方面？' },
  ]

  const historyMessages = messages.value.slice(0, -1).slice(-20).map(m => ({
    role: m.role,
    content: m.content,
  }))

  const allMessages = [
    ...systemMessages,
    ...historyMessages,
    { role: 'user', content: text },
  ]

  // 流式请求
  const assistantMsg: ChatMessage = { role: 'assistant', content: '', reasoning: '' }
  messages.value.push(assistantMsg)
  scrollToBottom()

  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: allMessages,
        stream: true,
        max_tokens: 4096,
      }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.error?.message || `HTTP ${resp.status}`)
    }

    const reader = resp.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()!

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6).trim()
        if (jsonStr === '[DONE]') break

        try {
          const chunk = JSON.parse(jsonStr)
          const delta = chunk.choices?.[0]?.delta
          if (!delta) continue

          if (delta.reasoning_content) {
            assistantMsg.reasoning = (assistantMsg.reasoning || '') + delta.reasoning_content
          }
          if (delta.content) {
            assistantMsg.content += delta.content
            scrollToBottom()
          }
        } catch { /* skip malformed chunk */ }
      }
    }
  } catch (e: any) {
    assistantMsg.content = `出错了：${e.message}`
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

function toggleReasoning(index: number) {
  showReasoning.value[index] = !showReasoning.value[index]
}
</script>

<template>
  <div class="chat-page">
    <div v-if="!baziResult" class="card hint-card">
      <p>请先在「排盘」页面完成排盘，再使用 AI 分析</p>
    </div>

    <template v-else>
      <!-- 消息列表 -->
      <div class="chat-messages" ref="chatContainer">
        <div v-if="messages.length === 0" class="chat-empty">
          <p>命盘已就绪，可以开始提问</p>
          <p class="suggestions">试试问：「整体运势如何」「今年事业怎么样」「婚姻感情分析」</p>
        </div>

        <div v-for="(msg, i) in messages" :key="i" class="chat-msg" :class="msg.role">
          <div class="msg-avatar">{{ msg.role === 'user' ? '问' : '答' }}</div>
          <div class="msg-body">
            <div class="msg-content" v-html="formatContent(msg.content)"></div>
            <button
              v-if="msg.reasoning"
              class="reasoning-toggle"
              @click="toggleReasoning(i)"
            >
              {{ showReasoning[i] ? '收起思考' : '查看思考过程' }}
            </button>
            <div v-if="msg.reasoning && showReasoning[i]" class="reasoning-block">
              <pre>{{ msg.reasoning }}</pre>
            </div>
          </div>
        </div>

        <div v-if="isLoading && messages[messages.length - 1]?.content === ''" class="loading-indicator">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="chat-input-bar">
        <input
          class="form-input chat-input"
          v-model="inputText"
          placeholder="输入问题..."
          @keydown.enter="sendMessage"
          :disabled="isLoading"
        />
        <button class="btn btn-primary send-btn" @click="sendMessage" :disabled="isLoading || !inputText.trim()">
          发送
        </button>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
function formatContent(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}
</script>

<style scoped>
.chat-page {
  display: flex; flex-direction: column;
  height: 100%; min-height: 0;
}
.hint-card { text-align: center; color: var(--text-dim); padding: 40px 20px; font-size: 14px; }

.chat-messages {
  flex: 1; overflow-y: auto; padding: 12px 0;
  display: flex; flex-direction: column; gap: 16px;
}
.chat-empty {
  text-align: center; color: var(--text-dim); padding: 60px 20px;
}
.chat-empty .suggestions { font-size: 12px; margin-top: 8px; color: var(--text-muted); }

.chat-msg {
  display: flex; gap: 10px; max-width: 90%;
}
.chat-msg.user { align-self: flex-end; flex-direction: row-reverse; }
.chat-msg.assistant { align-self: flex-start; }

.msg-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.chat-msg.user .msg-avatar { background: var(--accent-dim); color: var(--accent); }
.chat-msg.assistant .msg-avatar { background: var(--blue-soft); color: var(--blue); }

.msg-body { min-width: 0; }
.msg-content {
  padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.7;
  word-break: break-word;
}
.chat-msg.user .msg-content {
  background: var(--accent-dim); color: var(--text); border-bottom-right-radius: 4px;
}
.chat-msg.assistant .msg-content {
  background: var(--card); border: 1px solid var(--border); border-bottom-left-radius: 4px;
}
.msg-content :deep(strong) { color: var(--accent); }

.reasoning-toggle {
  background: none; border: none; color: var(--blue); font-size: 11px;
  cursor: pointer; margin-top: 4px; padding: 2px 0;
}
.reasoning-toggle:hover { text-decoration: underline; }
.reasoning-block {
  margin-top: 6px; padding: 10px; background: var(--blue-soft);
  border: 1px solid var(--blue); border-radius: var(--radius-sm);
  font-size: 11px; color: #8ab0d0; max-height: 200px; overflow-y: auto;
}
.reasoning-block pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-family: inherit; }

.loading-indicator {
  display: flex; gap: 4px; padding: 12px 16px;
}
.dot {
  width: 6px; height: 6px; background: var(--text-dim); border-radius: 50%;
  animation: bounce 1.4s infinite both;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.chat-input-bar {
  display: flex; gap: 8px; padding: 12px 0;
  border-top: 1px solid var(--border); flex-shrink: 0;
}
.chat-input { flex: 1; }
.send-btn { padding: 10px 16px; white-space: nowrap; }
</style>
