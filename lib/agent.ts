import OpenAI from 'openai'
import { GmailService } from './gmail'
import { HubSpotService } from './hubspot'
import { CalendarService } from './calendar'
import { RAGService } from './rag'
import { prisma } from './prisma'

export class FinancialAdvisorAgent {
  private openai: OpenAI | null = null
  private userId: string
  private rag: RAGService
  private isOpenAIAvailable: boolean = false
  private sessionToken?: string

  constructor(userId: string, sessionToken?: string) {
    this.userId = userId
    this.sessionToken = sessionToken
    this.rag = new RAGService()
    
    // Try to initialize OpenAI, but don't fail if it's not available
    try {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
      this.isOpenAIAvailable = true
    } catch (error) {
      console.warn('OpenAI not available, chat functionality will be limited:', error)
      this.isOpenAIAvailable = false
    }
  }

  private getTools() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'search_emails',
          description: 'Search through Gmail messages for specific information',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for Gmail messages'
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 10
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'search_contacts',
          description: 'Search through HubSpot contacts',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for contacts (name, email, company)'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'create_contact',
          description: 'Create a new contact in HubSpot',
          parameters: {
            type: 'object',
            properties: {
              firstname: { type: 'string' },
              lastname: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              company: { type: 'string' }
            },
            required: ['email']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'update_contact',
          description: 'Update an existing contact in HubSpot',
          parameters: {
            type: 'object',
            properties: {
              contactId: { type: 'string' },
              properties: {
                type: 'object',
                description: 'Properties to update'
              }
            },
            required: ['contactId', 'properties']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'add_contact_note',
          description: 'Add a note to a contact in HubSpot',
          parameters: {
            type: 'object',
            properties: {
              contactId: { type: 'string' },
              note: { type: 'string' }
            },
            required: ['contactId', 'note']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'send_email',
          description: 'Send an email to someone',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string' },
              subject: { type: 'string' },
              body: { type: 'string' }
            },
            required: ['to', 'subject', 'body']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'get_available_slots',
          description: 'Get available time slots for scheduling',
          parameters: {
            type: 'object',
            properties: {
              startDate: { type: 'string', format: 'date-time' },
              endDate: { type: 'string', format: 'date-time' },
              durationMinutes: { type: 'number', default: 60 }
            },
            required: ['startDate', 'endDate']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'create_calendar_event',
          description: 'Create a calendar event',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              description: { type: 'string' },
              start: { type: 'string', format: 'date-time' },
              end: { type: 'string', format: 'date-time' },
              attendees: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['summary', 'start', 'end']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'search_calendar_events',
          description: 'Search calendar events',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              timeMin: { type: 'string', format: 'date-time' },
              timeMax: { type: 'string', format: 'date-time' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'create_task',
          description: 'Create a task for later execution',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
              toolCalls: { type: 'object' },
              context: { type: 'object' }
            },
            required: ['title', 'description']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'update_task',
          description: 'Update an existing task',
          parameters: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] },
              result: { type: 'string' },
              error: { type: 'string' }
            },
            required: ['taskId']
          }
        }
      }
    ]
  }

  async processMessage(message: string, conversationHistory: any[] = []) {
    try {
      // If OpenAI is not available, provide a fallback response
      if (!this.isOpenAIAvailable || !this.openai) {
        return await this.handleFallbackResponse(message)
      }

      // Get relevant context from RAG
      const context = await this.rag.getContextForQuestion(this.userId, message)
      
      // Get user's ongoing instructions
      const user = await prisma.user.findUnique({
        where: { id: this.userId }
      })

      const systemPrompt = `You are an AI assistant for a Financial Advisor. You have access to their Gmail, Google Calendar, and HubSpot CRM.

Your capabilities:
- Answer questions about clients using information from emails and HubSpot
- Schedule appointments and manage calendar
- Send emails to clients
- Create and update contacts in HubSpot
- Create tasks that can be executed later
- Be proactive based on ongoing instructions

Ongoing Instructions: ${user?.ongoingInstructions || 'None'}

Context from emails and contacts:
${context}

Always be helpful, professional, and proactive. When scheduling appointments, always check availability first and provide multiple time options. When creating contacts, include relevant notes about the interaction.`

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ]
      

      let response
      try {
        response = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages,
          tools: this.getTools(),
          tool_choice: 'auto'
        })
        console.log('openai chat completions response: ', response)
      } catch (openaiError) {
        console.log('openaiError: ', openaiError)
        // If OpenAI fails due to geographic restrictions, use fallback
        if (openaiError && typeof openaiError === 'object' && 'code' in openaiError && openaiError.code === 'unsupported_country_region_territory') {
          console.warn('OpenAI geographic restriction detected, using fallback response')
          return await this.handleFallbackResponse(message)
        }
        throw openaiError
      }

      const messageResponse = response.choices[0].message

      // Handle tool calls
      if (messageResponse.tool_calls) {
        const toolResults = []
        
        for (const toolCall of messageResponse.tool_calls) {
          try {
            const result = await this.executeToolCall(toolCall)
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify(result)
            })
          } catch (error) {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
            })
          }
        }

        // Get final response after tool execution
        const finalResponse = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            ...messages,
            messageResponse,
            ...toolResults
          ]
        })

      // Format meeting data if it's a calendar search
      let meetingData = null
      if (messageResponse.tool_calls) {
        const calendarSearch = messageResponse.tool_calls.find(tc => 
          tc.function.name === 'search_calendar_events'
        )
        if (calendarSearch) {
          const calendarResult = toolResults.find(tr => 
            tr.tool_call_id === calendarSearch.id
          )
          if (calendarResult) {
            const result = JSON.parse(calendarResult.content)
            if (result && !result.error) {
              meetingData = result.map((event: any) => ({
                title: event.summary || 'Untitled Event',
                date: new Date(event.start?.dateTime || event.start?.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                }),
                time: new Date(event.start?.dateTime || event.start?.date).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }),
                attendees: event.attendees?.map((a: any) => a.email?.split('@')[0] || 'Unknown') || []
              }))
            }
          }
        }
      }

      return {
        content: finalResponse.choices[0].message.content,
        toolCalls: messageResponse.tool_calls,
        toolResults,
        meetingData
      }
    }

    return {
      content: messageResponse.content,
      toolCalls: null,
      toolResults: []
    }
    } catch (error) {
      console.error('Error processing message:', error)
      
      // If it's a geographic restriction error, provide fallback
      if (error && typeof error === 'object' && 'code' in error && error.code === 'unsupported_country_region_territory') {
        return await this.handleFallbackResponse(message)
      }
      
      throw error
    }
  }

  private async handleFallbackResponse(message: string) {
    try {
      // Get relevant context from RAG (this will use text search fallback)
      const context = await this.rag.getContextForQuestion(this.userId, message)
      
      // Get user's ongoing instructions
      const user = await prisma.user.findUnique({
        where: { id: this.userId }
      })

      // Simple keyword-based response generation
      const lowerMessage = message.toLowerCase()
      
      let response = "I understand you're asking about: " + message + "\n\n"
      
      if (context) {
        response += "Based on your data, here's what I found:\n" + context + "\n\n"
      }
      
      if (user?.ongoingInstructions) {
        response += "Your ongoing instructions: " + user.ongoingInstructions + "\n\n"
      }
      
      // Add basic functionality suggestions
      response += "I can help you with:\n"
      response += "• Searching through your emails\n"
      response += "• Managing your contacts\n"
      response += "• Scheduling appointments\n"
      response += "• Sending emails\n\n"
      response += "Note: AI-powered features are currently limited due to regional restrictions. Basic functionality is still available."
      
      return {
        content: response,
        toolCalls: [],
        usage: { total_tokens: 0 }
      }
    } catch (error) {
      console.error('Error in fallback response:', error)
      return {
        content: "I'm sorry, I'm experiencing technical difficulties. Please try again later or contact support.",
        toolCalls: [],
        usage: { total_tokens: 0 }
      }
    }
  }

  private async executeToolCall(toolCall: any) {
    const { name, arguments: args } = toolCall.function
    const parsedArgs = JSON.parse(args)

    switch (name) {
      case 'search_emails':
        let gmail
        if (this.sessionToken) {
          try {
            gmail = await GmailService.createForUserWithSession(this.userId, this.sessionToken)
          } catch (error) {
            console.warn('Failed to create Gmail service with session token, falling back to database token:', error)
            gmail = await GmailService.createForUser(this.userId)
          }
        } else {
          gmail = await GmailService.createForUser(this.userId)
        }
        return await gmail.searchMessages(parsedArgs.query, parsedArgs.maxResults)

      case 'search_contacts':
        const hubspot = await HubSpotService.createForUser(this.userId)
        return await hubspot.searchContacts(parsedArgs.query)

      case 'create_contact':
        const hubspotCreate = await HubSpotService.createForUser(this.userId)
        return await hubspotCreate.createContact(parsedArgs)

      case 'update_contact':
        const hubspotUpdate = await HubSpotService.createForUser(this.userId)
        return await hubspotUpdate.updateContact(parsedArgs.contactId, parsedArgs.properties)

      case 'add_contact_note':
        const hubspotNote = await HubSpotService.createForUser(this.userId)
        return await hubspotNote.createNote(parsedArgs.contactId, parsedArgs.note)

      case 'send_email':
        let gmailSend
        if (this.sessionToken) {
          try {
            gmailSend = await GmailService.createForUserWithSession(this.userId, this.sessionToken)
          } catch (error) {
            console.warn('Failed to create Gmail service with session token, falling back to database token:', error)
            gmailSend = await GmailService.createForUser(this.userId)
          }
        } else {
          gmailSend = await GmailService.createForUser(this.userId)
        }
        return await gmailSend.sendEmail(parsedArgs.to, parsedArgs.subject, parsedArgs.body)

      case 'get_available_slots':
        const calendar = await CalendarService.createForUser(this.userId)
        return await calendar.getAvailableSlots(
          new Date(parsedArgs.startDate),
          new Date(parsedArgs.endDate),
          parsedArgs.durationMinutes
        )

      case 'create_calendar_event':
        const calendarCreate = await CalendarService.createForUser(this.userId)
        return await calendarCreate.createEvent({
          summary: parsedArgs.summary,
          description: parsedArgs.description,
          start: { dateTime: parsedArgs.start, timeZone: 'America/New_York' },
          end: { dateTime: parsedArgs.end, timeZone: 'America/New_York' },
          attendees: parsedArgs.attendees?.map((email: string) => ({ email }))
        })

      case 'search_calendar_events':
        const calendarSearch = await CalendarService.createForUser(this.userId)
        return await calendarSearch.searchEvents(
          parsedArgs.query,
          parsedArgs.timeMin ? new Date(parsedArgs.timeMin) : undefined,
          parsedArgs.timeMax ? new Date(parsedArgs.timeMax) : undefined
        )

      case 'create_task':
        return await prisma.task.create({
          data: {
            userId: this.userId,
            title: parsedArgs.title,
            description: parsedArgs.description,
            priority: parsedArgs.priority || 'MEDIUM',
            toolCalls: parsedArgs.toolCalls,
            context: parsedArgs.context
          }
        })

      case 'update_task':
        return await prisma.task.update({
          where: { id: parsedArgs.taskId },
          data: {
            status: parsedArgs.status,
            result: parsedArgs.result,
            error: parsedArgs.error,
            completedAt: parsedArgs.status === 'COMPLETED' ? new Date() : undefined
          }
        })

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }

  async processWebhookEvent(eventType: string, data: any) {
    try {
      // Check if OpenAI is available
      if (!this.isOpenAIAvailable || !this.openai) {
        console.warn('OpenAI not available for webhook processing')
        return
      }

      // Get user's ongoing instructions
      const user = await prisma.user.findUnique({
        where: { id: this.userId }
      })

      if (!user?.ongoingInstructions) return

      const prompt = `A webhook event occurred: ${eventType}
Event data: ${JSON.stringify(data, null, 2)}

Based on the ongoing instructions, should I take any action?
Ongoing Instructions: ${user.ongoingInstructions}

Respond with either:
1. "NO_ACTION" if no action is needed
2. A JSON object with the action to take, including tool calls if needed`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an AI assistant that processes webhook events and decides on actions based on ongoing instructions.' },
          { role: 'user', content: prompt }
        ]
      })

      const content = response.choices[0].message.content

      if (content === 'NO_ACTION') {
        return
      }

      try {
        const action = JSON.parse(content || '{}')
        // Execute the recommended action
        if (action.toolCalls) {
          for (const toolCall of action.toolCalls) {
            await this.executeToolCall(toolCall)
          }
        }
      } catch (parseError) {
        console.error('Error parsing webhook action:', parseError)
      }
    } catch (error) {
      console.error('Error processing webhook event:', error)
    }
  }
}
