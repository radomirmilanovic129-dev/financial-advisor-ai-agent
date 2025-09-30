'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Mic, Plus, X, Calendar, Users, Mail, Database, Clock, MessageSquare } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: any[]
  toolResults?: any[]
  createdAt: Date
  attendees?: string[]
  meetingData?: any
}

interface Conversation {
  id: string
  date: string
  title: string
  messageCount: number
  lastMessage: string
  messages: Message[]
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [context, setContext] = useState('all')
  const [isRecording, setIsRecording] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history') {
      loadChatHistory()
    }
  }, [activeTab])

  // Refresh conversations when a new message is sent
  useEffect(() => {
    if (messages.length > 0 && activeTab === 'history') {
      loadChatHistory()
    }
  }, [messages.length])

  const loadChatHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch('/api/chat/history')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const loadConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setMessages(conversation.messages)
    setCurrentConversationId(conversation.id)
    setActiveTab('chat')
  }

  const startNewConversation = () => {
    setMessages([])
    setSelectedConversation(null)
    setCurrentConversationId(null) // This will trigger a new conversation ID generation
    setActiveTab('chat')
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          context: context,
          conversationId: currentConversationId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Update conversation ID if this is a new conversation
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || '',
        toolCalls: data.toolCalls,
        toolResults: data.toolResults,
        createdAt: new Date(),
        meetingData: data.meetingData
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startNewThread = () => {
    startNewConversation()
  }

  const formatToolCall = (toolCall: any) => {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
        <div className="font-medium text-blue-800 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
          {toolCall.function.name}
        </div>
        <div className="text-sm text-blue-600 mt-1">
          {JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2)}
        </div>
      </div>
    )
  }

  const formatToolResult = (toolResult: any) => {
    const result = JSON.parse(toolResult.content)
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
        <div className="font-medium text-green-800 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Tool Result
        </div>
        <div className="text-sm text-green-600 mt-1">
          {result.error ? (
            <span className="text-red-600">Error: {result.error}</span>
          ) : (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    )
  }

  const formatMeetingData = (meetingData: any) => {
    if (!meetingData) return null

    return (
      <div className="mt-4 space-y-3">
        {meetingData.map((meeting: any, index: number) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">
                {meeting.date}
              </div>
              <div className="text-sm text-gray-500">
                {meeting.time}
              </div>
            </div>
            <div className="font-semibold text-gray-900 mb-2">
              {meeting.title}
            </div>
            {meeting.attendees && (
              <div className="flex items-center space-x-2">
                {meeting.attendees.map((attendee: string, idx: number) => (
                  <div key={idx} className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                    {attendee.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const getContextIcon = (context: string) => {
    switch (context) {
      case 'meetings': return <Calendar className="w-4 h-4" />
      case 'contacts': return <Users className="w-4 h-4" />
      case 'emails': return <Mail className="w-4 h-4" />
      default: return <Database className="w-4 h-4" />
    }
  }

  const getContextLabel = (context: string) => {
    switch (context) {
      case 'meetings': return 'All meetings'
      case 'contacts': return 'All contacts'
      case 'emails': return 'All emails'
      default: return 'All data'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow h-[700px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {selectedConversation ? selectedConversation.title : 'Ask Anything'}
          </h2>
          <button className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1 text-sm rounded ${
                activeTab === 'chat' 
                  ? 'bg-gray-200 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-sm rounded ${
                activeTab === 'history' 
                  ? 'bg-gray-200 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
          </div>
          
          <button
            onClick={startNewThread}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>New thread</span>
          </button>
        </div>
      </div>

      {/* Context Selector - only show in chat tab */}
      {activeTab === 'chat' && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between">
            <div className="text-sm font-medium text-gray-600">
              Context set to {getContextLabel(context)}
            </div>
            <div className="text-sm text-gray-500 mt-2 sm:mt-0">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'chat' ? (
        /* Chat Messages */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            {/* <div className="mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-lg font-medium">I can answer questions about your clients and meetings</p>
              <p className="text-sm mt-1">What do you want to know?</p>
            </div> */}
            <div className="mt-6 text-sm space-y-2 text-left max-w-md mx-auto">
              <p><strong>Try asking:</strong></p>
              <p>• "Find meetings I've had with Sara Smith this month"</p>
              <p>• "Who mentioned their kid plays baseball?"</p>
              <p>• "Schedule an appointment with John about his portfolio"</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role.toLocaleLowerCase() === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-2xl ${message.role.toLocaleLowerCase() === 'user' ? 'order-2' : 'order-1'}`}>
              <div className={`rounded-2xl px-4 py-3 ${
                message.role.toLocaleLowerCase() === 'user' 
                  ? 'bg-blue-600 text-white ml-12' 
                  : 'bg-gray-100 text-gray-900 mr-12'
              }`}>
                <div className="text-sm">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {/* {message.role.toLocaleLowerCase() === 'assistant' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-sm max-w-none"
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                  )} */}
                </div>

                {/* Meeting Data */}
                {message.meetingData && formatMeetingData(message.meetingData)}

                {/* Tool Calls */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.toolCalls.map((toolCall, index) => (
                      <div key={index}>
                        {formatToolCall(toolCall)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tool Results */}
                {message.toolResults && message.toolResults.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.toolResults.map((toolResult, index) => (
                      <div key={index}>
                        {formatToolResult(toolResult)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-2xl mr-12">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      ) : (
        /* History Tab */
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
              <span className="ml-2 text-gray-600">Loading chat history...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">No chat history yet</p>
              <p className="text-sm mt-1">Start a conversation to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => loadConversation(conversation)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{conversation.title}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(conversation.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {conversation.lastMessage}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <MessageSquare className="w-3 h-3" />
                      <span>{conversation.messageCount} messages</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {conversation.messages.length > 0 && 
                        new Date(conversation.messages[conversation.messages.length - 1].createdAt).toLocaleTimeString([], {
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input Area - only show in chat tab */}
      {activeTab === 'chat' && (
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything about your meetings..."
                className="w-full resize-none border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <div className="absolute right-3 top-3 flex items-center space-x-2">
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-1 rounded-full ${
                    isRecording 
                      ? 'bg-red-500 text-white' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <Plus className="w-4 h-4" />
                </button>
                
                <select
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All data</option>
                  <option value="meetings">All meetings</option>
                  <option value="contacts">All contacts</option>
                  <option value="emails">All emails</option>
                </select>
                
                <div className="flex items-center space-x-1">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs text-red-600">🐕</span>
                  </div>
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs text-blue-600">E</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
