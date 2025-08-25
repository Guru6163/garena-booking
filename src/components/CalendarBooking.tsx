'use client';

import { useState } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Clock, User, Phone, Trash2, LogOut, History } from 'lucide-react';

interface Booking {
  id: string;
  name: string;
  whatsapp: string;
  timeRange: string;
  date: string;
}

const CalendarBooking: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPreviousBookingsOpen, setIsPreviousBookingsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });
  const { bookings, loading, error, createBooking, deleteBooking, refetch } = useBookings();
  const [newBooking, setNewBooking] = useState({
    name: '',
    whatsapp: '',
    startTime: '',
    endTime: '',
    isOvernight: false,
  });



  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return bookings.filter(booking => booking.date === dateStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
    setNewBooking({ name: '', whatsapp: '', startTime: '', endTime: '', isOvernight: false });
  };

  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const timeToMinutesOvernight = (timeString: string, isEndTime: boolean = false): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    // If it's an end time and the time is in early morning (0-11:59 AM), add 24 hours worth of minutes
    if (isEndTime && hours >= 0 && hours < 12) {
      return totalMinutes + (24 * 60);
    }
    return totalMinutes;
  };

  const formatTimeToAMPM = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const formatTimeRangeToAMPM = (timeRange: string): string => {
    const [startTime, endTime] = timeRange.split(' - ');
    const startFormatted = formatTimeToAMPM(startTime);
    const endFormatted = formatTimeToAMPM(endTime);
    
    // Check if this might be an overnight booking
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    if (endMinutes <= startMinutes) {
      return `${startFormatted} - ${endFormatted} (+1 day)`;
    }
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const checkTimeOverlap = (newStart: string, newEnd: string, existingBookings: Booking[], isNewOvernight: boolean = false): boolean => {
    const newStartMinutes = timeToMinutes(newStart);
    let newEndMinutes = timeToMinutes(newEnd);

    // Handle overnight booking for new booking
    if (isNewOvernight || newEndMinutes <= newStartMinutes) {
      newEndMinutes = timeToMinutesOvernight(newEnd, true);
    }

    for (const booking of existingBookings) {
      const [existingStart, existingEnd] = booking.timeRange.split(' - ');
      const existingStartMinutes = timeToMinutes(existingStart);
      let existingEndMinutes = timeToMinutes(existingEnd);

      // Check if existing booking is overnight
      const isExistingOvernight = existingEndMinutes <= existingStartMinutes;
      if (isExistingOvernight) {
        existingEndMinutes = timeToMinutesOvernight(existingEnd, true);
      }

      // Check for overlap: new booking starts before existing ends AND new booking ends after existing starts
      if (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes) {
        return true; // Overlap detected
      }

      // Special case: if new booking is overnight, also check against next day's early bookings
      if (isNewOvernight || newEndMinutes > 24 * 60) {
        // Check if the overnight part (early morning) overlaps with early morning bookings
        const overnightEndMinutes = newEndMinutes - (24 * 60); // Convert back to next day time
        if (overnightEndMinutes > existingStartMinutes && !isExistingOvernight) {
          return true; // Overlap detected with next day's booking
        }
      }
    }
    return false; // No overlap
  };

  const handleCreateBooking = async () => {
    if (!selectedDate || !newBooking.name || !newBooking.whatsapp || !newBooking.startTime || !newBooking.endTime) {
      alert('Please fill in all fields');
      return;
    }

    // Validate start time is before end time (unless it's an overnight booking)
    if (!newBooking.isOvernight && timeToMinutes(newBooking.startTime) >= timeToMinutes(newBooking.endTime)) {
      alert('Start time must be before end time (or enable overnight booking)');
      return;
    }

    // Check for time conflicts with existing bookings
    const existingBookingsForDate = getBookingsForDate(selectedDate);
    let allRelevantBookings = [...existingBookingsForDate];

    // If this is an overnight booking, also check next day's bookings for early morning conflicts
    if (newBooking.isOvernight) {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayBookings = getBookingsForDate(nextDay);
      allRelevantBookings = [...allRelevantBookings, ...nextDayBookings];
    }

    if (checkTimeOverlap(newBooking.startTime, newBooking.endTime, allRelevantBookings, newBooking.isOvernight)) {
      alert(`Choose different time - that slot is booked.`);
      return;
    }

    const timeRange = `${newBooking.startTime} - ${newBooking.endTime}`;
    const bookingData = {
      name: newBooking.name,
      whatsapp: newBooking.whatsapp,
      timeRange,
      date: formatDate(selectedDate),
    };

    try {
      await createBooking(bookingData);
      setNewBooking({ name: '', whatsapp: '', startTime: '', endTime: '', isOvernight: false });
    } catch (error) {
      // Error is already handled in the hook and displayed
      console.error('Failed to create booking:', error);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      await deleteBooking(bookingId);
    } catch (error) {
      console.error('Failed to delete booking:', error);
      alert('Failed to delete booking. Please try again.');
    }
  };

  const handleLogin = () => {
    const adminUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    
    if (loginCredentials.username === adminUsername && loginCredentials.password === adminPassword) {
      setIsAdmin(true);
      setIsLoginModalOpen(false);
      setLoginCredentials({ username: '', password: '' });
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
  };

  const getAllPreviousBookings = () => {
    const today = new Date();
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate < today;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentDate);
  const currentMonthBookings = selectedDate ? getBookingsForDate(selectedDate) : [];
  const today = new Date();
  const todayStr = formatDate(today);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex justify-center">
        <div className="container mx-auto px-3 md:px-4 py-2 md:py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviousBookingsOpen(true)}
                    className="hidden md:flex items-center gap-2"
                  >
                    <History className="h-4 w-4" />
                    Previous Bookings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviousBookingsOpen(true)}
                    className="md:hidden"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="hidden md:flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="md:hidden"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  Admin Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          <Card>
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl md:text-2xl font-bold">
              <div className="block md:hidden">
                {monthNames[currentDate.getMonth()].slice(0, 3)} {currentDate.getFullYear()}
              </div>
              <div className="hidden md:block">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
            </CardTitle>
            <div className="flex gap-1 md:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="h-8 w-8 p-0 md:h-10 md:w-auto md:px-3"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="h-8 w-8 p-0 md:h-10 md:w-auto md:px-3"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-2 md:mb-4">
            {dayNames.map(day => (
              <div
                key={day}
                className="p-1 md:p-2 text-center text-xs md:text-sm font-medium text-muted-foreground"
              >
                <span className="block md:hidden">{day.slice(0, 1)}</span>
                <span className="hidden md:block">{day}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 md:gap-1">
            {days.map((day, index) => {
              if (!day) {
                return <div key={index} className="p-1 md:p-2 h-12 md:h-20" />;
              }

              const dateStr = formatDate(day);
              const dayBookings = getBookingsForDate(day);
              const isToday = dateStr === todayStr;
              const isPast = day < today && !isToday;

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day)}
                  disabled={isPast}
                  className={`
                    p-1 md:p-2 h-12 md:h-20 border rounded-md md:rounded-lg text-left transition-colors hover:bg-accent
                    ${isToday ? 'bg-primary text-primary-foreground' : ''}
                    ${isPast ? 'opacity-50 cursor-not-allowed bg-muted' : 'cursor-pointer'}
                    ${dayBookings.length > 0 ? 'border-primary' : 'border-border'}
                    touch-manipulation
                  `}
                >
                  <div className="text-xs md:text-sm font-medium">{day.getDate()}</div>
                  {dayBookings.length > 0 && (
                    <div className="mt-0.5 md:mt-1">
                      <div className="block md:hidden">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      </div>
                      <div className="hidden md:block">
                        <Badge variant="secondary" className="text-xs">
                          {dayBookings.length} booking{dayBookings.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base md:text-lg leading-tight">
              <div className="block md:hidden">
                {selectedDate?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div className="hidden md:block">
                Bookings for {selectedDate?.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 md:space-y-6">
            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">Database Connection Issue</p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      {error.includes('Failed to fetch') 
                        ? 'Unable to connect to the booking database. Please check your internet connection and try again.'
                        : error
                      }
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="ml-2 text-red-800 border-red-300 hover:bg-red-100"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Loading bookings...</p>
              </div>
            )}

            {/* Existing Bookings */}
            <div>
              <h3 className="text-sm font-medium mb-2 md:mb-3">Existing Bookings</h3>
              {currentMonthBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings for this date</p>
              ) : (
                <div className="space-y-2">
                  {currentMonthBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-2 md:p-3 border rounded-lg bg-secondary/50 space-y-1 md:space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm md:text-base">{formatTimeRangeToAMPM(booking.timeRange)}</span>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive flex-shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {isAdmin && (
                        <>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm truncate">{booking.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm truncate">{booking.whatsapp}</span>
                          </div>
                        </>
                      )}
                      {!isAdmin && (
                        <div className="text-xs text-muted-foreground">
                          Booked
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* New Booking Form */}
            <div>
              <h3 className="text-sm font-medium mb-2 md:mb-3">Create New Booking</h3>
              
              <div className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="startTime" className="text-xs md:text-sm">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newBooking.startTime}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, startTime: e.target.value }))}
                      className="h-9 md:h-10"
                    />
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="endTime" className="text-xs md:text-sm">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newBooking.endTime}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, endTime: e.target.value }))}
                      className="h-9 md:h-10"
                    />
                  </div>
                </div>

                {/* Overnight booking checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overnight"
                    checked={newBooking.isOvernight}
                    onCheckedChange={(checked) => setNewBooking(prev => ({ ...prev, isOvernight: !!checked }))}
                  />
                  <Label htmlFor="overnight" className="text-xs md:text-sm cursor-pointer">
                    Overnight booking (ends next day)
                  </Label>
                </div>

                {/* Show real-time conflict warning */}
                {newBooking.startTime && newBooking.endTime && selectedDate && (
                  (() => {
                    const existingBookingsForDate = getBookingsForDate(selectedDate);
                    let allRelevantBookings = [...existingBookingsForDate];

                    // If this is an overnight booking, also check next day's bookings
                    if (newBooking.isOvernight) {
                      const nextDay = new Date(selectedDate);
                      nextDay.setDate(nextDay.getDate() + 1);
                      const nextDayBookings = getBookingsForDate(nextDay);
                      allRelevantBookings = [...allRelevantBookings, ...nextDayBookings];
                    }

                    const hasConflict = checkTimeOverlap(newBooking.startTime, newBooking.endTime, allRelevantBookings, newBooking.isOvernight);
                    const isValidTimeRange = newBooking.isOvernight || timeToMinutes(newBooking.startTime) < timeToMinutes(newBooking.endTime);
                    
                    if (!isValidTimeRange) {
                      return (
                        <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                          <p className="text-xs md:text-sm text-red-800 dark:text-red-200">
                            ❌ Start time must be before end time (or enable overnight booking)
                          </p>
                        </div>
                      );
                    }
                    
                    if (hasConflict) {
                      return (
                        <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                          <p className="text-xs md:text-sm text-red-800 dark:text-red-200">
                            ❌ Choose different time - that slot is booked
                          </p>
                        </div>
                      );
                    }
                    
                    const timeDisplay = newBooking.isOvernight ? 
                      `${formatTimeToAMPM(newBooking.startTime)} - ${formatTimeToAMPM(newBooking.endTime)} (+1 day)` :
                      `${formatTimeToAMPM(newBooking.startTime)} - ${formatTimeToAMPM(newBooking.endTime)}`;
                    
                    return (
                      <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs md:text-sm text-green-800 dark:text-green-200">
                          ✅ Time slot is available: {timeDisplay}
                        </p>
                      </div>
                    );
                  })()
                )}

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="name" className="text-xs md:text-sm">Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={newBooking.name}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, name: e.target.value }))}
                    className="h-9 md:h-10"
                  />
                </div>

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="whatsapp" className="text-xs md:text-sm">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    placeholder="Enter your WhatsApp number"
                    value={newBooking.whatsapp}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="h-9 md:h-10"
                  />
                </div>

                <Button 
                  onClick={handleCreateBooking}
                  disabled={(() => {
                    if (!newBooking.startTime || !newBooking.endTime || !selectedDate || loading) return true;
                    const existingBookingsForDate = getBookingsForDate(selectedDate);
                    let allRelevantBookings = [...existingBookingsForDate];

                    // If this is an overnight booking, also check next day's bookings
                    if (newBooking.isOvernight) {
                      const nextDay = new Date(selectedDate);
                      nextDay.setDate(nextDay.getDate() + 1);
                      const nextDayBookings = getBookingsForDate(nextDay);
                      allRelevantBookings = [...allRelevantBookings, ...nextDayBookings];
                    }

                    const hasConflict = checkTimeOverlap(newBooking.startTime, newBooking.endTime, allRelevantBookings, newBooking.isOvernight);
                    const isValidTimeRange = newBooking.isOvernight || timeToMinutes(newBooking.startTime) < timeToMinutes(newBooking.endTime);
                    return hasConflict || !isValidTimeRange;
                  })()}
                  className="w-full h-9 md:h-10 text-sm md:text-base"
                >
                  {loading ? 'Creating...' : 'Create Booking'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Login Modal */}
      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Admin Login</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={loginCredentials.username}
                onChange={(e) => setLoginCredentials(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={loginCredentials.password}
                onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Previous Bookings Modal */}
      <Dialog open={isPreviousBookingsOpen} onOpenChange={setIsPreviousBookingsOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Previous Bookings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {getAllPreviousBookings().length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No previous bookings found</p>
            ) : (
              <div className="space-y-3">
                {getAllPreviousBookings().map((booking) => (
                  <div
                    key={booking.id}
                    className="p-3 border rounded-lg bg-secondary/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium text-sm">{formatTimeRangeToAMPM(booking.timeRange)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(booking.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{booking.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{booking.whatsapp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </main>
      
      {/* Footer Signature */}
      <footer className="container mx-auto px-3 md:px-4 pb-4 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            Developed by <span className="font-semibold text-foreground">guruf</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CalendarBooking;