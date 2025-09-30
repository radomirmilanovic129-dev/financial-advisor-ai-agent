'use client'

import { useState, useEffect } from 'react'

export default function InstructionsPanel() {
  const [instructions, setInstructions] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchInstructions()
  }, [])

  const fetchInstructions = async () => {
    try {
      const response = await fetch('/api/instructions')
      if (response.ok) {
        const data = await response.json()
        setInstructions(data.instructions || '')
      }
    } catch (error) {
      console.error('Error fetching instructions:', error)
    }
  }

  const saveInstructions = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instructions }),
      })

      if (response.ok) {
        alert('Instructions saved successfully!')
      } else {
        alert('Failed to save instructions')
      }
    } catch (error) {
      console.error('Error saving instructions:', error)
      alert('Failed to save instructions')
    } finally {
      setIsSaving(false)
    }
  }

  const exampleInstructions = `Here are some example ongoing instructions you can give the AI agent:

1. "When someone emails me that is not in HubSpot, please create a contact in HubSpot with a note about the email."

2. "When I create a contact in HubSpot, send them an email telling them thank you for being a client."

3. "When I add an event in my calendar, send an email to attendees telling them about the meeting."

4. "When a client emails me asking about our upcoming meeting, look it up on the calendar and respond with the details."

5. "If someone mentions they want to sell a specific stock, create a note in HubSpot about their investment preferences."

6. "When scheduling appointments, always check my calendar for availability and provide at least 3 time options."

7. "If a client mentions their child's activities or interests, add this information to their HubSpot contact notes."

8. "When someone cancels a meeting, automatically reschedule it for the next available slot and notify them."

These instructions help the AI agent be proactive and handle routine tasks automatically.`

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Ongoing Instructions
      </h2>
      
      <p className="text-sm text-gray-600 mb-4">
        Give the AI agent ongoing instructions for how to handle routine tasks and be proactive.
        The agent will remember these instructions and apply them when processing emails, calendar events, and HubSpot updates.
      </p>

      <div className="mb-4">
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
          Instructions
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={12}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Enter your ongoing instructions here..."
        />
      </div>

      <div className="flex space-x-4">
        <button
          onClick={saveInstructions}
          disabled={isSaving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Instructions'}
        </button>
        
        <button
          onClick={() => setInstructions(exampleInstructions)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Load Examples
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          💡 Tips for Effective Instructions
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Be specific about what actions to take</li>
          <li>• Include conditions for when to act (e.g., "when someone emails me")</li>
          <li>• Mention which tools to use (email, calendar, HubSpot)</li>
          <li>• Be clear about the desired outcome</li>
          <li>• Test your instructions with sample scenarios</li>
        </ul>
      </div>
    </div>
  )
}
