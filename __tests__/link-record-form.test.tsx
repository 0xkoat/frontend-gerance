import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkRecordForm } from "@/components/dfir/link-record-form";
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

describe("LinkRecordForm", () => {
  beforeEach(() => {
    refresh.mockClear();
    toastSuccess.mockClear();
  });

  it("shows a validation error and never calls the backend for a non-UUID id", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<LinkRecordForm incidentId="i1" />);

    await user.type(screen.getByLabelText(/record id/i), "not-a-uuid");
    await user.click(screen.getByRole("button", { name: /link record/i }));

    expect(await screen.findByText(/enter a valid uuid/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts sourceType/sourceId to the incident's links route and shows a success toast", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ id: "l1" }, 201));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<LinkRecordForm incidentId="i1" />);

    await user.type(
      screen.getByLabelText(/record id/i),
      "11111111-1111-4111-8111-111111111111",
    );
    await user.click(screen.getByRole("button", { name: /link record/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Record linked"),
    );
    expect(refresh).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/dfir/incidents/i1/links");
    expect(JSON.parse(init.body)).toEqual({
      sourceType: "SIEM_ALERT",
      sourceId: "11111111-1111-4111-8111-111111111111",
    });
  });
});
