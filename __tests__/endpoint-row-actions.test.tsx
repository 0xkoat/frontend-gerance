import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EndpointRowActions } from "@/components/module-endpoints/endpoint-row-actions";
import { mockJsonResponse } from "../test-utils";
import type { ModuleEndpoint } from "@/types/modules";

const refresh = jest.fn();
const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const unconfigured: ModuleEndpoint = {
  moduleName: "SIEM",
  protocol: "HTTPS",
  host: null,
  port: null,
  path: "/",
  updatedAt: "2026-09-28T10:00:00.000Z",
  updatedById: null,
};

const configured: ModuleEndpoint = {
  ...unconfigured,
  host: "10.0.0.5",
  port: 5601,
};

beforeEach(() => {
  refresh.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe("EndpointRowActions", () => {
  it("disables Test connection until the endpoint is configured", () => {
    render(<EndpointRowActions endpoint={unconfigured} />);

    expect(
      screen.getByRole("button", { name: /test connection/i }),
    ).toBeDisabled();
  });

  it("saves host, port and path through the BFF route", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({}, 200));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<EndpointRowActions endpoint={unconfigured} />);
    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await user.type(await screen.findByLabelText(/host/i), "10.0.0.5");
    await user.type(screen.getByLabelText(/^port$/i), "5601");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/module-endpoints/SIEM");
    expect(JSON.parse(init.body)).toEqual({
      protocol: "HTTPS",
      host: "10.0.0.5",
      port: 5601,
      path: "/",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a field error for a URL typed into the host field", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<EndpointRowActions endpoint={unconfigured} />);
    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await user.type(await screen.findByLabelText(/host/i), "https://10.0.0.5");
    await user.type(screen.getByLabelText(/^port$/i), "5601");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText(/not a url/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a reachable endpoint", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ reachable: true, latencyMs: 3 }, 200),
      ) as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<EndpointRowActions endpoint={configured} />);
    await user.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("SIEM is reachable", {
        description: "Answered in 3 ms.",
      }),
    );
  });

  it("reports an unreachable endpoint with the reason", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ reachable: false, error: "ECONNREFUSED" }, 200),
      ) as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<EndpointRowActions endpoint={configured} />);
    await user.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("SIEM is not reachable", {
        description: "ECONNREFUSED",
      }),
    );
  });
});
