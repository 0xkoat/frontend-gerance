import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreatePlaybookForm } from "@/components/soar/create-playbook-form";
import { mockJsonResponse } from "../test-utils";

// userEvent.type()'s keyboard DSL treats `{`/`}` as special-sequence delimiters, which makes
// typing raw JSON awkward to escape reliably — fireEvent.change() sets the textarea's value
// directly instead, for the two tests below that need real JSON/invalid-JSON content.

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

describe("CreatePlaybookForm", () => {
  beforeEach(() => {
    refresh.mockClear();
    toastSuccess.mockClear();
  });

  it("shows a validation error and never calls the backend for an empty name", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<CreatePlaybookForm />);

    await user.click(screen.getByRole("button", { name: /create playbook/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an 'invalid JSON' error and never calls the backend for malformed actions", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<CreatePlaybookForm />);

    await user.type(screen.getByLabelText(/name/i), "Auto-contain");
    fireEvent.change(screen.getByLabelText(/actions/i), {
      target: { value: "{not valid json" },
    });
    await user.click(screen.getByRole("button", { name: /create playbook/i }));

    expect(await screen.findByText(/enter valid json/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts name/triggerCondition/actions and shows a success toast", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ id: "p1" }, 201));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<CreatePlaybookForm />);

    await user.type(screen.getByLabelText(/name/i), "Auto-contain critical");
    fireEvent.change(screen.getByLabelText(/actions/i), {
      target: { value: '{"notify": "soc-team"}' },
    });
    await user.click(screen.getByRole("button", { name: /create playbook/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        "Auto-contain critical created",
      ),
    );
    expect(refresh).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/soar/playbooks");
    expect(JSON.parse(init.body)).toEqual({
      name: "Auto-contain critical",
      triggerCondition: { severity: "HIGH" },
      actions: { notify: "soc-team" },
    });
  });
});
