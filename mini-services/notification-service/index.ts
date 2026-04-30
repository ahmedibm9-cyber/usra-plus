import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'

const PORT = 3031

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

// Track connected clients for demo mode
let connectedClientCount = 0
let demoInterval: ReturnType<typeof setInterval> | null = null

// Demo notification templates
const demoNotifications = [
  {
    type: 'task' as const,
    title: 'New task assigned',
    titleAr: 'مهمة جديدة مُعيَّنة',
    message: 'Ahmed assigned you "Buy Eid gifts"',
    messageAr: 'أحمد عيّن لك "شراء هدايا العيد"',
  },
  {
    type: 'family' as const,
    title: 'Family member joined',
    titleAr: 'انضمام عضو جديد',
    message: 'Khalid joined The Ahmed Family',
    messageAr: 'خالد انضم إلى عائلة أحمد',
  },
  {
    type: 'grocery' as const,
    title: 'Grocery item reminder',
    titleAr: 'تذكير بقائمة البقالة',
    message: 'Fresh Milk is still unchecked',
    messageAr: 'الحليب الطازج لم يتم تحديده بعد',
  },
  {
    type: 'task' as const,
    title: 'Task due soon',
    titleAr: 'مهمة مستحقة قريبًا',
    message: 'Clean the house is due today',
    messageAr: 'تنظيف المنزل مستحق اليوم',
  },
  {
    type: 'calendar' as const,
    title: 'Upcoming event',
    titleAr: 'حدث قادم',
    message: 'Family Dinner starts in 1 hour',
    messageAr: 'عشاء العائلة يبدأ خلال ساعة',
  },
  {
    type: 'chat' as const,
    title: 'New message',
    titleAr: 'رسالة جديدة',
    message: 'Noura sent a message in Family Chat',
    messageAr: 'نورة أرسلت رسالة في محادثة العائلة',
  },
]

function startDemoMode() {
  if (demoInterval) return
  console.log('[Notification Service] Demo mode started - sending periodic notifications')

  demoInterval = setInterval(() => {
    if (connectedClientCount === 0) {
      stopDemoMode()
      return
    }

    const demo = demoNotifications[Math.floor(Math.random() * demoNotifications.length)]
    const notification = {
      id: `demo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: demo.type,
      title: demo.title,
      titleAr: demo.titleAr,
      message: demo.message,
      messageAr: demo.messageAr,
      data: {},
      created_at: new Date().toISOString(),
    }

    // Broadcast to all connected clients
    io.emit('new-notification', notification)
    console.log(`[Notification Service] Demo notification sent: ${demo.title}`)
  }, 30000) // Every 30 seconds
}

function stopDemoMode() {
  if (demoInterval) {
    clearInterval(demoInterval)
    demoInterval = null
    console.log('[Notification Service] Demo mode stopped')
  }
}

// REST endpoint for server-side notification pushes
httpServer.on('request', (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'POST' && req.url === '/notify') {
    let body = ''
    req.on('data', (chunk: string) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const { familyId, type, title, message, data: notifData } = data

        if (!familyId || !type || !title || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing required fields: familyId, type, title, message' }))
          return
        }

        const notification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type,
          title,
          message,
          data: notifData || {},
          created_at: new Date().toISOString(),
        }

        io.to(`family:${familyId}`).emit('new-notification', notification)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, notificationId: notification.id }))
        console.log(`[Notification Service] REST notification sent to family:${familyId}: ${title}`)
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON body' }))
      }
    })
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ service: 'usra-notification-service', status: 'running', port: PORT }))
  }
})

io.on('connection', (socket: Socket) => {
  connectedClientCount++
  console.log(`[Notification Service] Client connected: ${socket.id} (total: ${connectedClientCount})`)

  // Start demo mode if first client
  if (connectedClientCount === 1) {
    startDemoMode()
  }

  // Join a family notification room
  socket.on(
    'join-family',
    (data: { familyId: string; userId: string }) => {
      const { familyId, userId } = data
      socket.join(`family:${familyId}`)
      socket.data.familyId = familyId
      socket.data.userId = userId
      console.log(`[Notification Service] User ${userId} joined family room ${familyId}`)
    }
  )

  // Leave a family notification room
  socket.on('leave-family', (data: { familyId: string }) => {
    const { familyId } = data
    socket.leave(`family:${familyId}`)
    console.log(`[Notification Service] Socket ${socket.id} left family room ${familyId}`)
  })

  // Push notification to a family room
  socket.on(
    'push-notification',
    (data: { familyId: string; type: string; title: string; message: string; data?: Record<string, unknown> }) => {
      const { familyId, type, title, message, data: notifData } = data
      const notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type,
        title,
        message,
        data: notifData || {},
        created_at: new Date().toISOString(),
      }

      io.to(`family:${familyId}`).emit('new-notification', notification)
      console.log(`[Notification Service] Socket notification to family:${familyId}: ${title}`)
    }
  )

  // Mark notification as read
  socket.on(
    'mark-read',
    (data: { notificationId: string; userId: string }) => {
      console.log(`[Notification Service] User ${data.userId} marked notification ${data.notificationId} as read`)
      // In a real app, this would update the database
      // For now, just acknowledge it
      socket.emit('notification-read', { notificationId: data.notificationId })
    }
  )

  // Mark all notifications as read for a user
  socket.on(
    'mark-all-read',
    (data: { userId: string }) => {
      console.log(`[Notification Service] User ${data.userId} marked all notifications as read`)
      // In a real app, this would update the database
      socket.emit('all-notifications-read', { userId: data.userId })
    }
  )

  // Handle disconnection
  socket.on('disconnect', (reason: string) => {
    connectedClientCount--
    console.log(`[Notification Service] Client disconnected: ${socket.id} (${reason}) (total: ${connectedClientCount})`)

    // Stop demo mode if no clients connected
    if (connectedClientCount <= 0) {
      connectedClientCount = 0
      stopDemoMode()
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`[Notification Service] USRA Notification Service running on port ${PORT}`)
})
