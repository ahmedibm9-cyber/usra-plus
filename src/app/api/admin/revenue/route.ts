import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// ─── GET: Revenue Analytics ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get real counts from the database
    const [totalTransactions, pendingRefundsCount, totalRefundsCount, totalRevenueAgg, totalRefundedAgg] = await Promise.all([
      db.revenueTransaction.count(),
      db.refund.count({ where: { status: 'pending' } }),
      db.refund.count(),
      db.revenueTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'payment', status: 'completed' },
      }),
      db.revenueTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'refund' },
      }),
    ])

    const totalRevenue = Number(totalRevenueAgg._sum.amount ?? 0)
    const totalRefunded = Number(totalRefundedAgg._sum.amount ?? 0)

    // If no transactions exist, this is pre-launch
    const isPreLaunch = totalTransactions === 0

    if (isPreLaunch) {
      return NextResponse.json({
        source: 'live',
        data: {
          isPreLaunch: true,
          totalRevenue: 0,
          mrr: 0,
          arr: 0,
          avgCLV: 0,
          churnRate: 0,
          monthlyRevenue: [],
          revenueByPlan: [],
          refundRate: 0,
          pendingRefunds: 0,
          totalTransactions: 0,
          totalRefunded: 0,
          transactions: [],
          refunds: [],
        },
      })
    }

    // Fetch transactions and refunds for detailed analytics
    const [transactions, refunds] = await Promise.all([
      db.revenueTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      db.refund.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])

    // Revenue by plan
    const revenueByPlan: Record<string, number> = {}
    for (const txn of transactions) {
      if (txn.type === 'payment' && txn.status === 'completed') {
        const plan = txn.description || 'unknown'
        revenueByPlan[plan] = (revenueByPlan[plan] || 0) + Number(txn.amount)
      }
    }

    const revenueByPlanArray = Object.entries(revenueByPlan).map(([plan, revenue]) => ({
      plan,
      revenue,
      percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
    }))

    // Monthly revenue
    const monthlyRevenue: Record<string, { revenue: number; newSubs: number; churned: number }> = {}
    for (const txn of transactions) {
      const monthKey = txn.createdAt.toISOString().substring(0, 7) // YYYY-MM
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = { revenue: 0, newSubs: 0, churned: 0 }
      }
      if (txn.type === 'payment' && txn.status === 'completed') {
        monthlyRevenue[monthKey].revenue += Number(txn.amount)
        monthlyRevenue[monthKey].newSubs++
      }
      if (txn.type === 'downgrade') {
        monthlyRevenue[monthKey].churned++
      }
    }

    const monthlyRevenueArray = Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }))

    // MRR from active subscriptions
    const activePaymentCount = transactions.filter(t => t.type === 'payment' && t.status === 'completed').length
    const mrr = totalRevenue // Simplified for pre-launch
    const refundRate = totalRevenue > 0 ? Math.round((totalRefunded / totalRevenue) * 100) : 0

    const serializedTransactions = transactions.map(t => ({
      id: t.id,
      userId: t.userId,
      subscriptionId: t.subscriptionId,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      originalAmount: t.originalAmount != null ? Number(t.originalAmount) : null,
      discountAmount: Number(t.discountAmount),
      couponId: t.couponId,
      paymentProvider: t.paymentProvider,
      status: t.status,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    }))

    const serializedRefunds = refunds.map(r => ({
      id: r.id,
      transactionId: r.transactionId,
      userId: r.userId,
      amount: Number(r.amount),
      reason: r.reason,
      category: r.category,
      status: r.status,
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      source: 'live',
      data: {
        isPreLaunch: false,
        totalRevenue,
        mrr,
        arr: mrr * 12,
        avgCLV: activePaymentCount > 0 ? Math.round(totalRevenue / activePaymentCount) : 0,
        churnRate: 0,
        monthlyRevenue: monthlyRevenueArray,
        revenueByPlan: revenueByPlanArray,
        refundRate,
        pendingRefunds: pendingRefundsCount,
        totalTransactions,
        totalRefunded,
        transactions: serializedTransactions,
        refunds: serializedRefunds,
      },
    })
  } catch (err) {
    return NextResponse.json({
      source: 'demo',
      data: {
        isPreLaunch: true,
        totalRevenue: 0,
        mrr: 0,
        arr: 0,
        avgCLV: 0,
        churnRate: 0,
        monthlyRevenue: [],
        revenueByPlan: [],
        refundRate: 0,
        pendingRefunds: 0,
        totalTransactions: 0,
        totalRefunded: 0,
        transactions: [],
        refunds: [],
      },
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

// ─── PATCH: Approve or reject a refund ───────────────────────────────────
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { refundId, action, notes } = body as {
    refundId?: string
    action?: 'approve' | 'reject'
    notes?: string
  }

  if (!refundId || !action) {
    return NextResponse.json({ error: 'refundId and action (approve/reject) are required' }, { status: 400 })
  }

  try {
    const updateData: Record<string, unknown> = {
      approvedBy: auth.admin?.email || null,
      approvedAt: new Date(),
    }

    if (action === 'approve') {
      updateData.status = 'approved'
    } else if (action === 'reject') {
      updateData.status = 'rejected'
    }

    if (notes) updateData.notes = notes

    const refund = await db.refund.update({
      where: { id: refundId },
      data: updateData,
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      refund: {
        id: refund.id,
        transactionId: refund.transactionId,
        userId: refund.userId,
        amount: Number(refund.amount),
        reason: refund.reason,
        category: refund.category,
        status: refund.status,
        approvedBy: refund.approvedBy,
        approvedAt: refund.approvedAt?.toISOString() ?? null,
        notes: refund.notes,
        createdAt: refund.createdAt.toISOString(),
        updatedAt: refund.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update refund',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
