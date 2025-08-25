import { useState, useEffect, useCallback } from 'react'

interface Booking {
  id: string
  name: string
  whatsapp: string
  timeRange: string
  date: string
}

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all bookings
  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/bookings')
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      setBookings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  // Create a new booking
  const createBooking = useCallback(async (bookingData: Omit<Booking, 'id'>) => {
    setError(null)
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }
      
      const newBooking = await response.json()
      setBookings(prev => [...prev, newBooking])
      return newBooking
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create booking'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  // Delete a booking
  const deleteBooking = useCallback(async (id: string) => {
    setError(null)
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete booking')
      }
      
      setBookings(prev => prev.filter(booking => booking.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete booking'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Load bookings on mount and clear any old localStorage data
  useEffect(() => {
    // Clear any old localStorage data to ensure database-only operation
    localStorage.removeItem('calendar-bookings')
    fetchBookings()
  }, [fetchBookings])

  return {
    bookings,
    loading,
    error,
    createBooking,
    deleteBooking,
    refetch: fetchBookings
  }
}
