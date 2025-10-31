import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user data
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        chatSessions: {
          include: {
            messages: true
          }
        },
        settings: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prepare export data
    const exportData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      settings: user.settings,
      chatSessions: user.chatSessions.map(session => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        messages: session.messages.map(message => ({
          content: message.content,
          role: message.role,
          fileName: message.fileName,
          fileType: message.fileType,
          createdAt: message.createdAt
        }))
      })),
      exportedAt: new Date().toISOString()
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="notesaura-export-${new Date().toISOString().slice(0, 10)}.json"`
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}