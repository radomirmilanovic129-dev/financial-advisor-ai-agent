import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RAGService } from '@/lib/rag'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const rag = new RAGService()

    if (type === 'emails') {
      await rag.importEmails(user.id, session.accessToken)
      return NextResponse.json({ message: 'Emails imported successfully' })
    } else if (type === 'contacts') {
      await rag.importHubSpotContacts(user.id)
      return NextResponse.json({ message: 'HubSpot contacts imported successfully' })
    } else if (type === 'all') {
      await rag.importEmails(user.id, session.accessToken)
      await rag.importHubSpotContacts(user.id)
      return NextResponse.json({ message: 'All data imported successfully' })
    } else {
      return NextResponse.json({ error: 'Invalid import type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    )
  }
}
