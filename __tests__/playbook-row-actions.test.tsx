import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlaybookRowActions } from "@/components/soar/playbook-row-actions";
import { mockJsonResponse } from "../test-utils";
import type { SoarPlaybook } from "@/types/soar";

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

const playbook: SoarPlaybook = {
  id: "p1",
  tenantId: "t1",
  name: "Auto-contain critical",
  triggerCondition: { severity: "CRITICAL" },
  actions: { notify: "soc-team" },
  isActive: true,
  createdAt: "2026-08-07T00:00:00.000Z",
};

async function openMenu() {
  const user = userEvent.setup();
  render(<PlaybookRowActions playbook={playbook} />);
  await user.click(
    screen.getByRole("button", { name: /actions for auto-contain critical/i }),
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

describe("PlaybookRowActions", () => {
  it("edit dialog pre-fills name, severity, actions JSON, and the active toggle", async () => {
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /edit playbook/i }));

    expect(await screen.findByLabelText(/name/i)).toHaveValue(
      "Auto-contain critical",
    );
    expect(screen.getByLabelText(/actions \(json\)/i)).toHaveValue(
      JSON.stringify({ notify: "soc-team" }, null, 2),
    );
    expect(screen.getByRole("checkbox", { name: /active/i })).toBeChecked();
  });

  it("PATCHes the edited fields on save", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ id: "p1" }, 200));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /edit playbook/i }));
    await user.click(screen.getByRole("checkbox", { name: /active/i })); // toggle off
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        "Auto-contain critical updated",
      ),
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/soar/playbooks/p1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      name: "Auto-contain critical",
      triggerCondition: { severity: "CRITICAL" },
      actions: { notify: "soc-team" },
      isActive: false,
    });
  });

  it("shows an 'invalid JSON' field error and never calls the backend", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: /edit playbook/i }));
    fireEvent.change(screen.getByLabelText(/actions \(json\)/i), {
      target: { value: "not json" },
    });
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/enter valid json/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("delete confirmation surfaces the backend's isActive-pointing message on 409", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          message:
            "Cannot delete a playbook that has existing executions — deactivate it instead (PATCH with isActive: false)",
        },
        409,
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu();

    await user.click(
      screen.getByRole("menuitem", { name: /delete playbook/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /^delete playbook$/i }),
    );

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        expect.stringContaining("isActive: false"),
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
