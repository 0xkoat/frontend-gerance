"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { describeNotification } from "@/lib/notifications";
import type { AppNotification, NotificationList } from "@/types/tickets";

// Stored notifications (so nothing is lost while offline) plus a live push over the
// per-user SSE stream: each notification.created frame is prepended and toasted.
export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications")
      .then((res) =>
        res.ok ? (res.json() as Promise<NotificationList>) : null,
      )
      .then((data) => {
        if (active && data) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      })
      // The bell stays empty; the next live event or page load retries.
      .catch(() => {});

    const source = new EventSource("/api/events/stream", {
      withCredentials: true,
    });
    source.onmessage = (event: MessageEvent<string>) => {
      let payload: { notification?: AppNotification };
      try {
        payload = JSON.parse(event.data) as { notification?: AppNotification };
      } catch {
        return;
      }
      const incoming = payload.notification;
      if (!incoming) return;

      setNotifications((current) => [incoming, ...current].slice(0, 30));
      setUnreadCount((count) => count + 1);
      toast(describeNotification(incoming));
      router.refresh();
    };

    return () => {
      active = false;
      source.close();
    };
  }, [router]);

  async function open(notification: AppNotification) {
    if (!notification.readAt) {
      try {
        const res = await fetch(`/api/notifications/${notification.id}/read`, {
          method: "PATCH",
        });
        if (res.ok) {
          const data = (await res.json()) as { unreadCount: number };
          setUnreadCount(data.unreadCount);
          setNotifications((current) =>
            current.map((n) =>
              n.id === notification.id
                ? { ...n, readAt: new Date().toISOString() }
                : n,
            ),
          );
        }
      } catch {
        // Still navigate; the unread state refreshes on the next load.
      }
    }
    router.push("/tickets");
  }

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) return;
      const readAt = new Date().toISOString();
      setUnreadCount(0);
      setNotifications((current) =>
        current.map((n) => (n.readAt ? n : { ...n, readAt })),
      );
    } catch {
      toast.error("Could not reach the server. Try again.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative ml-auto"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-4 font-medium text-white"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-80">
        {notifications.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          <>
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => open(n)}
                className="flex items-start gap-2"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    n.readAt ? "bg-transparent" : "bg-red-500",
                  )}
                />
                <span className="flex flex-col">
                  <span className={cn("text-sm", !n.readAt && "font-medium")}>
                    {describeNotification(n)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
