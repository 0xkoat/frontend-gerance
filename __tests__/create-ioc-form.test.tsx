import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateIocForm } from "@/components/cti/create-ioc-form";
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

describe("CreateIocForm", () => {
  beforeEach(() => {
    refresh.mockClear();
    toastSuccess.mockClear();
  });

  it("shows a validation error and never calls the backend for an empty value", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<CreateIocForm />);

    await user.click(screen.getByRole("button", { name: /add ioc/i }));

    expect(await screen.findByText(/value is required/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts type/value/confidence/source to /api/cti/iocs and shows a success toast", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ id: "i1", value: "1.2.3.4" }, 201));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<CreateIocForm />);

    await user.type(screen.getByLabelText(/value/i), "1.2.3.4");
    await user.clear(screen.getByLabelText(/confidence/i));
    await user.type(screen.getByLabelText(/confidence/i), "75");
    await user.type(screen.getByLabelText(/source/i), "threat feed");
    await user.click(screen.getByRole("button", { name: /add ioc/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("1.2.3.4 added"),
    );
    expect(refresh).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/cti/iocs");
    expect(JSON.parse(init.body)).toEqual({
      type: "IP",
      value: "1.2.3.4",
      confidence: 75,
      source: "threat feed",
    });
  });
});
