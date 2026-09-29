import { TICKET_STATUS_LABELS, type AppNotification } from "@/types/tickets";

// One line of text for a notification, shared by the bell list and the live toast.
export function describeNotification(notification: AppNotification): string {
  const { ticket } = notification;
  return notification.type === "TICKET_CREATED"
    ? `New ticket: ${ticket.title}`
    : `"${ticket.title}" is now ${TICKET_STATUS_LABELS[ticket.status]}`;
}
