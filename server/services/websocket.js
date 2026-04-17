import { WebSocketServer } from 'ws'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

class WebSocketService {
  constructor() {
    this.wss = null
    this.clients = new Map()
    this.rooms = new Map()
  }

  initialize(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: (info, done) => {
        try {
          const url = new URL(info.req.url, `http://${info.req.headers.host}`)
          const token = url.searchParams.get('token')
          if (!token) {
            done(false, 401, 'Unauthorized')
            return
          }
          const decoded = jwt.verify(token, JWT_SECRET)
          info.req.user = decoded
          done(true)
        } catch {
          done(false, 401, 'Invalid token')
        }
      },
    })

    this.wss.on('connection', (ws, req) => {
      const user = req.user
      const clientId = `${user.id}_${Date.now()}`

      this.clients.set(clientId, {
        ws,
        userId: user.id,
        username: user.username || user.email || 'Unknown',
        rooms: new Set(),
        connectedAt: new Date(),
      })

      logger.info(`WebSocket connected: ${clientId} (user: ${user.id})`)

      this.broadcastToRoom(
        'online',
        {
          type: 'user_online',
          userId: user.id,
          username: user.username || user.email,
          timestamp: Date.now(),
        },
        clientId,
      )

      this.sendOnlineUsers(ws)

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(clientId, message)
        } catch (error) {
          logger.warn('Invalid WebSocket message:', error.message)
        }
      })

      ws.on('close', () => {
        const client = this.clients.get(clientId)
        if (client) {
          for (const room of client.rooms) {
            this.leaveRoom(clientId, room)
          }
          this.clients.delete(clientId)
          this.broadcastToRoom('online', {
            type: 'user_offline',
            userId: client.userId,
            timestamp: Date.now(),
          })
        }
        logger.info(`WebSocket disconnected: ${clientId}`)
      })

      ws.on('error', (error) => {
        logger.error(`WebSocket error (${clientId}):`, error.message)
      })

      ws.send(
        JSON.stringify({
          type: 'connected',
          clientId,
          timestamp: Date.now(),
        }),
      )
    })

    logger.info('WebSocket server initialized on /ws')
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId)
    if (!client) return

    switch (message.type) {
      case 'join_room':
        this.joinRoom(clientId, message.room)
        break
      case 'leave_room':
        this.leaveRoom(clientId, message.room)
        break
      case 'room_message':
        this.broadcastToRoom(
          message.room,
          {
            type: 'room_message',
            room: message.room,
            data: message.data,
            from: { userId: client.userId, username: client.username },
            timestamp: Date.now(),
          },
          clientId,
        )
        break
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() })
        break
      default:
        logger.warn(`Unknown message type: ${message.type}`)
    }
  }

  joinRoom(clientId, room) {
    const client = this.clients.get(clientId)
    if (!client) return

    client.rooms.add(room)
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set())
    }
    this.rooms.get(room).add(clientId)

    this.broadcastToRoom(
      room,
      {
        type: 'user_joined',
        room,
        userId: client.userId,
        username: client.username,
        timestamp: Date.now(),
      },
      clientId,
    )

    logger.debug(`Client ${clientId} joined room: ${room}`)
  }

  leaveRoom(clientId, room) {
    const client = this.clients.get(clientId)
    if (!client) return

    client.rooms.delete(room)
    const roomClients = this.rooms.get(room)
    if (roomClients) {
      roomClients.delete(clientId)
      if (roomClients.size === 0) {
        this.rooms.delete(room)
      }
    }

    this.broadcastToRoom(
      room,
      {
        type: 'user_left',
        room,
        userId: client.userId,
        username: client.username,
        timestamp: Date.now(),
      },
      clientId,
    )
  }

  broadcastToRoom(room, message, excludeClientId = null) {
    const roomClients = this.rooms.get(room)
    if (!roomClients) return

    const data = JSON.stringify(message)
    for (const cid of roomClients) {
      if (cid === excludeClientId) continue
      const client = this.clients.get(cid)
      if (client && client.ws.readyState === 1) {
        client.ws.send(data)
      }
    }
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId)
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message))
    }
  }

  sendToUser(userId, message) {
    for (const [_clientId, client] of this.clients) {
      if (client.userId === userId && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(message))
        return true
      }
    }
    return false
  }

  broadcastNotification(userId, notification) {
    return this.sendToUser(userId, {
      type: 'notification',
      data: notification,
      timestamp: Date.now(),
    })
  }

  sendOnlineUsers(ws) {
    const onlineUsers = []
    const seenUserIds = new Set()
    for (const [, client] of this.clients) {
      if (!seenUserIds.has(client.userId)) {
        seenUserIds.add(client.userId)
        onlineUsers.push({
          userId: client.userId,
          username: client.username,
        })
      }
    }
    ws.send(
      JSON.stringify({
        type: 'online_users',
        users: onlineUsers,
        count: onlineUsers.length,
        timestamp: Date.now(),
      }),
    )
  }

  getStats() {
    return {
      totalConnections: this.clients.size,
      uniqueUsers: new Set([...this.clients.values()].map((c) => c.userId)).size,
      rooms: Object.fromEntries(
        [...this.rooms.entries()].map(([room, clients]) => [room, clients.size]),
      ),
    }
  }
}

export const wsService = new WebSocketService()
export default wsService
