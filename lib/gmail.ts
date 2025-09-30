import { google } from 'googleapis'
import { prisma } from './prisma'

export class GmailService {
  private gmail: any
  private userId: string

  constructor(userId: string, accessToken: string) {
    this.userId = userId
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ access_token: accessToken })
    this.gmail = google.gmail({ version: 'v1', auth })
  }

  static async createForUser(userId: string): Promise<GmailService> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true }
    })

    if (!user?.accounts?.[0]?.access_token) {
      throw new Error('Gmail not connected for this user. Please sign in with Google to connect your Gmail account.')
    }

    return new GmailService(userId, user.accounts[0].access_token)
  }

  // New method to create Gmail service with session token
  static async createForUserWithSession(userId: string, sessionToken: string): Promise<GmailService> {
    try {
      // First try with session token
      const gmailService = new GmailService(userId, sessionToken)
      // Test the connection by making a simple request
      await gmailService.gmail.users.getProfile({ userId: 'me' })
      return gmailService
    } catch (error) {
      console.warn('Session token failed, falling back to database token:', error)
      // Fall back to database token
      return await GmailService.createForUser(userId)
    }
  }

  async getMessages(query = '', maxResults = 50) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      })

      const messages = []
      for (const message of response.data.messages || []) {
        const messageData = await this.getMessage(message.id)
        if (messageData) {
          messages.push(messageData)
        }
      }

      return messages
    } catch (error: any) {
      console.error('Error fetching Gmail messages:', error)
      
      // If it's an authentication error, try to refresh the token
      if (error.status === 401 || error.code === 401) {
        console.log('Authentication error, attempting to refresh token...')
        try {
          await this.refreshToken()
          // Retry the request with refreshed token
          const response = await this.gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults
          })

          const messages = []
          for (const message of response.data.messages || []) {
            const messageData = await this.getMessage(message.id)
            if (messageData) {
              messages.push(messageData)
            }
          }

          return messages
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError)
          throw new Error('Gmail authentication failed. Please reconnect your Gmail account.')
        }
      }
      
      throw error
    }
  }

  async getMessage(messageId: string) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })

      const message = response.data
      const headers = message.payload?.headers || []
      
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

      const subject = getHeader('Subject')
      const from = getHeader('From')
      const to = getHeader('To')
      const date = getHeader('Date')
      
      // Extract body text
      let body = ''
      if (message.payload?.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString()
      } else if (message.payload?.parts) {
        body = this.extractBodyFromParts(message.payload.parts)
      }

      return {
        id: messageId,
        subject,
        from,
        to,
        date: new Date(date),
        body: body.replace(/\n/g, ' ').substring(0, 10000) // Limit body size
      }
    } catch (error) {
      console.error('Error fetching Gmail message:', error)
      return null
    }
  }

  private extractBodyFromParts(parts: any[]): string {
    let body = ''
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body += Buffer.from(part.body.data, 'base64').toString()
      } else if (part.parts) {
        body += this.extractBodyFromParts(part.parts)
      }
    }
    return body
  }

  async sendEmail(to: string, subject: string, body: string) {
    try {
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n')

      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      })

      return response.data
    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  }

  async searchMessages(query: string, maxResults = 50) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      })

      const messages = []
      for (const message of response.data.messages || []) {
        const messageData = await this.getMessage(message.id)
        if (messageData) {
          messages.push(messageData)
        }
      }

      return messages
    } catch (error) {
      console.error('Error searching Gmail messages:', error)
      throw error
    }
  }

  async refreshToken(): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: this.userId },
      include: { accounts: true }
    })

    if (!user?.accounts?.[0]?.refresh_token) {
      throw new Error('No refresh token available')
    }

    try {
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )

      auth.setCredentials({
        refresh_token: user.accounts[0].refresh_token
      })

      const { credentials } = await auth.refreshAccessToken()
      
      // Update account with new tokens
      await prisma.account.update({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: user.accounts[0].providerAccountId
          }
        },
        data: {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token,
          expires_at: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : null
        }
      })

      this.gmail = google.gmail({ version: 'v1', auth })
      return credentials.access_token!
    } catch (error) {
      console.error('Error refreshing Gmail token:', error)
      throw error
    }
  }
}
