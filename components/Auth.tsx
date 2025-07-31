'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, Mail, Lock, User, AlertCircle, CheckCircle, X } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface AuthProps {
  onClose?: () => void
}

export default function Auth({ onClose }: AuthProps) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(true) // Default to sign up since that's the main CTA
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'error' or 'success'
  const [showPayment, setShowPayment] = useState(false)
  const [newUserId, setNewUserId] = useState('')
  
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setMessageType('')

    try {
      if (isSignUp) {
        // Sign up flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        
        if (error) throw error
        
        if (data.user) {
          // Create user profile immediately
          await createUserProfile(data.user.id, email)
          setNewUserId(data.user.id)
          
          if (data.user.email_confirmed_at) {
            // User is confirmed, go to payment
            setShowPayment(true)
          } else {
            // Need email confirmation
            setMessage('Please check your email and click the confirmation link, then return here to complete your $1 payment!')
            setMessageType('success')
            // Still show payment option
            setShowPayment(true)
          }
        }
      } else {
        // Sign in flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        // User will be redirected by auth state change in parent component
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      setMessage(error.message || 'An error occurred during authentication')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const createUserProfile = async (userId: string, userEmail: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .insert([
          { 
            id: userId, 
            email: userEmail,
            created_at: new Date().toISOString()
          }
        ])
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating user profile:', error)
      }
    } catch (error) {
      console.error('Error creating user profile:', error)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/?payment=true`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      setMessage(error.message)
      setMessageType('error')
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: newUserId,
          email: email 
        }),
      })

      const { sessionId, url } = await response.json()
      
      if (url) {
        window.location.href = url
      } else {
        const stripe = await stripePromise
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId })
        }
      }
    } catch (error) {
      console.error('Payment error:', error)
      setMessage('Failed to initiate payment. Please try again.')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  // Payment success view
  if (showPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Calculator className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Almost There!</h1>
            <p className="text-gray-600 mt-2">Complete your $1 payment to unlock everything</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-blue-600">
                Unlock IFTA QuickCalc Pro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* What they get */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-3">Your $1 gets you:</h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    Unlimited trip data processing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    CSV file upload capability
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    Professional PDF reports
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    All quarters, all years - forever
                  </li>
                </ul>
              </div>

              {/* Payment button */}
              <Button 
                onClick={handlePayment}
                disabled={loading}
                className="w-full text-lg py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  <>Pay $1 & Get Instant Access</>
                )}
              </Button>

              {/* Security note */}
              <p className="text-xs text-gray-500 text-center">
                Secure payment powered by Stripe. Cancel anytime.
              </p>

              {/* Success message if shown */}
              {message && messageType === 'success' && (
                <div className="p-3 bg-green-50 text-green-700 rounded-md border border-green-200 text-sm">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  {message}
                </div>
              )}

              {/* Error message */}
              {message && messageType === 'error' && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  {message}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Calculator className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">IFTA QuickCalc</h1>
          <p className="text-gray-600 mt-2">
            {isSignUp ? 'Sign up for $1 lifetime access' : 'Welcome back'}
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">
              {isSignUp ? 'Create Your Account' : 'Sign In'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Email address (Gmail, Yahoo, Outlook, etc.)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Create password (8+ characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {isSignUp ? 'Create Account & Pay $1' : 'Sign In'}
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full mt-4"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isSignUp ? 'Sign up with Google' : 'Continue with Google'}
              </Button>
            </div>
            
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setMessage('')
                  setMessageType('')
                }}
                className="text-blue-600 hover:underline text-sm"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : 'Need an account? Sign up for $1'
                }
              </button>
            </div>
            
            {/* Messages */}
            {message && (
              <div className={`mt-4 p-3 rounded-md flex items-start gap-2 ${
                messageType === 'error' 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {messageType === 'error' ? (
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-sm">{message}</span>
              </div>
            )}

            {/* Value proposition for sign up */}
            {isSignUp && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs text-blue-700">
                  🚛 <strong>$1 gets you:</strong> Unlimited data processing, CSV uploads, PDF reports, and lifetime access to all features!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-500">
          Professional IFTA calculations trusted by truck drivers nationwide
        </div>
      </div>
    </div>
  )
}
