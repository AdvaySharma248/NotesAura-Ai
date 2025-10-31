import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    const user = await db.user.findUnique({
      where: {
        email,
      },
    })

    return NextResponse.json({ exists: !!user })
  } catch (error) {
    console.error('Error checking user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}