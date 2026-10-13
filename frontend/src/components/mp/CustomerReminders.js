import React, { useEffect, useState } from 'react';
import { mp, customerHdr } from '../../utils/mpApi';
import BookingAlerts from './BookingAlerts';

// Site-wide reminder pop-up for logged-in customers 15 min before their booking.
export default function CustomerReminders() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const load = () => {
      if (!localStorage.getItem('cg_auth_token')) return;
      mp.get('/my/bookings', customerHdr()).then((r) => setItems([
        ...r.data.consultations.map((b) => ({ ...b, _t: `Dermatologist consultation with Dr. ${b.doctor_name}` })),
        ...r.data.home_bookings.map((b) => ({ ...b, _t: b.service_name })),
      ])).catch(() => {});
    };
    load();
    const t = setInterval(load, 120000);
    return () => clearInterval(t);
  }, []);
  return <BookingAlerts floating bookings={items} title={(b) => b._t} testid="customer-reminders"
    activeStatuses={['confirmed', 'assigned', 'en_route', 'arrived', 'pending_assignment']} />;
}
