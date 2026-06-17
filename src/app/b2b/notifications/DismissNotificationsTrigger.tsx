'use client';

import { useEffect } from 'react';
import { dismissNotificationsAction } from '@/app/actions';

export default function DismissNotificationsTrigger() {
  useEffect(() => {
    // Automatically trigger notification dismissal in background
    dismissNotificationsAction().catch(err => {
      console.error('Failed to dismiss B2B notifications:', err);
    });
  }, []);

  return null;
}
