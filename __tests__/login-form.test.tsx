import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/login-form";
import { mockJsonResponse } from "../test-utils";

const push = jest.fn();
const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
  });

  it("shows a validation error instead of submitting when the email is empty", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/password/i), "whatever");
    await user.click(
      screen.getByRole("button", { name: /sign in to secops/i }),
    );

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it("posts to /api/auth/login and redirects to /dashboard on success", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ mustChangePassword: false }, 200));
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(
      screen.getByLabelText(/work email/i),
      "youssef@secops.local",
    );
    await user.type(
      screen.getByLabelText(/password/i),
      "correct horse battery staple",
    );
    await user.click(
      screen.getByRole("button", { name: /sign in to secops/i }),
    );

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("redirects to /change-password when the backend says mustChangePassword", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ mustChangePassword: true }, 200),
      ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), "sara@meridian.test");
    await user.type(screen.getByLabelText(/password/i), "Tempo123!");
    await user.click(
      screen.getByRole("button", { name: /sign in to secops/i }),
    );

    await waitFor(() => expect(push).toHaveBeenCalledWith("/change-password"));
  });

  it("shows the backend's error message on a failed login without redirecting", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ message: "Invalid credentials" }, 401),
      ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(
      screen.getByLabelText(/work email/i),
      "youssef@secops.local",
    );
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(
      screen.getByRole("button", { name: /sign in to secops/i }),
    );

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
