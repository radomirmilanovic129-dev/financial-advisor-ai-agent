import { Client } from '@hubspot/api-client'
import { prisma } from './prisma'

export class HubSpotService {
  private client: Client
  private userId: string

  constructor(userId: string, accessToken: string) {
    this.userId = userId
    this.client = new Client({ accessToken })
  }

  static async createForUser(userId: string): Promise<HubSpotService> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user?.hubspotAccessToken) {
      throw new Error('HubSpot not connected for this user')
    }

    return new HubSpotService(userId, user.hubspotAccessToken)
  }

  async getContacts(limit = 100, after?: string) {
    try {
      const response = await this.client.crm.contacts.basicApi.getPage(
        limit,
        after
      )
      return response
    } catch (error) {
      console.error('Error fetching HubSpot contacts:', error)
      throw error
    }
  }

  async getContact(contactId: string) {
    try {
      const response = await this.client.crm.contacts.basicApi.getById(
        contactId,
        ['firstname', 'lastname', 'email', 'phone', 'company', 'hs_lead_status']
      )
      return response
    } catch (error) {
      console.error('Error fetching HubSpot contact:', error)
      throw error
    }
  }

  async createContact(contactData: {
    firstname?: string
    lastname?: string
    email?: string
    phone?: string
    company?: string
  }) {
    try {
      const response = await this.client.crm.contacts.basicApi.create({
        properties: contactData,
        associations: []
      })
      return response
    } catch (error) {
      console.error('Error creating HubSpot contact:', error)
      throw error
    }
  }

  async updateContact(contactId: string, properties: Record<string, any>) {
    try {
      const response = await this.client.crm.contacts.basicApi.update(contactId, {
        properties
      })
      return response
    } catch (error) {
      console.error('Error updating HubSpot contact:', error)
      throw error
    }
  }

  async createNote(contactId: string, note: string) {
    try {
      const response = await this.client.crm.objects.notes.basicApi.create({
        properties: {
          hs_note_body: note,
          hs_timestamp: new Date().toISOString(),
          hubspot_owner_id: contactId
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
          }
        ]
      })
      return response
    } catch (error) {
      console.error('Error creating HubSpot note:', error)
      throw error
    }
  }

  async searchContacts(query: string) {
    try {
      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'CONTAINS_TOKEN',
                value: query
              }
            ]
          }
        ],
        properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
        sorts: [],
        after: 0,
        limit: 10
      })
      return response
    } catch (error) {
      console.error('Error searching HubSpot contacts:', error)
      throw error
    }
  }

  async refreshToken(): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: this.userId }
    })

    if (!user?.hubspotRefreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.HUBSPOT_CLIENT_ID!,
          client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
          refresh_token: user.hubspotRefreshToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${data.error_description}`)
      }

      // Update user with new tokens
      await prisma.user.update({
        where: { id: this.userId },
        data: {
          hubspotAccessToken: data.access_token,
          hubspotRefreshToken: data.refresh_token,
          hubspotTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
        },
      })

      this.client = new Client({ accessToken: data.access_token })
      return data.access_token
    } catch (error) {
      console.error('Error refreshing HubSpot token:', error)
      throw error
    }
  }
}
