import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3030

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

// Connected users map: socketId -> { userId, userName, familyId }
const connectedUsers = new Map<
  string,
  { userId: string; userName: string; familyId: string }
>()

io.on('connection', (socket) => {
  console.log(`[Chat Service] Client connected: ${socket.id}`)

  // Join a family room
  socket.on(
    'join-family',
    (data: { familyId: string; userId: string; userName: string }) => {
      const { familyId, userId, userName } = data

      // Leave previous family room if any
      const prev = connectedUsers.get(socket.id)
      if (prev && prev.familyId) {
        socket.leave(`family:${prev.familyId}`)
      }

      // Join new family room
      socket.join(`family:${familyId}`)
      connectedUsers.set(socket.id, { userId, userName, familyId })

      // Broadcast presence update to family
      io.to(`family:${familyId}`).emit('presence-update', {
        userId,
        status: 'online',
      })

      console.log(
        `[Chat Service] User ${userName} (${userId}) joined family ${familyId}`
      )
    }
  )

  // Leave a family room
  socket.on('leave-family', (data: { familyId: string }) => {
    const { familyId } = data
    socket.leave(`family:${familyId}`)

    const user = connectedUsers.get(socket.id)
    if (user) {
      io.to(`family:${familyId}`).emit('presence-update', {
        userId: user.userId,
        status: 'offline',
      })
    }

    console.log(
      `[Chat Service] Socket ${socket.id} left family ${familyId}`
    )
  })

  // Send message to family room
  socket.on(
    'send-message',
    (data: {
      familyId: string
      id: string
      senderId: string
      senderName: string
      text: string
      timestamp: string
      messageType?: string
      fileUrl?: string
      fileName?: string
      fileSize?: number
      voiceDuration?: number
      replyTo?: string | null
    }) => {
      const {
        familyId,
        id,
        senderId,
        senderName,
        text,
        timestamp,
        messageType = 'text',
        fileUrl,
        fileName,
        fileSize,
        voiceDuration,
        replyTo,
      } = data

      const message = {
        id,
        family_id: familyId,
        content: text,
        sender_id: senderId,
        sender_name: senderName,
        message_type: messageType,
        file_url: fileUrl ?? null,
        file_name: fileName ?? null,
        file_size: fileSize ?? null,
        voice_duration: voiceDuration ?? null,
        reply_to: replyTo ?? null,
        created_at: timestamp,
      }

      // Broadcast to everyone in the family room (including sender for confirmation)
      io.to(`family:${familyId}`).emit('new-message', message)

      console.log(
        `[Chat Service] Message from ${senderName} in family ${familyId}: ${text.substring(0, 50)}...`
      )
    }
  )

  // Typing start
  socket.on(
    'typing-start',
    (data: { familyId: string; userId: string; userName: string }) => {
      const { familyId, userId, userName } = data
      // Broadcast to everyone except sender
      socket.to(`family:${familyId}`).emit('user-typing', {
        userId,
        userName,
      })
    }
  )

  // Typing stop
  socket.on(
    'typing-stop',
    (data: { familyId: string; userId: string }) => {
      const { familyId, userId } = data
      socket.to(`family:${familyId}`).emit('user-stopped-typing', {
        userId,
      })
    }
  )

  // Message reaction
  socket.on(
    'message-reaction',
    (data: { familyId: string; messageId: string; userId: string; emoji: string }) => {
      const { familyId, messageId, userId, emoji } = data
      io.to(`family:${familyId}`).emit('reaction-update', {
        messageId,
        userId,
        emoji,
      })
    }
  )

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    const user = connectedUsers.get(socket.id)
    if (user) {
      // Broadcast offline status to the family
      io.to(`family:${user.familyId}`).emit('presence-update', {
        userId: user.userId,
        status: 'offline',
      })
      console.log(
        `[Chat Service] User ${user.userName} (${user.userId}) disconnected from family ${user.familyId}: ${reason}`
      )
      connectedUsers.delete(socket.id)
    } else {
      console.log(
        `[Chat Service] Client disconnected: ${socket.id} (${reason})`
      )
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`[Chat Service] USRA Chat Service running on port ${PORT}`)
})
