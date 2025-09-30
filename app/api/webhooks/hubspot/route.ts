import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FinancialAdvisorAgent } from '@/lib/agent'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verify webhook signature (implement proper verification)
    const signature = request.headers.get('x-hubspot-signature-v3')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // Store webhook event
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        userId: 'system', // You'll need to determine user from the webhook
        source: 'hubspot',
        eventType: 'contact_updated',
        data: body
      }
    })

    // Process with AI agent for all users
    const users = await prisma.user.findMany({
      where: {
        ongoingInstructions: { not: null }
      }
    })

    for (const user of users) {
      const agent = new FinancialAdvisorAgent(user.id)
      await agent.processWebhookEvent('hubspot_contact_updated', body)
    }

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processed: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing HubSpot webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
