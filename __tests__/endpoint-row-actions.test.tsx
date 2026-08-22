import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EndpointRowActions } from "@/components/edr/endpoint-row-actions";
import { mockJsonResponse } from "../test-utils";
import type { EdrEndpoint } from "@/types/edr";

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

const endpoint: EdrEndpoint = {
  id: "e1",
  tenantId: "t1",
  hostname: "ws-042",
  ip: "10.0.0.9",
  os: "Windows 11",
  status: "ONLINE",
  lastSeen: "2026-08-07T00:00:00.000Z",
};

async function openMenu() {
  const user = userEvent.setup();
  render(<EndpointRowActions endpoint={endpoint} />);
  await user.click(screen.getByRole("button", { name: /actions for ws-042/i }));
  await screen.findByRole("menu");
  return user;
}

afterEach(() => {
  jest.restoreAllMocks();
  refresh.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe("EndpointRowActions", () => {
  it("opens the actions menu with edit and delete, no create option", async () => {
    await openMenu();

    expect(
      screen.getByRole("menuitem", { name: /edit endpoint/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /delete endpoint/i }),
    ).toBeInTheDocument();
  });

  it("edit dialog pre-fills the current values and PATCHes on submit", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ id: "e1", hostname: "ws-042-renamed" }, 200),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /edit endpoint/i }));

    const hostnameInput = await screen.findByLabelText(/hostname/i);
    expect(hostnameInput).toHaveValue("ws-042");
    await user.clear(hostnameInput);
    await user.type(hostnameInput, "ws-042-renamed");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("ws-042-renamed updated"),
    );
    expect(refresh).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/edr/endpoints/e1");
    expect(init.method).toBe("PATCH");
  });

  it("delete confirmation calls DELETE and shows a success toast", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({}, 200));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(
      screen.getByRole("menuitem", { name: /delete endpoint/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /^delete endpoint$/i }),
    );

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("ws-042 deleted"),
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/edr/endpoints/e1");
    expect(init.method).toBe("DELETE");
  });

  it("shows the backend's DECOMMISSIONED-pointing message on a 409", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          message:
            "Cannot delete an endpoint that has existing detections — mark it DECOMMISSIONED instead (PATCH with status)",
        },
        409,
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(
      screen.getByRole("menuitem", { name: /delete endpoint/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /^delete endpoint$/i }),
    );

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        expect.stringContaining("DECOMMISSIONED"),
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
