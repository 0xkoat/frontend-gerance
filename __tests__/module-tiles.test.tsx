import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModuleTiles } from "@/components/modules/module-tiles";
import { mockJsonResponse } from "../test-utils";
import { navigateTo } from "@/lib/navigate";
import type { AvailableModule } from "@/types/modules";

const toastError = jest.fn();

// Relative path on purpose: the @/ alias is rewritten at compile time in imports only,
// not inside jest.mock() strings.
jest.mock("../src/lib/navigate", () => ({ navigateTo: jest.fn() }));
jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

const modules: AvailableModule[] = [
  {
    moduleName: "CTI",
    minAnalystLevel: "L1",
    configured: true,
    canLaunch: true,
  },
  {
    moduleName: "VM",
    minAnalystLevel: "L1",
    configured: false,
    canLaunch: false,
  },
];

beforeEach(() => {
  toastError.mockClear();
  (navigateTo as jest.Mock).mockClear();
});

describe("ModuleTiles", () => {
  it("launches through the BFF route and navigates to the returned URL", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ url: "https://10.0.0.7:8443/" }, 200),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<ModuleTiles modules={modules} showLevels={false} />);
    await user.click(screen.getByRole("button", { name: /open cti/i }));

    await waitFor(() =>
      expect(navigateTo).toHaveBeenCalledWith("https://10.0.0.7:8443/"),
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/modules/CTI/launch");
    expect(init.method).toBe("POST");
  });

  it("shows the backend's refusal and stays on the page", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse(
          { message: "CTI requires analyst level L2 or higher" },
          403,
        ),
      ) as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<ModuleTiles modules={modules} showLevels={false} />);
    await user.click(screen.getByRole("button", { name: /open cti/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "CTI requires analyst level L2 or higher",
      ),
    );
    expect(navigateTo).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /open cti/i })).toBeEnabled();
  });

  it("can't open a module whose endpoint isn't configured", () => {
    render(<ModuleTiles modules={modules} showLevels={false} />);

    expect(
      screen.getByRole("button", { name: /not configured yet/i }),
    ).toBeDisabled();
  });

  it("shows minimum levels only when asked (Admins)", () => {
    const { rerender } = render(
      <ModuleTiles modules={modules} showLevels={false} />,
    );
    expect(screen.queryByText(/min level/i)).not.toBeInTheDocument();

    rerender(<ModuleTiles modules={modules} showLevels />);
    expect(screen.getAllByText("Min level L1")).toHaveLength(2);
  });

  it("says so when nothing is available", () => {
    render(<ModuleTiles modules={[]} showLevels={false} />);

    expect(screen.getByText(/no modules are available/i)).toBeInTheDocument();
  });
});
