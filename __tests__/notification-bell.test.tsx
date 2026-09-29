import { act, render, screen, waitFor } from "@testing-library/react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { mockJsonResponse } from "../test-utils";
import type { AppNotification } from "@/types/tickets";

const refresh = jest.fn();
const push = jest.fn();
const toastFn = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
}));
jest.mock("sonner", () => ({
  toast: Object.assign((...args: unknown[]) => toastFn(...args), {
    error: jest.fn(),
  }),
}));

// jsdom has no EventSource; this stands in for the per-user SSE connection.
class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  closed = false;
  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }
  close() {
    this.closed = true;
  }
  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
}

const notification: AppNotification = {
  id: "n-1",
  userId: "admin-1",
  ticketId: "t-1",
  type: "TICKET_CREATED",
  readAt: null,
  createdAt: "2026-09-29T08:00:00.000Z",
  ticket: {
    id: "t-1",
    title: "SIEM unreachable",
    category: "MODULES",
    moduleName: "SIEM",
    status: "OPEN",
  },
};

beforeEach(() => {
  MockEventSource.instances = [];
  (global as unknown as { EventSource: unknown }).EventSource = MockEventSource;
  refresh.mockClear();
  push.mockClear();
  toastFn.mockClear();
});

describe("NotificationBell", () => {
  it("shows the stored unread count and subscribes to the stream", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse(
          { notifications: [notification], unreadCount: 1 },
          200,
        ),
      ) as unknown as typeof fetch;

    render(<NotificationBell />);

    expect(
      await screen.findByRole("button", { name: "Notifications, 1 unread" }),
    ).toBeInTheDocument();
    expect(MockEventSource.instances[0].url).toBe("/api/events/stream");
  });

  it("adds a live notification, toasts it and refreshes the page data", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ notifications: [], unreadCount: 0 }, 200),
      ) as unknown as typeof fetch;

    render(<NotificationBell />);
    await screen.findByRole("button", { name: "Notifications" });

    act(() => {
      MockEventSource.instances[0].emit({ userId: "admin-1", notification });
    });

    expect(
      await screen.findByRole("button", { name: "Notifications, 1 unread" }),
    ).toBeInTheDocument();
    expect(toastFn).toHaveBeenCalledWith("New ticket: SIEM unreachable");
    expect(refresh).toHaveBeenCalled();
  });

  it("ignores a malformed frame", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ notifications: [], unreadCount: 0 }, 200),
      ) as unknown as typeof fetch;

    render(<NotificationBell />);
    await screen.findByRole("button", { name: "Notifications" });

    act(() => {
      MockEventSource.instances[0].onmessage?.({
        data: "not json",
      } as MessageEvent<string>);
    });

    await waitFor(() => expect(toastFn).not.toHaveBeenCalled());
  });

  it("closes the stream on unmount", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ notifications: [], unreadCount: 0 }, 200),
      ) as unknown as typeof fetch;

    const { unmount } = render(<NotificationBell />);
    await screen.findByRole("button", { name: "Notifications" });
    unmount();

    expect(MockEventSource.instances[0].closed).toBe(true);
  });
});
