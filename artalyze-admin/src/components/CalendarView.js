import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarView.css'; // Custom styles for your Calendar

const CalendarView = ({ onSelectDate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleDateChange = (date) => {
    setSelectedDate(date);
    onSelectDate(date); // Pass selected date to the parent component to load the details
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
