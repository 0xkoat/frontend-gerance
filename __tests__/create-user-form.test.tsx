import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateUserForm } from "@/components/users/create-user-form";
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

describe("CreateUserForm", () => {
  beforeEach(() => {
    refresh.mockClear();
    toastSuccess.mockClear();
  });

  it("shows validation errors instead of submitting when required fields are empty", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to /api/users with the default ANALYST role and shows a success toast", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ name: "Ahmed Trabelsi" }, 201));
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/full name/i), "Ahmed Trabelsi");
    await user.type(
      screen.getByLabelText(/work email/i),
      "ahmed@meridian.test",
    );
    await user.type(screen.getByLabelText(/phone number/i), "+21620000010");
    await user.type(screen.getByLabelText(/temporary password/i), "Tempo456!");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody).toMatchObject({
      name: "Ahmed Trabelsi",
      email: "ahmed@meridian.test",
      role: "ANALYST",
    });
  });

  it("shows the backend's error message on failure without refreshing", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse(
          { message: "A user with this email already exists" },
          409,
        ),
      ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/full name/i), "Ahmed Trabelsi");
    await user.type(
      screen.getByLabelText(/work email/i),
      "ahmed@meridian.test",
    );
    await user.type(screen.getByLabelText(/phone number/i), "+21620000010");
    await user.type(screen.getByLabelText(/temporary password/i), "Tempo456!");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
