'use client'

import { motion } from 'framer-motion'
import { Check, CreditCard, Download, HelpCircle, Plus } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// Since Progress might not exist, I'll check first.
// If it doesn't, I'll make a simple one.

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for side projects and testing.',
    features: [
      '3,000 emails per month',
      '1 sender identity',
      'Basic analytics',
      'Community support'
    ],
    current: true,
    cta: 'Current Plan'
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'For growing businesses and creators.',
    features: [
      '50,000 emails per month',
      'Unlimited sender identities',
      'Advanced analytics',
      'Priority support',
      'Custom domains'
    ],
    recommended: true,
    cta: 'Upgrade to Pro'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Scale without limits and dedicated help.',
    features: [
      'Unlimited emails',
      'Dedicated IP',
      'SLA guarantee',
      'Dedicated account manager',
      'Custom integrations'
    ],
    cta: 'Contact Sales'
  }
]

const invoices = [
  { id: 'INV-001', date: 'Jan 1, 2026', amount: '$0.00', status: 'Paid' },
  { id: 'INV-002', date: 'Dec 1, 2025', amount: '$0.00', status: 'Paid' },
  { id: 'INV-003', date: 'Nov 1, 2025', amount: '$0.00', status: 'Paid' }
]

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>(
    'monthly'
  )
  const [loading, setLoading] = React.useState(true)
  const [usage, setUsage] = React.useState({ emails_sent: 0 })
  const [planName, setPlanName] = React.useState('free')

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const res = await fetch('/api/profile', { cache: 'no-store' })
      if (!res.ok) {
        setLoading(false)
        return
      }
      const payload = await res.json()
      if (payload?.profile) {
        setPlanName(payload.profile.plan_name || payload.profile.plan || 'free')
      }
      if (payload?.usage) {
        setUsage(payload.usage)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const handleUpgrade = (selectedPlan: string) => {
    if (selectedPlan.toLowerCase() === planName.toLowerCase()) return
    toast.success(`Redirecting to ${selectedPlan} checkout...`)
  }

  const LIMITS: Record<string, number> = {
    free: 3000,
    pro: 50000,
    enterprise: 1000000
  }

  const currentLimit = LIMITS[planName.toLowerCase()] || 3000

  return (
    <div className='mx-auto max-w-5xl space-y-8 px-4 py-6 md:px-0'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-3xl font-bold tracking-tight'>Billing & Plan</h1>
        <p className='text-muted-foreground'>
          Manage your subscription, usage, and payment methods.
        </p>
      </div>

      {/* Usage Overview */}
      <Card className='overflow-hidden border-none bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent shadow-md dark:from-indigo-500/20 dark:via-purple-500/10'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg'>Monthly Usage</CardTitle>
            <Badge
              variant='outline'
              className='bg-background/50 backdrop-blur-sm'
            >
              Reset in 12 days
            </Badge>
          </div>
          <CardDescription>
            {loading
              ? 'Loading plan info...'
              : `You are currently on the ${planName.charAt(0).toUpperCase() + planName.slice(1)} plan.`}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='font-medium'>Emails Sent</span>
              <span className='text-muted-foreground'>
                {loading
                  ? '...'
                  : `${usage.emails_sent.toLocaleString()} / ${currentLimit.toLocaleString()}`}
              </span>
            </div>
            <div className='h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800'>
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: loading
                    ? 0
                    : `${Math.min((usage.emails_sent / currentLimit) * 100, 100)}%`
                }}
                className='h-full rounded-full bg-indigo-500'
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div className='rounded-xl border bg-background/50 p-4 backdrop-blur-sm'>
              <p className='text-xs text-muted-foreground'>Sender Identities</p>
              <p className='text-xl font-bold'>1 / 1</p>
            </div>
            <div className='rounded-xl border bg-background/50 p-4 backdrop-blur-sm'>
              <p className='text-xs text-muted-foreground'>
                Verification Requests
              </p>
              <p className='text-xl font-bold'>8 / 10</p>
            </div>
            <div className='rounded-xl border bg-background/50 p-4 backdrop-blur-sm'>
              <p className='text-xs text-muted-foreground'>Team Members</p>
              <p className='text-xl font-bold'>1 / 1</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Section */}
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <h2 className='text-xl font-semibold'>Choose a Plan</h2>
          <div className='flex items-center gap-2 rounded-full border bg-muted/50 p-1'>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${billingCycle === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${billingCycle === 'yearly' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Yearly <span className='ml-1 text-emerald-500'>-20%</span>
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className={`relative flex h-full flex-col ${plan.recommended ? 'border-indigo-500/50 bg-indigo-500/[0.02] shadow-lg md:scale-105' : ''}`}
              >
                {plan.recommended && (
                  <div className='absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white'>
                    Recommended
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className='flex-1 space-y-4'>
                  <div className='flex-baseline flex gap-1'>
                    <span className='text-3xl font-bold'>
                      {billingCycle === 'yearly' &&
                      plan.price !== 'Custom' &&
                      plan.price !== '$0'
                        ? `$${Math.round(parseInt(plan.price.replace(/\$/g, '')) * 0.8)}`
                        : plan.price}
                    </span>
                    {plan.period && (
                      <span className='text-muted-foreground'>
                        {plan.period}
                      </span>
                    )}
                  </div>

                  <ul className='space-y-2.5 text-sm'>
                    {plan.features.map(feature => (
                      <li key={feature} className='flex items-center gap-2'>
                        <Check className='h-4 w-4 text-emerald-500' />
                        <span className='text-muted-foreground'>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    variant={
                      plan.name.toLowerCase() === planName.toLowerCase()
                        ? 'outline'
                        : plan.recommended
                          ? 'default'
                          : 'secondary'
                    }
                    className='w-full rounded-xl'
                    disabled={
                      plan.name.toLowerCase() === planName.toLowerCase() ||
                      loading
                    }
                    onClick={() => handleUpgrade(plan.name)}
                  >
                    {plan.name.toLowerCase() === planName.toLowerCase()
                      ? 'Current Plan'
                      : plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Payment & History */}
      <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
        {/* Payment Methods */}
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='font-semibold'>Payment Methods</h3>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 gap-1 rounded-full text-xs'
            >
              <Plus className='h-3 w-3' /> Add Card
            </Button>
          </div>
          <Card className='rounded-2xl border-dashed'>
            <CardContent className='flex flex-col items-center justify-center py-8 text-center text-muted-foreground'>
              <CreditCard className='mb-2 h-8 w-8 opacity-20' />
              <p className='text-sm'>No payment methods saved.</p>
              <p className='text-xs'>Your Free plan doesn't require a card.</p>
            </CardContent>
          </Card>
        </div>

        {/* Billing History */}
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='font-semibold'>Billing History</h3>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 gap-1 rounded-full text-xs'
            >
              View All
            </Button>
          </div>
          <Card className='overflow-hidden rounded-2xl'>
            <div className='divide-y text-sm'>
              {invoices.map(invoice => (
                <div
                  key={invoice.id}
                  className='flex items-center justify-between p-4 transition hover:bg-muted/30'
                >
                  <div>
                    <p className='font-medium'>{invoice.id}</p>
                    <p className='text-xs text-muted-foreground'>
                      {invoice.date}
                    </p>
                  </div>
                  <div className='flex items-center gap-4'>
                    <div className='text-right'>
                      <p className='font-medium'>{invoice.amount}</p>
                      <Badge
                        variant='secondary'
                        className='h-5 px-1.5 text-[10px]'
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 rounded-full'
                    >
                      <Download className='h-4 w-4 text-muted-foreground' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* FAQ / Info */}
      <div className='flex flex-col items-start gap-4 rounded-2xl bg-muted/30 p-6 md:flex-row md:items-center'>
        <div className='rounded-full bg-background p-3 shadow-sm'>
          <HelpCircle className='h-6 w-6 text-indigo-500' />
        </div>
        <div className='flex-1'>
          <h4 className='font-medium'>Have questions about our plans?</h4>
          <p className='text-sm text-muted-foreground'>
            Check our Documentation or contact our support team for any billing
            related queries.
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' className='rounded-full'>
            Docs
          </Button>
          <Button size='sm' className='rounded-full'>
            Support
          </Button>
        </div>
      </div>
    </div>
  )
}
