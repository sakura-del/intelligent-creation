import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/modules/user'

const wsRef = ref(null)
const connected = ref(false)
const onlineUsers = ref([])
const listeners = new Map()

function getWsUrl() {
  const baseUrl = import.meta.env.VITE_WS_URL || ''
  if (baseUrl) return baseUrl

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/ws`
}

function connect() {
  if (wsRef.value && wsRef.value.readyState === WebSocket.OPEN) return

  const userStore = useUserStore()
  if (!userStore.token) return

  const wsUrl = getWsUrl()
  const url = `${wsUrl}?token=${userStore.token}`

  const ws = new WebSocket(url)

  ws.onopen = () => {
    connected.value = true
    emit('connected', {})
  }

  ws.onclose = () => {
    connected.value = false
    emit('disconnected', {})
    setTimeout(() => {
      if (useUserStore().token) connect()
    }, 5000)
  }

  ws.onerror = () => {
    connected.value = false
  }

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      handleMessage(message)
    } catch {
      // ignore
    }
  }

  wsRef.value = ws
}

function handleMessage(message) {
  switch (message.type) {
    case 'connected':
      break
    case 'online_users':
      onlineUsers.value = message.users || []
      emit('online_users', message)
      break
    case 'user_online':
      if (!onlineUsers.value.find((u) => u.userId === message.userId)) {
        onlineUsers.value.push({ userId: message.userId, username: message.username })
      }
      emit('user_online', message)
      break
    case 'user_offline':
      onlineUsers.value = onlineUsers.value.filter((u) => u.userId !== message.userId)
      emit('user_offline', message)
      break
    case 'notification':
      emit('notification', message.data)
      break
    case 'room_message':
      emit('room_message', message)
      break
    case 'user_joined':
      emit('user_joined', message)
      break
    case 'user_left':
      emit('user_left', message)
      break
    case 'pong':
      emit('pong', message)
      break
    default:
      emit('message', message)
  }
}

function emit(event, data) {
  const cbs = listeners.get(event)
  if (cbs) {
    cbs.forEach((cb) => cb(data))
  }
}

function send(message) {
  if (wsRef.value && wsRef.value.readyState === WebSocket.OPEN) {
    wsRef.value.send(JSON.stringify(message))
  }
}

function disconnect() {
  if (wsRef.value) {
    wsRef.value.close()
    wsRef.value = null
    connected.value = false
  }
}

export function useWebSocket() {
  const userStore = useUserStore()

  function on(event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event).add(callback)
  }

  function off(event, callback) {
    const cbs = listeners.get(event)
    if (cbs) {
      cbs.delete(callback)
    }
  }

  function joinRoom(room) {
    send({ type: 'join_room', room })
  }

  function leaveRoom(room) {
    send({ type: 'leave_room', room })
  }

  function sendRoomMessage(room, data) {
    send({ type: 'room_message', room, data })
  }

  onMounted(() => {
    if (userStore.token) {
      connect()
    }
  })

  onUnmounted(() => {
    // keep connection alive across components
  })

  watch(
    () => userStore.token,
    (newToken) => {
      if (newToken) {
        connect()
      } else {
        disconnect()
      }
    },
  )

  return {
    connected,
    onlineUsers,
    on,
    off,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    send,
    connect,
    disconnect,
  }
}
