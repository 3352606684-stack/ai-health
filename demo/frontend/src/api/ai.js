/**
 * AI 对话流式接口
 *
 * 为什么不走 utils/request.js 的 axios 实例：
 * 浏览器端 XHR 拿不到"边收边读"的响应体，只能等整个响应结束，流式就失效了。
 * 所以这里直接用 fetch + ReadableStream，token 的 header 名与 axios 实例保持一致。
 *
 * 事件格式（后端约定）：
 *   data: {"delta":"我"}
 *   data: {"error":"..."}
 *   data: {"done":true}
 */
const BASE_URL = '/api'

export async function streamChat({ content, history = [], signal, onDelta, onDone, onError }) {
  const token = localStorage.getItem('token') || ''

  let res
  try {
    res = await fetch(`${BASE_URL}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        token
      },
      body: JSON.stringify({ content, history }),
      signal
    })
  } catch (e) {
    if (e.name === 'AbortError') return onDone?.({ aborted: true, text: '' })
    return onError?.(e)
  }

  // 后端出错时返回的是普通 JSON，不是流
  if (!res.ok) {
    let msg = `请求失败（${res.status}）`
    try {
      const err = await res.json()
      msg = err.message || err.error || msg
    } catch {
      // 响应体不是 JSON，用默认文案
    }
    return onError?.(new Error(msg))
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let text = ''
  let finished = false

  try {
    while (!finished) {
      const { done, value } = await reader.read()
      if (done) break

      // stream: true 才能处理被 TCP 切断的多字节中文，否则会出乱码
      buffer += decoder.decode(value, { stream: true })

      let idx
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)

        // 一帧可能有多个 data 行，按规范拼起来
        const payload = frame
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).replace(/^ /, ''))
          .join('')
        if (!payload) continue
        if (payload === '[DONE]') {
          finished = true
          break
        }

        let obj
        try {
          obj = JSON.parse(payload)
        } catch {
          continue // 半截 JSON，丢掉等下一帧
        }

        if (obj.error) {
          onError?.(new Error(obj.error))
          finished = true
          break
        }
        if (obj.done) {
          finished = true
          break
        }
        if (obj.delta) {
          text += obj.delta
          onDelta?.(obj.delta, text)
        }
      }
    }
    onDone?.({ aborted: false, text })
  } catch (e) {
    if (e.name === 'AbortError') return onDone?.({ aborted: true, text })
    onError?.(e)
  } finally {
    try {
      await reader.cancel()
    } catch {
      // 流已经结束，取消失败无所谓
    }
  }
}
