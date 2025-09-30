import { google } from 'googleapis'
import { prisma } from './prisma'

export class CalendarService {
  private calendar: any
  private userId: string

  constructor(userId: string, accessToken: string) {
    this.userId = userId
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    this.calendar = google.calendar({ version: 'v3', auth })
  }

  static async createForUser(userId: string): Promise<CalendarService> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true }
    })

    if (!user?.accounts?.[0]?.access_token) {
      throw new Error('Calendar not connected for this user')
    }

    return new CalendarService(userId, user.accounts[0].access_token)
  }

  async getEvents(timeMin?: Date, timeMax?: Date, maxResults = 50) {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin?.toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      })

      return response.data.items || []
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      throw error
    }
  }

  async getUpcomingEvents(days = 30) {
    const timeMin = new Date()
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + days)

    return this.getEvents(timeMin, timeMax)
  }

  async getAvailableSlots(startDate: Date, endDate: Date, durationMinutes = 60) {
    try {
      const events = await this.getEvents(startDate, endDate)
      const busySlots = events.map((event: any) => ({
        start: new Date(event.start?.dateTime || event.start?.date),
        end: new Date(event.end?.dateTime || event.end?.date)
      }))

      // Generate available slots
      const availableSlots = []
      const current = new Date(startDate)
      const end = new Date(endDate)

      while (current < end) {
        const slotStart = new Date(current)
        const slotEnd = new Date(current.getTime() + durationMinutes * 60000)

        // Check if this slot conflicts with any busy time
        const isAvailable = !busySlots.some((busy: any) => 
          (slotStart < busy.end && slotEnd > busy.start)
        )

        if (isAvailable && slotEnd <= end) {
          availableSlots.push({
            start: slotStart,
            end: slotEnd
          })
        }

        current.setHours(current.getHours() + 1) // Check every hour
      }

      return availableSlots
    } catch (error) {
      console.error('Error getting available slots:', error)
      throw error
    }
  }

  async createEvent(eventData: {
    summary: string
    description?: string
    start: { dateTime: string; timeZone?: string }
    end: { dateTime: string; timeZone?: string }
    attendees?: Array<{ email: string }>
  }) {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          ...eventData,
          attendees: eventData.attendees || []
        }
      })

      return response.data
    } catch (error) {
      console.error('Error creating calendar event:', error)
      throw error
    }
  }

  async updateEvent(eventId: string, eventData: any) {
    try {
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: eventData
      })

      return response.data
    } catch (error) {
      console.error('Error updating calendar event:', error)
      throw error
    }
  }

  async deleteEvent(eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId
      })

      return true
    } catch (error) {
      console.error('Error deleting calendar event:', error)
      throw error
    }
  }

  async searchEvents(query: string, timeMin?: Date, timeMax?: Date) {
    try {
      const events = await this.getEvents(timeMin, timeMax, 100)
      
      return events.filter((event: any) => 
        event.summary?.toLowerCase().includes(query.toLowerCase()) ||
        event.description?.toLowerCase().includes(query.toLowerCase())
      )
    } catch (error) {
      console.error('Error searching calendar events:', error)
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

      this.calendar = google.calendar({ version: 'v3', auth })
      return credentials.access_token!
    } catch (error) {
      console.error('Error refreshing Calendar token:', error)
      throw error
    }
  }
}
