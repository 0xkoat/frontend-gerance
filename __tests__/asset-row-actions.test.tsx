import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetRowActions } from "@/components/vm/asset-row-actions";
import { mockJsonResponse } from "../test-utils";
import type { VmAsset } from "@/types/vm";

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

const asset: VmAsset = {
  id: "a1",
  tenantId: "t1",
  name: "web-1",
  ip: "10.0.0.5",
  type: "server",
  createdAt: "2026-01-01T00:00:00.000Z",
};

async function openMenu() {
  const user = userEvent.setup();
  render(<AssetRowActions asset={asset} />);
  await user.click(screen.getByRole("button", { name: /actions for web-1/i }));
  await screen.findByRole("menu");
  return user;
}

afterEach(() => {
  jest.restoreAllMocks();
  refresh.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe("AssetRowActions", () => {
  it("opens the actions menu with edit and delete", async () => {
    await openMenu();

    expect(
      screen.getByRole("menuitem", { name: /edit asset/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /delete asset/i }),
    ).toBeInTheDocument();
  });

  it("edit dialog pre-fills the current values and PATCHes on submit", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ id: "a1", name: "web-1-renamed" }, 200),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /edit asset/i }));

    const nameInput = await screen.findByLabelText(/name/i);
    expect(nameInput).toHaveValue("web-1");
    await user.clear(nameInput);
    await user.type(nameInput, "web-1-renamed");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("web-1-renamed updated"),
    );
    expect(refresh).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/vm/assets/a1");
    expect(init.method).toBe("PATCH");
  });

  it("delete confirmation calls DELETE and shows a success toast", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({}, 200));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /delete asset/i }));
    await user.click(
      await screen.findByRole("button", { name: /^delete asset$/i }),
    );

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("web-1 deleted"),
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/vm/assets/a1");
    expect(init.method).toBe("DELETE");
  });

  it("shows the backend's 409 message when the asset still has vulnerabilities", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ message: "Asset still has vulnerabilities" }, 409),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /delete asset/i }));
    await user.click(
      await screen.findByRole("button", { name: /^delete asset$/i }),
    );

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Asset still has vulnerabilities",
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
