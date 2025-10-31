import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only fetch sessions that have messages (not empty chats)
    const sessions = await db.chatSession.findMany({
      where: {
        messages: {
          some: {} // Only include sessions with at least one message
        }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title } = await request.json()
    
    // Get user by email since NextAuth session includes email
    const user = session.user.email 
      ? await db.user.findUnique({ where: { email: session.user.email } })
      : null
    
    const chatSession = await db.chatSession.create({
      data: {
        title: title || 'New Chat',
        userId: user?.id || null
      }
    })

    return NextResponse.json(chatSession)
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await db.chatSession.deleteMany({})
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing sessions:', error)
    return NextResponse.json({ error: 'Failed to clear sessions' }, { status: 500 })
  }
}