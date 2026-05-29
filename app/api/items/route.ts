import { authOptions } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const items = await prisma.items.findMany({
      orderBy: { id: 'asc' }
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Gagal mengambil data' },
      { status: 500 }
    )
  }
}
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const item = await prisma.items.create({
      data: {
        name: '',
        qty: 0,
        status: '',
        price: 0
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Gagal membuat row baru' },
      { status: 500 }
    )
  }
}
