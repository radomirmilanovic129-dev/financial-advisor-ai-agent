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

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      // Redirect to HubSpot OAuth
      const authUrl = new URL('https://app.hubspot.com/oauth/authorize')
      authUrl.searchParams.set('client_id', process.env.HUBSPOT_CLIENT_ID!)
      authUrl.searchParams.set('scope', 'crm.objects.contacts.read crm.objects.contacts.write crm.objects.contacts.notes.read crm.objects.contacts.notes.write')
      authUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/hubspot/connect`)
      authUrl.searchParams.set('response_type', 'code')

      return NextResponse.redirect(authUrl.toString())
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/hubspot/connect`,
        code,
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error(`HubSpot OAuth error: ${tokens.error_description}`)
    }

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

    // Update user with HubSpot tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hubspotAccessToken: tokens.access_token,
        hubspotRefreshToken: tokens.refresh_token,
        hubspotTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        hubspotConnectedAt: new Date()
      }
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?hubspot=connected`)
  } catch (error) {
    console.error('Error connecting HubSpot:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?hubspot=error`)
  }
}
