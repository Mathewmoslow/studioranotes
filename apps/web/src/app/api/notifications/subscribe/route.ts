import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await request.json()

    // Find or create user
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {
        pushSubscription: JSON.stringify(subscription),
        pushEnabled: true,
      },
      create: {
        email: session.user.email,
        name: session.user.name || '',
        pushSubscription: JSON.stringify(subscription),
        pushEnabled: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save subscription:', error)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}