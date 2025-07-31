import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    // Dummy response for development - no real Stripe integration
    return res.status(200).json({ 
      sessionId: 'dummy_session_id', 
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/?success=true`
    })
  } catch (err) {
    console.error('Checkout error:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
