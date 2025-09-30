'use client'

import { useState } from 'react'

interface ConnectionStatusProps {
  connections: {
    gmail: boolean
    calendar: boolean
    hubspot: boolean
  }
  onUpdate: () => void
}

export default function ConnectionStatus({ connections, onUpdate }: ConnectionStatusProps) {
  const [isConnecting, setIsConnecting] = useState<string | null>(null)

  const connectHubSpot = async () => {
    setIsConnecting('hubspot')
    try {
      window.location.href = '/api/hubspot/connect'
    } catch (error) {
      console.error('Error connecting HubSpot:', error)
      setIsConnecting(null)
    }
  }

  const ConnectionItem = ({ 
    name, 
    connected, 
    onConnect, 
    connecting 
  }: { 
    name: string
    connected: boolean
    onConnect: () => void
    connecting: boolean
  }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium text-gray-900">{name}</span>
      </div>
      {!connected && (
        <button
          onClick={onConnect}
          disabled={connecting}
          className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-2">
      <ConnectionItem
        name="Gmail"
        connected={connections.gmail}
        onConnect={() => {}} // Gmail is connected via Google OAuth
        connecting={false}
      />
      <ConnectionItem
        name="Google Calendar"
        connected={connections.calendar}
        onConnect={() => {}} // Calendar is connected via Google OAuth
        connecting={false}
      />
      <ConnectionItem
        name="HubSpot CRM"
        connected={connections.hubspot}
        onConnect={connectHubSpot}
        connecting={isConnecting === 'hubspot'}
      />
    </div>
  )
}
