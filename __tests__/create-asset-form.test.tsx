import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateAssetForm } from "@/components/vm/create-asset-form";
import { mockJsonResponse } from "../test-utils";

const refresh = jest.fn();
const toastSuccess = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: jest.fn(),
  },
}));

describe("CreateAssetForm", () => {
  beforeEach(() => {
    refresh.mockClear();
    toastSuccess.mockClear();
  });

  it("shows a validation error and never calls the backend for an invalid IP", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<CreateAssetForm />);

    await user.type(screen.getByLabelText(/name/i), "web-1");
    await user.type(screen.getByLabelText(/ip address/i), "not-an-ip");
    await user.type(screen.getByLabelText(/type/i), "server");
    await user.click(screen.getByRole("button", { name: /add asset/i }));

    expect(
      await screen.findByText(/enter a valid ip address/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts valid fields to /api/vm/assets and shows a success toast", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ id: "a1", name: "web-1" }, 201));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<CreateAssetForm />);

    await user.type(screen.getByLabelText(/name/i), "web-1");
    await user.type(screen.getByLabelText(/ip address/i), "10.0.0.5");
    await user.type(screen.getByLabelText(/type/i), "server");
    await user.click(screen.getByRole("button", { name: /add asset/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("web-1 added"),
    );
    expect(refresh).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/vm/assets");
    expect(JSON.parse(init.body)).toEqual({
      name: "web-1",
      ip: "10.0.0.5",
      type: "server",
    });
  });

  it("shows the backend's error message on failure instead of a generic one", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse(
          { message: "An asset with this IP already exists" },
          409,
        ),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<CreateAssetForm />);

    await user.type(screen.getByLabelText(/name/i), "web-1");
    await user.type(screen.getByLabelText(/ip address/i), "10.0.0.5");
    await user.type(screen.getByLabelText(/type/i), "server");
    await user.click(screen.getByRole("button", { name: /add asset/i }));

    expect(
      await screen.findByText(/an asset with this ip already exists/i),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
