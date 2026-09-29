// Mirrors backend/prisma/schema.prisma's Ticket/Notification models and enums (v2 Phase 4).
import type { ModuleName } from "@/types/modules";

export const TicketCategory = {
  MODULES: "MODULES",
  ACCOUNT_ACCESS: "ACCOUNT_ACCESS",
  OTHER: "OTHER",
} as const;
export type TicketCategory =
  (typeof TicketCategory)[keyof typeof TicketCategory];

export const TicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  MODULES: "Modules",
  ACCOUNT_ACCESS: "Account & Access",
  OTHER: "Other",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

export interface Ticket {
  id: string;
  tenantId: string;
  tenant: { name: string };
  createdById: string | null;
  createdByName: string;
  createdByEmail: string;
  title: string;
  description: string;
  category: TicketCategory;
  moduleName: ModuleName | null;
  status: TicketStatus;
  statusChangedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = "TICKET_CREATED" | "TICKET_STATUS_CHANGED";

export interface AppNotification {
  id: string;
  userId: string;
  ticketId: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
  ticket: Pick<Ticket, "id" | "title" | "category" | "moduleName" | "status">;
}

export interface NotificationList {
  notifications: AppNotification[];
  unreadCount: number;
}
