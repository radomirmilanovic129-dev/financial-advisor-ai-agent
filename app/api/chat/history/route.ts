import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get chat messages grouped by conversation ID
    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit to last 1000 messages
    })

    // Group messages by conversation ID
    const conversationMap = new Map()
    
    messages.forEach(message => {
      const convId = message.conversationId
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, {
          id: convId,
          messages: [],
          firstMessage: message,
          lastMessage: message
        })
      }
      
      const conversation = conversationMap.get(convId)
      conversation.messages.unshift(message) // Add to beginning (oldest first)
      
      // Update last message (most recent)
      if (message.createdAt > conversation.lastMessage.createdAt) {
        conversation.lastMessage = message
      }
    })

    // Convert to array and format
    const conversations = Array.from(conversationMap.values()).map((conv, index) => {
      // Generate a more user-friendly title
      const firstUserMessage = conv.messages.find((msg: any) => msg.role === 'USER')
      const title = firstUserMessage 
        ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
        : `Conversation ${index + 1}`
      
      return {
        id: conv.id,
        date: conv.firstMessage.createdAt.toISOString().split('T')[0],
        title: title,
        messageCount: conv.messages.length,
        lastMessage: conv.lastMessage.content.substring(0, 100) + (conv.lastMessage.content.length > 100 ? '...' : ''),
        messages: conv.messages,
        createdAt: conv.firstMessage.createdAt
      }
    })

    // Sort conversations by creation date (newest first)
    conversations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error fetching chat history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { messages } = await request.json()

    // Save messages to database
    const savedMessages = await Promise.all(
      messages.map((message: any) =>
        prisma.chatMessage.create({
          data: {
            userId: user.id,
            role: message.role.toUpperCase(),
            content: message.content,
            toolCalls: message.toolCalls ? JSON.stringify(message.toolCalls) : undefined
          }
        })
      )
    )

    return NextResponse.json({ success: true, messages: savedMessages })
  } catch (error) {
    console.error('Error saving chat history:', error)
    return NextResponse.json(
      { error: 'Failed to save chat history' },
      { status: 500 }
    )
  }
}
