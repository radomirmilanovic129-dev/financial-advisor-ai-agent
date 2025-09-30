'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import ChatInterface from './ChatInterface'
import ConnectionStatus from './ConnectionStatus'
import InstructionsPanel from './InstructionsPanel'

export default function Dashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('chat')
  const [connections, setConnections] = useState({
    gmail: false,
    calendar: false,
    hubspot: false
  })

  useEffect(() => {
    // Check connection status
    checkConnections()
  }, [])

  const checkConnections = async () => {
    try {
      const response = await fetch('/api/connections/status')
      if (response.ok) {
        const data = await response.json()
        setConnections(data)
      }
    } catch (error) {
      console.error('Error checking connections:', error)
    }
  }

  const handleImport = async (type: string) => {
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      if (response.ok) {
        alert(`${type} data imported successfully!`)
      } else {
        alert(`Failed to import ${type} data`)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Financial Advisor AI Agent
              </h1>
              <p className="text-gray-600">Welcome back, {session?.user?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => signOut()}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Connections
              </h2>
              <ConnectionStatus connections={connections} onUpdate={checkConnections} />
              
              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 mb-3">
                  Data Import
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleImport('emails')}
                    disabled={!connections.gmail}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import Gmail Data
                  </button>
                  <button
                    onClick={() => handleImport('contacts')}
                    disabled={!connections.hubspot}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import HubSpot Contacts
                  </button>
                  <button
                    onClick={() => handleImport('all')}
                    disabled={!connections.gmail || !connections.hubspot}
                    className="w-full text-left px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import All Data
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 mb-3">
                  Navigation
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`w-full text-left px-3 py-2 text-sm rounded ${
                      activeTab === 'chat'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Chat Interface
                  </button>
                  <button
                    onClick={() => setActiveTab('instructions')}
                    className={`w-full text-left px-3 py-2 text-sm rounded ${
                      activeTab === 'instructions'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Ongoing Instructions
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'chat' && <ChatInterface />}
            {activeTab === 'instructions' && <InstructionsPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
