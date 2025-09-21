import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { canvasUrl, canvasToken } = body

    if (!canvasUrl || !canvasToken) {
      return NextResponse.json(
        { error: 'Canvas URL and token are required' },
        { status: 400 }
      )
    }

    // Test the Canvas connection
    const testUrl = `${canvasUrl}/api/v1/users/self`
    const testResponse = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${canvasToken}`,
        'Accept': 'application/json'
      }
    })

    if (!testResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid Canvas credentials' },
        { status: 400 }
      )
    }

    const canvasUser = await testResponse.json()

    // Store the Canvas connection in the database
    // For now, store in session/localStorage until we set up proper DB storage
    // In production, encrypt the token before storing

    return NextResponse.json({
      success: true,
      canvasUser: {
        id: canvasUser.id,
        name: canvasUser.name,
        email: canvasUser.email
      },
      message: 'Canvas connected successfully'
    })

  } catch (error) {
    console.error('Canvas connection error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Canvas' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has Canvas connection
    // For now, return empty until DB is set up
    return NextResponse.json({
      connected: false,
      canvasUrl: null
    })

  } catch (error) {
    console.error('Canvas status error:', error)
    return NextResponse.json(
      { error: 'Failed to check Canvas status' },
      { status: 500 }
    )
  }
}