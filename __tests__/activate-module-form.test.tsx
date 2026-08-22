import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivateModuleForm } from "@/components/tenants/activate-module-form";
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

beforeEach(() => {
  refresh.mockClear();
  toastSuccess.mockClear();
});

describe("ActivateModuleForm", () => {
  it("posts the picked module with no config when the JSON field is left blank", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          id: "m1",
          tenantId: "t1",
          moduleName: "SIEM",
          isActive: true,
          config: null,
        },
        201,
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<ActivateModuleForm tenantId="t1" alreadyActive={[]} />);
    await user.click(screen.getByRole("button", { name: /activate module/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tenants/t1/modules");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body.moduleName).toBeTruthy();
    expect(body.config).toBeUndefined();
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a field error and never calls the backend for invalid config JSON", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<ActivateModuleForm tenantId="t1" alreadyActive={[]} />);
    const textarea = screen.getByLabelText(/config \(json, optional\)/i);
    fireEvent.change(textarea, { target: { value: "{not valid json" } });
    await user.click(screen.getByRole("button", { name: /activate module/i }));

    expect(await screen.findByText(/enter valid json/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("filters already-active modules out of the picker", () => {
    render(
      <ActivateModuleForm
        tenantId="t1"
        alreadyActive={["SIEM", "SOAR", "CTI", "EDR", "DFIR"] as never}
      />,
    );

    // Only VM is left, so the Select's own trigger renders it directly rather than a
    // generic placeholder.
    expect(screen.getByText("VM")).toBeInTheDocument();
  });

  it("shows a message instead of a form once every module is already active", () => {
    render(
      <ActivateModuleForm
        tenantId="t1"
        alreadyActive={["SIEM", "SOAR", "CTI", "EDR", "DFIR", "VM"] as never}
      />,
    );

    expect(
      screen.getByText(/every module is already configured/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /activate module/i }),
    ).not.toBeInTheDocument();
  });
});
