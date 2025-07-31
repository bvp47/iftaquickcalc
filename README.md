# IFTA QuickCalc

**IFTA QuickCalc** is a professional-grade IFTA (International Fuel Tax Agreement) tax calculation and reporting tool for truckers and fleets.

## Features

- CSV upload or copy/paste trip data
- Automatic tax calculations based on jurisdiction rates
- Handles US states and Canadian provinces
- Simple PDF and CSV export
- Stripe-powered $1 lifetime access to unlock all features
- Supabase Auth integration

## Tech Stack

- Next.js 13+ with App Router
- Tailwind CSS + shadcn/ui
- Supabase (Auth, optional database)
- Stripe Checkout
- Vercel for deployment

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/iftaquickcalc.git
cd iftaquickcalc
npm install
```

### 2. Create `.env.local`

```bash
cp .env.example .env.local
```

Then fill in your Supabase and Stripe credentials.

### 3. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

### 4. Deploy to Vercel

Use the [Vercel CLI](https://vercel.com/docs/cli) or push to GitHub and import to [vercel.com](https://vercel.com).

---

## License

MIT
