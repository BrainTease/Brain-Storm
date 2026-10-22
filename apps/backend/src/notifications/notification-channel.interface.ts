/** Delivery channels a notification can be sent through. */
export type NotificationChannelName = 'email' | 'inapp' | 'push';

/**
 * Every notification channel declares which channel it delivers through, so the router and the
 * tests can refer to channels by one name. Each channel keeps its own send method.
 */
export interface NotificationChannel {
  readonly channel: NotificationChannelName;
}
