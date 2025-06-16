import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarView.css'; // Custom styles for your Calendar

// A reusable calendar component for selecting dates
const CalendarView = ({ onSelectDate }) => {
  // Keep track of the currently selected date
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Update the selected date and notify the parent component
  const handleDateChange = (date) => {
    setSelectedDate(date);
    onSelectDate(date);
  };

  return (
    <div className="calendar-view">
      <h1>Image Pair Schedule</h1>
      <Calendar
        onChange={handleDateChange}
        value={selectedDate}
        calendarType="ISO 8601"
      />
    </div>
  );
};

export default CalendarView;
