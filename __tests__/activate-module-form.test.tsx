import { render, screen, waitFor } from "@testing-library/react";
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
  it("posts only the picked module", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          id: "m1",
          tenantId: "t1",
          moduleName: "SIEM",
          isActive: true,
          minAnalystLevel: "L2",
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
    expect(Object.keys(body)).toEqual(["moduleName"]);
    expect(refresh).toHaveBeenCalled();
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
