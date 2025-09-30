import { OpenAIEmbeddings } from '@langchain/openai'
import { prisma } from './prisma'
import { GmailService } from './gmail'
import { HubSpotService } from './hubspot'

export class RAGService {
  private embeddings: OpenAIEmbeddings | null = null
  private isOpenAIAvailable: boolean = false

  constructor() {
    try {
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'text-embedding-ada-002'
      })
      this.isOpenAIAvailable = true
    } catch (error) {
      console.warn('OpenAI not available, embeddings will be disabled:', error)
      this.isOpenAIAvailable = false
    }
  }

  async importEmails(userId: string, sessionToken?: string) {
    try {
      let gmail
      if (sessionToken) {
        try {
          gmail = await GmailService.createForUserWithSession(userId, sessionToken)
        } catch (error) {
          console.warn('Failed to create Gmail service with session token, falling back to database token:', error)
          gmail = await GmailService.createForUser(userId)
        }
      } else {
        gmail = await GmailService.createForUser(userId)
      }
      const messages = await gmail.getMessages('', 1000) // Import last 1000 emails

      for (const message of messages) {
        // Check if already imported
        const existing = await prisma.emailEmbedding.findUnique({
          where: { messageId: message.id }
        })

        if (existing) continue

        let embedding: number[] | null = null

        // Only create embedding if OpenAI is available
        if (this.isOpenAIAvailable && this.embeddings) {
          try {
            embedding = await this.embeddings.embedQuery(
              `Subject: ${message.subject}\nFrom: ${message.from}\nTo: ${message.to}\nBody: ${message.body}`
            )
          } catch (error) {
            console.warn('Failed to create embedding, storing without embedding:', error)
            // Continue without embedding
          }
        }

        // Store in database (with or without embedding)
        await prisma.emailEmbedding.create({
          data: {
            userId,
            messageId: message.id,
            subject: message.subject,
            from: message.from,
            to: message.to,
            body: message.body,
            date: message.date,
            embedding: embedding ? `[${embedding.join(',')}]` : null
          }
        })
      }

      console.log(`Imported ${messages.length} emails for user ${userId}${!this.isOpenAIAvailable ? ' (without embeddings)' : ''}`)
    } catch (error) {
      console.error('Error importing emails:', error)
      throw error
    }
  }

  async importHubSpotContacts(userId: string) {
    try {
      const hubspot = await HubSpotService.createForUser(userId)
      const contacts = await hubspot.getContacts(1000)

      for (const contact of contacts.results) {
        // Check if already imported
        const existing = await prisma.hubSpotContactEmbedding.findUnique({
          where: { contactId: contact.id }
        })

        if (existing) continue

        // Create contact text for embedding
        const contactText = [
          `Name: ${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`,
          `Email: ${contact.properties.email || ''}`,
          `Phone: ${contact.properties.phone || ''}`,
          `Company: ${contact.properties.company || ''}`,
          `Status: ${contact.properties.hs_lead_status || ''}`,
          `Notes: ${contact.properties.notes_last_contacted || ''}`
        ].join('\n')

        let embedding: number[] | null = null

        // Only create embedding if OpenAI is available
        if (this.isOpenAIAvailable && this.embeddings) {
          try {
            embedding = await this.embeddings.embedQuery(contactText)
          } catch (error) {
            console.warn('Failed to create embedding, storing without embedding:', error)
            // Continue without embedding
          }
        }

        // Store in database (with or without embedding)
        await prisma.hubSpotContactEmbedding.create({
          data: {
            userId,
            contactId: contact.id,
            firstName: contact.properties.firstname,
            lastName: contact.properties.lastname,
            email: contact.properties.email,
            phone: contact.properties.phone,
            company: contact.properties.company,
            notes: contact.properties.notes_last_contacted,
            properties: contact.properties,
            embedding: embedding ? `[${embedding.join(',')}]` : null
          }
        })
      }

      console.log(`Imported ${contacts.results.length} HubSpot contacts for user ${userId}${!this.isOpenAIAvailable ? ' (without embeddings)' : ''}`)
    } catch (error) {
      console.error('Error importing HubSpot contacts:', error)
      throw error
    }
  }

  async searchRelevantContext(userId: string, query: string, limit = 5) {
    try {
      // If OpenAI is not available, fall back to simple text search
      if (!this.isOpenAIAvailable || !this.embeddings) {
        return await this.simpleTextSearch(userId, query, limit)
      }

      const queryEmbedding = await this.embeddings.embedQuery(query)

      // Search emails using raw SQL with pgvector
      const emailResults = await prisma.$queryRaw`
        SELECT 
          id, 
          subject, 
          "from", 
          "to", 
          body, 
          date,
          embedding <=> ${JSON.stringify(queryEmbedding)} as distance
        FROM "EmailEmbedding" 
        WHERE "userId" = ${userId}
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}
        LIMIT ${limit}
      `

      // Search HubSpot contacts using raw SQL with pgvector
      const contactResults = await prisma.$queryRaw`
        SELECT 
          id, 
          "firstName", 
          "lastName", 
          email, 
          company, 
          notes,
          embedding <=> ${JSON.stringify(queryEmbedding)} as distance
        FROM "HubSpotContactEmbedding" 
        WHERE "userId" = ${userId}
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}
        LIMIT ${limit}
      `

      return {
        emails: (emailResults as any[]).map((email: any) => ({
          type: 'email',
          content: `Subject: ${email.subject}\nFrom: ${email.from}\nTo: ${email.to}\nBody: ${email.body}`,
          metadata: { subject: email.subject, from: email.from, date: email.date },
          score: email.distance
        })),
        contacts: (contactResults as any[]).map((contact: any) => ({
          type: 'contact',
          content: `Name: ${contact.firstName} ${contact.lastName}\nEmail: ${contact.email}\nCompany: ${contact.company}\nNotes: ${contact.notes}`,
          metadata: contact,
          score: contact.distance
        }))
      }
    } catch (error) {
      console.error('Error searching relevant context:', error)
      // Fall back to simple text search if vector search fails
      return await this.simpleTextSearch(userId, query, limit)
    }
  }

  async getContextForQuestion(userId: string, question: string) {
    const results = await this.searchRelevantContext(userId, question, 10)
    
    const context = [
      ...results.emails.map((r: any) => `Email: ${r.content}`),
      ...results.contacts.map((r: any) => `Contact: ${r.content}`)
    ].join('\n\n')

    return context
  }

  // Fallback method for when embeddings are not available
  async simpleTextSearch(userId: string, query: string, limit = 5) {
    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
      
      // Simple text search in emails
      const emailResults = await prisma.emailEmbedding.findMany({
        where: {
          userId,
          OR: searchTerms.map(term => ({
            OR: [
              { subject: { contains: term, mode: 'insensitive' } },
              { body: { contains: term, mode: 'insensitive' } },
              { from: { contains: term, mode: 'insensitive' } }
            ]
          }))
        },
        orderBy: { date: 'desc' },
        take: limit
      })

      // Simple text search in contacts
      const contactResults = await prisma.hubSpotContactEmbedding.findMany({
        where: {
          userId,
          OR: searchTerms.map(term => ({
            OR: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
              { company: { contains: term, mode: 'insensitive' } },
              { notes: { contains: term, mode: 'insensitive' } }
            ]
          }))
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      return {
        emails: emailResults.map(email => ({
          type: 'email',
          content: `Subject: ${email.subject}\nFrom: ${email.from}\nTo: ${email.to}\nBody: ${email.body}`,
          metadata: { subject: email.subject, from: email.from, date: email.date },
          score: 0 // No similarity score for text search
        })),
        contacts: contactResults.map(contact => ({
          type: 'contact',
          content: `Name: ${contact.firstName} ${contact.lastName}\nEmail: ${contact.email}\nCompany: ${contact.company}\nNotes: ${contact.notes}`,
          metadata: contact,
          score: 0 // No similarity score for text search
        }))
      }
    } catch (error) {
      console.error('Error in simple text search:', error)
      return { emails: [], contacts: [] }
    }
  }
}
