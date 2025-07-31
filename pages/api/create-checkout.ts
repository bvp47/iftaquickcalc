// pages/api/create-checkout.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabaseServer'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { userId, email } = req.body

    if (!userId || !email) {
      return res.status(400).json({ error: 'User ID and email are required' })
    }

    const supabase = supabaseServer()
    
    // Get or create user profile
    let { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single()

    let customerId = user?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          supabase_user_id: userId,
        },
      })

      customerId = customer.id

      // Update user profile with Stripe customer ID
      await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          stripe_customer_id: customerId,
          created_at: new Date().toISOString()
        })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { 
              name: 'IFTA QuickCalc Pro - Lifetime Access',
              description: 'Unlimited IFTA calculations, CSV uploads, PDF reports, and more!'
            },
            unit_amount: 100, // $1.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/?canceled=true`,
      metadata: {
        user_id: userId,
      },
      // Collect email if not provided by customer record
      customer_email: !user?.email ? email : undefined,
    })

    return res.status(200).json({ 
      sessionId: session.id, 
      url: session.url 
    })
  } catch (err) {
    console.error('Checkout error:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
