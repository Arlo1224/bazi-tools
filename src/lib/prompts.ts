export const CHAT_SYSTEM_PROMPT = `你是一位资深命理师，精通子平法、衰旺法、调候法和盲派。你正在与用户对话，为他们分析八字命盘。

## 你的风格
- 自然对话，像朋友聊天，不要长篇大论的报告体
- 用户问什么答什么，回答简洁有力，一般不超过 200 字
- 基于命盘数据说话，不编造不臆测
- 保持谦逊，不说绝对化的断言

## 分析框架（内化使用，不直接输出标题）
- 强弱：得令得地得势三维判断
- 格局：月令取格，看透干会支
- 用神：扶抑、病药、通关、调候综合取用
- 十神：比劫/印/食伤/财/官杀在四柱的配置
- 大运：当前所处大运与命局互动
- 专项：婚姻看日支和财官，事业看官杀印食，健康看五行偏枯

## 禁止行为
- 禁止用"第一步/第二步"等结构化标题
- 禁止输出完整分析报告
- 禁止绝对化断语（如"一定发财""肯定离婚"）
- 用户没问的不主动长篇展开`

export function buildChartContext(baziResult: any): string {
  if (!baziResult) return ''

  const lines: string[] = ['## 命盘数据\n']

  lines.push(`- 阳历：${baziResult.阳历 || ''}`)
  lines.push(`- 农历：${baziResult.农历 || ''}`)
  lines.push(`- 八字：${baziResult.八字 || ''}`)
  lines.push(`- 日主：${baziResult.日主 || ''}`)
  lines.push(`- 性别：${baziResult.性别 || ''}`)
  lines.push(`- 生肖：${baziResult.生肖 || ''}`)

  // 四柱详情
  lines.push('\n### 四柱')
  lines.push('| 柱 | 天干 | 五行 | 十神 | 地支 | 藏干 |')
  lines.push('|---|---|---|---|---|---|')
  for (const key of ['年柱', '月柱', '日柱', '时柱']) {
    const pillar = baziResult[key]
    if (!pillar) continue
    const tg = pillar.天干 || {}
    const dz = pillar.地支 || {}
    const cg = dz.藏干 || {}
    const cgStr = [cg.主气?.天干, cg.中气?.天干, cg.余气?.天干].filter(Boolean).join(' ')
    lines.push(`| ${key} | ${tg.天干 || ''} | ${tg.五行 || ''}${tg.阴阳 || ''} | ${tg.十神 || '日主'} | ${dz.地支 || ''} | ${cgStr} |`)
  }

  // 纳音
  lines.push(`\n- 年柱纳音：${baziResult.年柱?.纳音 || ''}`)
  lines.push(`- 日柱纳音：${baziResult.日柱?.纳音 || ''}`)

  // 胎元命宫
  lines.push(`- 胎元：${baziResult.胎元 || ''}`)
  lines.push(`- 命宫：${baziResult.命宫 || ''}`)
  lines.push(`- 身宫：${baziResult.身宫 || ''}`)

  // 神煞
  if (baziResult.神煞) {
    lines.push('\n### 神煞')
    for (const key of ['年柱', '月柱', '日柱', '时柱']) {
      const list = baziResult.神煞[key]
      if (list && list.length > 0) {
        lines.push(`- ${key}：${list.join('、')}`)
      }
    }
  }

  // 大运
  if (baziResult.大运?.大运) {
    lines.push(`\n### 大运（起运${baziResult.大运.起运年龄}岁）`)
    for (const dy of baziResult.大运.大运.slice(0, 8)) {
      lines.push(`- ${dy.起始年龄}岁（${dy.起始年份}年）${dy.干支} ${dy.天干?.十神 || ''}`)
    }
  }

  return lines.join('\n')
}
