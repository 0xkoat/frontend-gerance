import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TenantModuleRowActions } from "@/components/tenants/tenant-module-row-actions";
import { mockJsonResponse } from "../test-utils";
import type { TenantModule } from "@/types/security";

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

const tenantModule: TenantModule = {
  id: "m1",
  tenantId: "t1",
  moduleName: "VM" as never,
  isActive: true,
  config: { apiKey: "secret" },
};

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /actions for vm/i }));
  return screen.findByRole("menu");
}

beforeEach(() => {
  refresh.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe("TenantModuleRowActions", () => {
  it("edit dialog pre-fills isActive and the current config", async () => {
    const user = userEvent.setup();
    render(<TenantModuleRowActions tenantId="t1" module={tenantModule} />);

    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: /^edit$/i }));

    expect(await screen.findByText("Edit VM")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /active/i })).toBeChecked();
    expect(screen.getByLabelText(/config \(json\)/i)).toHaveValue(
      JSON.stringify({ apiKey: "secret" }, null, 2),
    );
  });

  it("PATCHes isActive/config on save", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          id: "m1",
          tenantId: "t1",
          moduleName: "VM",
          isActive: false,
          config: null,
        },
        200,
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<TenantModuleRowActions tenantId="t1" module={tenantModule} />);
    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: /^edit$/i }));

    await user.click(screen.getByRole("checkbox", { name: /active/i }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tenants/t1/modules/VM");
    expect(init?.method).toBe("PATCH");
    const body = JSON.parse(init?.body as string);
    expect(body.isActive).toBe(false);
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a field error for invalid config JSON without calling the backend", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<TenantModuleRowActions tenantId="t1" module={tenantModule} />);
    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: /^edit$/i }));

    const textarea = screen.getByLabelText(/config \(json\)/i);
    fireEvent.change(textarea, { target: { value: "{not valid" } });
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText(/enter valid json/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes the module on confirm, and surfaces a backend error via toast otherwise", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse(
          { message: "VM is not configured for this tenant" },
          404,
        ),
      ) as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<TenantModuleRowActions tenantId="t1" module={tenantModule} />);
    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: /^remove$/i }));

    expect(await screen.findByText(/remove vm\?/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^remove$/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "VM is not configured for this tenant",
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
