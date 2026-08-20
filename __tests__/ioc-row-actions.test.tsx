import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IocRowActions } from "@/components/cti/ioc-row-actions";
import { mockJsonResponse } from "../test-utils";
import type { CtiIoc } from "@/types/cti";

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

const ioc: CtiIoc = {
  id: "i1",
  tenantId: "t1",
  type: "IP",
  value: "185.220.101.47",
  confidence: 80,
  source: "internal",
  rawData: null,
  createdAt: "2026-08-07T00:00:00.000Z",
};

async function openMenu() {
  const user = userEvent.setup();
  render(<IocRowActions ioc={ioc} />);
  await user.click(
    screen.getByRole("button", { name: /actions for 185.220.101.47/i }),
  );
  await screen.findByRole("menu");
  return user;
}

afterEach(() => {
  jest.restoreAllMocks();
  refresh.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe("IocRowActions", () => {
  it("edit dialog has no type/value fields, only confidence/source", async () => {
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /edit ioc/i }));

    expect(await screen.findByLabelText(/confidence/i)).toHaveValue(80);
    expect(screen.getByLabelText(/source/i)).toHaveValue("internal");
    expect(screen.queryByLabelText(/^type$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^value$/i)).not.toBeInTheDocument();
  });

  it("PATCHes confidence/source on save", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ id: "i1" }, 200));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /edit ioc/i }));
    const sourceInput = await screen.findByLabelText(/source/i);
    await user.clear(sourceInput);
    await user.type(sourceInput, "updated-source");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("185.220.101.47 updated"),
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/cti/iocs/i1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      confidence: 80,
      source: "updated-source",
    });
  });

  it("delete confirmation calls DELETE and shows a success toast", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({}, 200));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /delete ioc/i }));
    await user.click(
      await screen.findByRole("button", { name: /^delete ioc$/i }),
    );

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("185.220.101.47 deleted"),
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/cti/iocs/i1");
    expect(init.method).toBe("DELETE");
  });

  it("shows the backend's error message on delete failure", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ message: "IOC not found" }, 404));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /delete ioc/i }));
    await user.click(
      await screen.findByRole("button", { name: /^delete ioc$/i }),
    );

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("IOC not found"),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
