'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'Access denied. You do not have permission to sign in.',
    Verification: 'The verification token has expired or has already been used.',
    Default: 'An error occurred during authentication.',
    OAuthCallback: 'OAuth callback failed. This might be due to network timeout or connectivity issues.',
    OAuthCreateAccount: 'Could not create OAuth account.',
    EmailCreateAccount: 'Could not create account with this email.',
    Callback: 'There was an error with the callback URL. Please check your Google Cloud Console redirect URI configuration.',
    OAuthAccountNotLinked: 'To confirm your identity, sign in with the same account you used originally.',
    EmailSignin: 'Check your email for a sign in link.',
    CredentialsSignin: 'Sign in failed. Check the details you provided are correct.',
    SessionRequired: 'Please sign in to access this page.',
    OAuthSignin: 'OAuth sign-in failed. Please check your Google OAuth configuration and try again.',
  }

  const errorMessage = errorMessages[error as keyof typeof errorMessages] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {errorMessage}
          </p>
          {error && (
            <p className="mt-1 text-xs text-gray-500">
              Error code: {error}
            </p>
          )}
          {error === 'OAuthSignin' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800">Troubleshooting Steps:</h3>
              <ul className="mt-2 text-xs text-yellow-700 list-disc list-inside space-y-1">
                <li>Check that your .env file contains valid GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET</li>
                <li>Verify the redirect URI in Google Cloud Console includes: http://localhost:3000/api/auth/callback/google</li>
                <li>Ensure the Google OAuth consent screen is properly configured</li>
                <li>Make sure the required APIs (Gmail, Calendar) are enabled in Google Cloud Console</li>
              </ul>
            </div>
          )}
          {error === 'Callback' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800">Callback URL Configuration:</h3>
              <div className="mt-2 text-xs text-red-700 space-y-2">
                <p><strong>Required Redirect URI in Google Cloud Console:</strong></p>
                <code className="block p-2 bg-gray-100 rounded text-xs break-all">
                  http://localhost:3000/api/auth/callback/google
                </code>
                <p><strong>Steps to fix:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Go to <a href="https://console.cloud.google.com/" target="_blank" className="text-blue-600 underline">Google Cloud Console</a></li>
                  <li>Navigate to APIs & Services → Credentials</li>
                  <li>Click on your OAuth 2.0 Client ID</li>
                  <li>Add the exact redirect URI above to "Authorized redirect URIs"</li>
                  <li>Save the changes</li>
                </ul>
              </div>
            </div>
          )}
          {error === 'OAuthCallback' && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
              <h3 className="text-sm font-medium text-orange-800">Network Timeout Troubleshooting:</h3>
              <div className="mt-2 text-xs text-orange-700 space-y-2">
                <p><strong>This error usually indicates:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Network connectivity issues</li>
                  <li>Firewall blocking Google OAuth servers</li>
                  <li>Corporate network restrictions</li>
                  <li>DNS resolution problems</li>
                </ul>
                <p><strong>Try these solutions:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check your internet connection</li>
                  <li>Try using a different network (mobile hotspot)</li>
                  <li>Disable VPN if you're using one</li>
                  <li>Check if your firewall allows connections to Google</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        <div className="mt-8 space-y-4">
          <button
            onClick={() => window.location.href = '/api/auth/signin'}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  )
}
