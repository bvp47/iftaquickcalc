'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Auth from '@/components/Auth'
import { 
  Calculator, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Fuel,
  Route,
  TrendingUp,
  LogOut,
  User
} from 'lucide-react'

// Load Stripe
import { loadStripe } from '@stripe/stripe-js'
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface UserProfile {
  id: string
  email: string
  paid_at: string | null
  stripe_customer_id: string | null
  created_at: string
}

interface CalculationResult {
  totalMiles: number
  totalGallons: number
  mpg: number
  taxOwed: number
}

interface DataRow {
  jur: string
  miles: number
  qty: number
  lineNumber: number
}

export default function IFTAQuickCalc() {
  // Auth state
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  
  // App state
  const MAX_FREE_ROWS = 2
  const quarters = ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"]
  const [quarter, setQuarter] = useState("2025-Q3")
  const [rateTable, setRateTable] = useState<Record<string, number>>({})
  const [rateLoading, setRateLoading] = useState(false)
  const [error, setError] = useState("")
  
  const fallbackRates: Record<string, number> = {
    AL: 0.29, AZ: 0.26, AR: 0.285, CA: 0.439, CO: 0.22, CT: 0.394, DE: 0.23, FL: 0.219,
    GA: 0.312, ID: 0.32, IL: 0.392, IN: 0.55, IA: 0.325, KS: 0.24, KY: 0.334, LA: 0.2,
    ME: 0.312, MD: 0.347, MA: 0.29, MI: 0.326, MN: 0.285, MS: 0.18, MO: 0.17, MT: 0.289,
    NE: 0.297, NV: 0.27, NH: 0.222, NJ: 0.383, NM: 0.21, NY: 0.33, NC: 0.38, ND: 0.23,
    OH: 0.47, OK: 0.2, OR: 0, PA: 0.409, RI: 0.34, SC: 0.28, SD: 0.28, TN: 0.27,
    TX: 0.2, UT: 0.285, VT: 0.32, VA: 0.282, WA: 0.494, WV: 0.357, WI: 0.329, WY: 0.24,
    DC: 0.325,
    AB: 0.389, BC: 0.502, MB: 0.372, NB: 0.38, NL: 0.407, NS: 0.428, ON: 0.427,
    PE: 0.396, QC: 0.435, SK: 0.399,
  }

  const gallonPerLitre = 0.264172
  const provinceCodes = new Set(["AB","BC","MB","NB","NL","NS","ON","PE","QC","SK"])
  const [csv, setCsv] = useState("")
  const [rows, setRows] = useState<DataRow[]>([])
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [dataLimitExceeded, setDataLimitExceeded] = useState(false)

  // Initialize auth and load rates
  useEffect(() => {
    initializeAuth()
    fetchRates()
  }, [quarter])

  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchUserProfile(session.user.id)
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      setLoading(false)
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setUserProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!data) {
        // Create user profile if doesn't exist
        const { data: newUser } = await supabase
          .from('users')
          .insert([{ id: userId, email: user?.email }])
          .select()
          .single()
        setUserProfile(newUser)
      } else {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchRates = async () => {
    setRateLoading(true)
    setError("")
    try {
      // Simulate API call - in production you might fetch real rates
      await new Promise(resolve => setTimeout(resolve, 500))
      setRateTable(fallbackRates)
    } catch (err) {
      setError("Failed to load tax rates. Using fallback rates.")
      setRateTable(fallbackRates)
    } finally {
      setRateLoading(false)
    }
  }

  const parseCsv = (text: string) => {
    if (!text.trim()) {
      setRows([])
      setResult(null)
      setValidationErrors([])
      setDataLimitExceeded(false)
      return
    }

    const lines = text.trim().split(/\r?\n/)
    const parsed: DataRow[] = []
    const errors: string[] = []

    lines.forEach((line, index) => {
      if (!line.trim()) return
      
      const parts = line.split(/[,\t]/)
      if (parts.length < 3) {
        errors.push(`Row ${index + 1}: Missing required columns (jurisdiction, miles, quantity)`)
        return
      }

      const jur = (parts[0] || "").trim().toUpperCase()
      const milesStr = (parts[1] || "").trim()
      const qtyStr = (parts[2] || "").trim()

      // Validation
      if (!jur) {
        errors.push(`Row ${index + 1}: Missing jurisdiction`)
        return
      }
      
      const miles = parseFloat(milesStr)
      const qty = parseFloat(qtyStr)
      
      if (isNaN(miles) || miles < 0) {
        errors.push(`Row ${index + 1}: Invalid miles value`)
        return
      }
      
      if (isNaN(qty) || qty < 0) {
        errors.push(`Row ${index + 1}: Invalid quantity value`)
        return
      }

      parsed.push({ jur, miles, qty, lineNumber: index + 1 })
    })

    // Check if data limit is exceeded for non-paid users
    if (!isPaid && parsed.length > MAX_FREE_ROWS) {
      setDataLimitExceeded(true)
      // Only keep the first MAX_FREE_ROWS for preview
      parsed.splice(MAX_FREE_ROWS)
      errors.push(`Preview limited to ${MAX_FREE_ROWS} rows. Sign up for $1 to process unlimited data.`)
    } else {
      setDataLimitExceeded(false)
    }

    setValidationErrors(errors)
    setRows(parsed)
    if (parsed.length > 0) {
      calcTotals(parsed)
    } else {
      setResult(null)
    }
  }

  const calcTotals = (parsed: DataRow[]) => {
    let totalMiles = 0
    let totalGallons = 0
    let taxOwed = 0

    parsed.forEach(({ jur, miles, qty }) => {
      const rate = rateTable[jur]
      if (rate === undefined) return
      
      totalMiles += miles
      const gallons = provinceCodes.has(jur) ? qty * gallonPerLitre : qty
      totalGallons += gallons
      taxOwed += gallons * rate
    })

    const mpg = totalGallons > 0 ? totalMiles / totalGallons : 0
    const calculationResult = { totalMiles, totalGallons, mpg, taxOwed }
    setResult(calculationResult)
  }

  const handlePayment = async () => {
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
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
      setError('Failed to initiate payment. Please try again.')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const isPaid = userProfile?.paid_at !== null
  const unknownJurisdictions = rows.filter(r => rateTable[r.jur] === undefined)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading IFTA QuickCalc...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Calculator className="w-10 h-10 text-blue-600" />
              IFTA QuickCalc
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                {user.email}
                {isPaid && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">PRO</span>}
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
          <p className="text-lg text-gray-600">Professional IFTA tax calculation and reporting</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quarter Selection */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-white rounded-t-lg pb-8">
                <CardTitle className="text-xl font-semibold text-gray-800">Step 1: Select Quarter</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-6">
                  <Label htmlFor="quarter-select" className="text-base font-medium text-gray-700 min-w-fit">
                    Reporting Quarter:
                  </Label>
                  <select 
                    id="quarter-select"
                    value={quarter} 
                    onChange={(e) => setQuarter(e.target.value)}
                    className="w-48 h-10 px-3 rounded-md border border-input bg-background"
                  >
                    {quarters.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  {rateLoading && <div className="text-sm text-gray-500">Loading rates...</div>}
                </div>
              </CardContent>
            </Card>

            {/* Data Import */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-white rounded-t-lg pb-8">
                <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-gray-600" />
                  Step 2: Import Trip Data
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div>
                  <Label htmlFor="csv" className="text-base font-medium text-gray-700 mb-4 block">
                    Paste Data Directly
                  </Label>
                  <Textarea
                    id="csv"
                    rows={6}
                    placeholder="TX,1200,130,2025-07-12&#10;ON,500,190,2025-08-01"
                    value={csv}
                    onChange={(e) => {
                      const txt = e.target.value
                      setCsv(txt)
                      parseCsv(txt)
                    }}
                    className="font-mono text-sm"
                  />
                  {!isPaid && (
                    <p className="text-xs text-blue-600 mt-2">
                      Preview limited to {MAX_FREE_ROWS} rows. Sign up for $1 to process unlimited data.
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Format: Jurisdiction, Miles, Fuel Quantity, Date (optional)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Data Preview */}
            {rows.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-white rounded-t-lg pb-8">
                  <CardTitle className="text-xl font-semibold text-gray-800">Data Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Jurisdiction</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Miles</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Quantity</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Tax Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {rows.map((r, i) => {
                          const hasRate = rateTable[r.jur] !== undefined
                          return (
                            <tr key={i} className={!hasRate ? "bg-red-50" : ""}>
                              <td className={`px-4 py-3 font-medium ${!hasRate ? "text-red-600" : "text-gray-900"}`}>
                                {r.jur}
                              </td>
                              <td className="px-4 py-3 text-gray-700">{r.miles.toLocaleString()}</td>
                              <td className="px-4 py-3 text-gray-700">{r.qty}</td>
                              <td className="px-4 py-3 text-gray-700">
                                {hasRate ? `${rateTable[r.jur].toFixed(3)}` : "Unknown"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {dataLimitExceeded && (
                      <div className="p-3 text-center text-sm text-blue-600 bg-blue-50 border-t border-blue-200">
                        Preview limited to {MAX_FREE_ROWS} rows - Sign up to process all your data
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results & Purchase Panel */}
          <div className="space-y-6">
            {/* Results Summary */}
            {result && (
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-white rounded-t-lg pb-8">
                  <CardTitle className="text-xl font-semibold text-gray-800">Calculation Results</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Route className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-900">
                        {result.totalMiles.toLocaleString()}
                      </div>
                      <div className="text-sm text-blue-700">Total Miles</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <Fuel className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-900">
                        {result.totalGallons.toFixed(0)}
                      </div>
                      <div className="text-sm text-green-700">Total Gallons</div>
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-900">
                      {result.mpg.toFixed(1)} MPG
                    </div>
                    <div className="text-sm text-purple-700">Average Fuel Economy</div>
                  </div>
                  
                  <div className="text-center p-6 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg">
                    <div className="text-3xl font-bold mb-2">
                      ${result.taxOwed.toFixed(2)}
                    </div>
                    <div className="text-sm opacity-90">Estimated Tax Owed</div>
                  </div>

                  <div className="space-y-3">
                    {!isPaid ? (
                      <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-yellow-700 font-medium mb-2">Sign up to download reports</div>
                        <div className="text-sm text-yellow-600">Only $1 for lifetime access</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button 
                          onClick={() => alert('Download functionality - PDF records ready!')}
                          className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900"
                          disabled={!result}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Download Calculation Record
                        </Button>
                        <Button 
                          onClick={() => alert('CSV download functionality ready!')}
                          variant="outline"
                          className="w-full"
                          disabled={!result}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Download CSV Data
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Card */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-white rounded-t-lg pb-8">
                <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Professional Features
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {!isPaid ? (
                  <div className="space-y-6">
                    {/* Paid Access */}
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="text-4xl font-bold text-blue-700 mb-2">$1</div>
                      <div className="text-sm text-blue-600 mb-4">One-time signup • Unlimited access</div>
                      <ul className="text-sm space-y-2 text-blue-600 mb-6">
                        <li className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          Process unlimited data rows
                        </li>
                        <li className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          Download calculation records & CSV
                        </li>
                        <li className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          All quarters, all years
                        </li>
                        <li className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          Lifetime access
                        </li>
                      </ul>
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                        onClick={handlePayment}
                      >
                        Sign Up for $1
                      </Button>
                      <div className="text-xs text-blue-500 mt-2">
                        Perfect for quarterly IFTA preparation
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4 p-6">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                    <div className="text-green-700 font-semibold text-lg">Unlimited Access!</div>
                    <div className="text-sm text-gray-600">All premium features unlocked</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-3">
          {dataLimitExceeded && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Preview limited to {MAX_FREE_ROWS} rows. Sign up for $1 to process unlimited data and get your complete IFTA calculations.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {unknownJurisdictions.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                Unknown jurisdictions found: {unknownJurisdictions.map(r => r.jur).join(", ")}. 
                These entries will be excluded from tax calculations.
              </AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <div className="font-semibold mb-1">Data validation errors:</div>
                <ul className="text-sm space-y-1">
                  {validationErrors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                  {validationErrors.length > 5 && (
                    <li>• ... and {validationErrors.length - 5} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
