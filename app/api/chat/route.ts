import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FinancialAdvisorAgent } from '@/lib/agent'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, conversationId } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Generate conversation ID if not provided (new conversation)
    const currentConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name
        }
      })
    }

    // Get conversation history for this specific conversation
    const conversationHistory = await prisma.chatMessage.findMany({
      where: { 
        userId: user.id,
        conversationId: currentConversationId
      },
      orderBy: { createdAt: 'asc' },
      take: 20 // Last 20 messages
    })

    // Process message with AI agent
    const agent = new FinancialAdvisorAgent(user.id, session.accessToken)
    const response = await agent.processMessage(message, conversationHistory.map((msg: any) => ({
      role: msg.role.toLowerCase(),
      content: msg.content
    })))

    // Save user message
    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        conversationId: currentConversationId,
        role: 'USER',
        content: message
      }
    })

    // Save assistant response
    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        conversationId: currentConversationId,
        role: 'ASSISTANT',
        content: response.content || '',
        toolCalls: response.toolCalls ? JSON.parse(JSON.stringify(response.toolCalls)) : undefined
      }
    })

    return NextResponse.json({
      content: response.content,
      toolCalls: response.toolCalls,
      toolResults: (response as any).toolResults || [],
      conversationId: currentConversationId
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
