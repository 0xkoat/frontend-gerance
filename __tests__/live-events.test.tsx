import { render } from "@testing-library/react";
import { act } from "@testing-library/react";
import { LiveEvents } from "@/components/security/live-events";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

// jsdom has no built-in EventSource — a small stand-in that records what it was
// constructed with and lets tests dispatch a synthetic message, matching the shape
// LiveEvents actually touches (onmessage, close()).
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  withCredentials?: boolean;
  onmessage: ((event: MessageEvent) => void) | null = null;
  closed = false;

  constructor(url: string, init?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = init?.withCredentials;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  (global as unknown as { EventSource: typeof MockEventSource }).EventSource =
    MockEventSource;
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  refresh.mockClear();
  toastError.mockClear();
});

describe("LiveEvents", () => {
  it("opens a same-origin, credentialed EventSource to the streaming proxy and renders nothing", () => {
    const { container } = render(<LiveEvents />);

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe("/api/events/stream");
    expect(MockEventSource.instances[0].withCredentials).toBe(true);
    expect(container).toBeEmptyDOMElement();
  });

  it("toasts on a critical *.created event and schedules a debounced refresh", () => {
    jest.useFakeTimers();
    render(<LiveEvents />);
    const source = MockEventSource.instances[0];

    act(() => {
      source.emit({
        tenantId: "t1",
        source: "SIEM",
        type: "alert",
        severity: "CRITICAL",
        data: { title: "Brute force — RDP exposed" },
      });
    });

    expect(toastError).toHaveBeenCalledWith("Brute force — RDP exposed", {
      description: "New critical event",
    });
    expect(refresh).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not toast on a non-critical *.created event, but still refreshes", () => {
    jest.useFakeTimers();
    render(<LiveEvents />);
    const source = MockEventSource.instances[0];

    act(() => {
      source.emit({
        tenantId: "t1",
        source: "EDR",
        type: "detection",
        severity: "LOW",
        data: {},
      });
    });

    expect(toastError).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("debounces bursts of events into a single refresh", () => {
    jest.useFakeTimers();
    render(<LiveEvents />);
    const source = MockEventSource.instances[0];

    act(() => {
      source.emit({
        tenantId: "t1",
        source: "SIEM",
        recordId: "r1",
        status: "ESCALATED",
      });
      source.emit({
        tenantId: "t1",
        source: "SIEM",
        recordId: "r2",
        status: "OPEN",
      });
      source.emit({
        tenantId: "t1",
        source: "SIEM",
        recordId: "r3",
        status: "OPEN",
      });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("ignores unrecognized frame shapes", () => {
    jest.useFakeTimers();
    render(<LiveEvents />);
    const source = MockEventSource.instances[0];

    act(() => {
      source.emit({ foo: "bar" });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("closes the connection on unmount", () => {
    const { unmount } = render(<LiveEvents />);
    const source = MockEventSource.instances[0];

    unmount();

    expect(source.closed).toBe(true);
  });
});
