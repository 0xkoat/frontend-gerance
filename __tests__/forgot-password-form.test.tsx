import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { mockJsonResponse } from "../test-utils";

describe("ForgotPasswordForm", () => {
  it("shows a validation error instead of submitting for an invalid email", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/work email/i), "not-an-email");
    await user.click(
      screen.getByRole("button", { name: /send reset request/i }),
    );

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to /api/auth/forgot-password and replaces the form with the backend's message", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          message:
            "If an account exists with this email, your administrator has been notified.",
        },
        200,
      ),
    ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(
      screen.getByLabelText(/work email/i),
      "someone@meridian.test",
    );
    await user.click(
      screen.getByRole("button", { name: /send reset request/i }),
    );

    expect(
      await screen.findByText(/administrator has been notified/i),
    ).toBeInTheDocument();
    // The form itself is gone once the message shows — same generic message whether or not
    // the account exists (see the route handler / backend anti-enumeration behavior).
    expect(screen.queryByLabelText(/work email/i)).not.toBeInTheDocument();
  });

  it("shows the same generic message even for an email that doesn't exist", async () => {
    // The backend always returns the identical message regardless of whether the account
    // exists — this test exists to make sure the frontend doesn't accidentally special-case
    // a "not found" response into different UI copy.
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          message:
            "If an account exists with this email, your administrator has been notified.",
        },
        200,
      ),
    ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(
      screen.getByLabelText(/work email/i),
      "nobody@nowhere.test",
    );
    await user.click(
      screen.getByRole("button", { name: /send reset request/i }),
    );

    expect(
      await screen.findByText(/administrator has been notified/i),
    ).toBeInTheDocument();
  });
});
