import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"

// Validate required environment variables
const requiredEnvVars = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
}

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key)

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars)
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events"
        }
      },
      httpOptions: {
        timeout: 10000, // 10 seconds timeout
      }
    })
  ],
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', code, metadata)
    }
  },
  pages: {
    signIn: '/api/auth/signin',
    error: '/api/auth/error',
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('Sign in event:', { user, account, profile, isNewUser })
    },
    async signOut({ token, session }) {
      console.log('Sign out event:', { token, session })
    }
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        console.log('SignIn callback:', { 
          user: user?.email, 
          account: account?.provider, 
          profile: profile?.email 
        })
        
        // Allow sign in if it's a Google account with valid email
        if (account?.provider === 'google' && user?.email) {
          console.log('Google sign-in allowed for:', user.email)
          return true
        }
        
        console.log('Sign-in denied for:', { provider: account?.provider, email: user?.email })
        return false
      } catch (error) {
        console.error('SignIn callback error:', error)
        return false
      }
    },
    async jwt({ token, account, user }) {
      try {
        if (account && user) {
          token.accessToken = account.access_token
          token.refreshToken = account.refresh_token
          token.accessTokenExpires = account.expires_at
        }
        return token
      } catch (error) {
        console.error('JWT callback error:', error)
        return token
      }
    },
    async session({ session, token }) {
      try {
        if (token) {
          session.accessToken = token.accessToken as string
          session.refreshToken = token.refreshToken as string
          session.accessTokenExpires = token.accessTokenExpires as number
        }
        return session
      } catch (error) {
        console.error('Session callback error:', error)
        return session
      }
    },
    async redirect({ url, baseUrl }) {
      try {
        console.log('Redirect callback:', { url, baseUrl })
        
        // If url is relative, make it absolute
        if (url.startsWith("/")) {
          const redirectUrl = `${baseUrl}${url}`
          console.log('Relative URL redirect:', redirectUrl)
          return redirectUrl
        }
        
        // If url is on the same origin, allow it
        if (url.startsWith(baseUrl)) {
          console.log('Same origin redirect:', url)
          return url
        }
        
        // For external URLs, redirect to baseUrl
        console.log('External URL, redirecting to baseUrl:', baseUrl)
        return baseUrl
      } catch (error) {
        console.error('Redirect callback error:', error)
        return baseUrl
      }
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  }
}
