import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { accounts: true }
    })

    if (!user) {
      return NextResponse.json({
        gmail: false,
        calendar: false,
        hubspot: false
      })
    }

    // Check Gmail and Calendar (connected via Google OAuth)
    const hasGoogleAccess = user.accounts.some((account: any) => 
      account.provider === 'google' && 
      account.access_token &&
      account.scope?.includes('gmail') &&
      account.scope?.includes('calendar')
    )

    // Check HubSpot
    const hasHubSpotAccess = !!(
      user.hubspotAccessToken && 
      user.hubspotTokenExpiresAt && 
      new Date() < user.hubspotTokenExpiresAt
    )

    return NextResponse.json({
      gmail: hasGoogleAccess,
      calendar: hasGoogleAccess,
      hubspot: hasHubSpotAccess
    })
  } catch (error) {
    console.error('Error checking connection status:', error)
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
