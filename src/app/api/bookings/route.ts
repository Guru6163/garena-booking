import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all bookings
export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: {
        date: 'asc'
      }
    })
    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

// POST - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, whatsapp, timeRange, date } = body

    // Validate required fields
    if (!name || !whatsapp || !timeRange || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check for time conflicts
    const existingBookings = await prisma.booking.findMany({
      where: { date }
    })

    // Time conflict check logic (same as frontend)
    const timeToMinutes = (timeString: string): number => {
      const [hours, minutes] = timeString.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const checkTimeOverlap = (newStart: string, newEnd: string, existingBookings: { timeRange: string }[]): boolean => {
      const newStartMinutes = timeToMinutes(newStart);
      const newEndMinutes = timeToMinutes(newEnd);

      for (const booking of existingBookings) {
        const [existingStart, existingEnd] = booking.timeRange.split(' - ');
        const existingStartMinutes = timeToMinutes(existingStart);
        const existingEndMinutes = timeToMinutes(existingEnd);

        if (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes) {
          return true;
        }
      }
      return false;
    };

    const [startTime, endTime] = timeRange.split(' - ');
    if (checkTimeOverlap(startTime, endTime, existingBookings)) {
      return NextResponse.json(
        { error: 'Time slot is already booked' },
        { status: 409 }
      )
    }

    const booking = await prisma.booking.create({
      data: {
        name,
        whatsapp,
        timeRange,
        date
      }
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}
