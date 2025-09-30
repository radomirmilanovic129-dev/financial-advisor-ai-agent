# Financial Advisor AI Agent

An intelligent AI-powered assistant designed specifically for financial advisors, integrating Gmail, Google Calendar, and HubSpot CRM to provide comprehensive client management and communication capabilities.

## 🚀 Features

### Core Functionality
- **AI-Powered Chat Interface**: Natural language conversations with context-aware responses
- **Multi-Platform Integration**: Seamless connection with Gmail, Google Calendar, and HubSpot
- **RAG (Retrieval-Augmented Generation)**: Intelligent search through emails and contacts using vector embeddings
- **Proactive Webhook Processing**: Automatic response to incoming emails and calendar events
- **Task Management**: Create and track tasks with AI assistance
- **Conversation History**: Persistent chat history with conversation management

### AI Capabilities
- **Email Search & Analysis**: Search through Gmail messages with semantic understanding
- **Calendar Management**: Schedule appointments, check availability, and manage events
- **Contact Management**: Create, update, and search HubSpot contacts
- **Email Composition**: Draft and send professional emails to clients
- **Context-Aware Responses**: Leverages client data for personalized interactions
- **Fallback Support**: Graceful degradation when AI services are unavailable

### Integration Features
- **Google OAuth**: Secure authentication with Gmail and Calendar access
- **HubSpot CRM**: Full contact and deal management integration
- **PostgreSQL + pgvector**: Advanced vector search capabilities
- **Webhook Support**: Real-time event processing for proactive responses

## 🛠️ Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **React Markdown**: Rich text rendering
- **Lucide React**: Modern icon library

### Backend
- **Next.js API Routes**: Serverless backend functions
- **Prisma ORM**: Database management and migrations
- **PostgreSQL**: Primary database with pgvector extension
- **NextAuth.js**: Authentication and session management

### AI & ML
- **OpenAI GPT-4**: Primary language model
- **LangChain**: AI framework for tool integration
- **Vector Embeddings**: Semantic search capabilities
- **RAG System**: Retrieval-augmented generation

### Integrations
- **Google APIs**: Gmail and Calendar integration
- **HubSpot API**: CRM and contact management
- **Google OAuth 2.0**: Secure authentication

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+ with pgvector extension
- Google Cloud Console project with Gmail and Calendar APIs enabled
- HubSpot developer account
- OpenAI API key

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd financial-advisor-ai-agent
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
```bash
# Install pgvector extension in PostgreSQL
# (Run this in your PostgreSQL database)
CREATE EXTENSION IF NOT EXISTS vector;

# Set up the database
npm run db:push
npm run db:generate
```

### 4. Environment Configuration
Copy the example environment file and configure your variables:

```bash
cp env.example .env.local
```

Update `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/financial_advisor_ai?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# HubSpot OAuth
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Webhook Secrets
GMAIL_WEBHOOK_SECRET="your-gmail-webhook-secret"
HUBSPOT_WEBHOOK_SECRET="your-hubspot-webhook-secret"
```

### 5. Google Cloud Setup
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Gmail API and Google Calendar API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### 6. HubSpot Setup
1. Create a HubSpot developer account
2. Create a private app with the following scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `crm.schemas.contacts.read`
   - `crm.schemas.contacts.write`

### 7. Run the Application
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📖 Usage

### Initial Setup
1. **Sign In**: Use Google OAuth to authenticate
2. **Connect Services**: Link your Gmail, Calendar, and HubSpot accounts
3. **Import Data**: Use the import feature to sync your existing data
4. **Set Instructions**: Configure ongoing instructions for proactive responses

### Chat Interface
- **Natural Conversations**: Ask questions about clients, schedule meetings, or request information
- **Context Awareness**: The AI understands your client relationships and history
- **Tool Integration**: Automatically uses appropriate tools based on your requests

### Key Commands
- "Search emails from John Smith about retirement planning"
- "Schedule a meeting with Sarah Johnson next Tuesday at 2 PM"
- "Create a new contact for Mike Wilson from ABC Company"
- "Send a follow-up email to all clients with pending applications"
- "What meetings do I have this week?"

### Data Management
- **Email Import**: Sync Gmail messages with vector embeddings for semantic search
- **Contact Import**: Import HubSpot contacts with full metadata
- **Conversation History**: Access and continue previous conversations
- **Task Tracking**: Monitor AI-generated tasks and their completion status

## 🏗️ Architecture

### Database Schema
- **Users**: Authentication and user preferences
- **EmailEmbedding**: Gmail messages with vector embeddings
- **HubSpotContactEmbedding**: CRM contacts with vector embeddings
- **ChatMessage**: Conversation history and context
- **Task**: AI-generated tasks and their status
- **WebhookEvent**: Real-time event processing

### API Structure
- `/api/auth/*`: Authentication endpoints
- `/api/chat/*`: Chat and conversation management
- `/api/connections/*`: Service connection status
- `/api/import/*`: Data import functionality
- `/api/webhooks/*`: Real-time event processing
- `/api/hubspot/*`: HubSpot integration

### AI Agent Architecture
- **FinancialAdvisorAgent**: Main AI orchestrator
- **RAGService**: Retrieval-augmented generation
- **Tool Integration**: Gmail, Calendar, and HubSpot tools
- **Fallback Handling**: Graceful degradation when AI services are unavailable

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio
```

### Database Management
```bash
# Reset database
npx prisma db push --force-reset

# View database
npx prisma studio

# Generate new migration
npx prisma migrate dev --name migration_name
```

## 🔒 Security

- **OAuth 2.0**: Secure authentication with Google and HubSpot
- **Token Management**: Automatic token refresh and secure storage
- **Data Encryption**: Sensitive data encrypted at rest
- **Webhook Verification**: Secure webhook endpoint validation
- **Session Management**: Secure session handling with NextAuth.js

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Railway**: Easy PostgreSQL + pgvector deployment
- **DigitalOcean**: App Platform with managed PostgreSQL
- **AWS**: ECS with RDS PostgreSQL

### Environment Variables for Production
Ensure all environment variables are properly configured in your production environment, including:
- Database connection string
- OAuth credentials
- API keys
- Webhook secrets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for common solutions
- Review the troubleshooting section below

## 🔍 Troubleshooting

### Common Issues

**Database Connection Issues**
- Ensure PostgreSQL is running and accessible
- Verify DATABASE_URL is correctly formatted
- Check if pgvector extension is installed

**OAuth Authentication Problems**
- Verify Google Cloud Console configuration
- Check redirect URIs match your domain
- Ensure OAuth credentials are correct

**AI Service Unavailable**
- Check OpenAI API key validity
- Verify API quota and billing
- Review fallback response handling

**Import Failures**
- Ensure proper OAuth scopes are granted
- Check API rate limits
- Verify data format compatibility

## 🗺️ Roadmap

- [ ] Advanced calendar scheduling with conflict resolution
- [ ] Email template management and personalization
- [ ] Advanced analytics and reporting
- [ ] Mobile application support
- [ ] Multi-user collaboration features
- [ ] Advanced AI model fine-tuning
- [ ] Integration with additional CRM platforms
- [ ] Voice interface support

---

Built with ❤️ for financial advisors who want to leverage AI for better client relationships and productivity.
