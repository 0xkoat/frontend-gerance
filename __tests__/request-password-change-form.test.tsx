import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestPasswordChangeForm } from "@/components/auth/request-password-change-form";
import { mockJsonResponse } from "../test-utils";

describe("RequestPasswordChangeForm", () => {
  it("posts to /api/users/me/request-password-change and shows the confirmation message", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          message:
            "Your administrator has been notified of your password change request.",
        },
        200,
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<RequestPasswordChangeForm />);

    await user.click(
      screen.getByRole("button", { name: /request a password change/i }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/me/request-password-change",
      expect.objectContaining({ method: "POST" }),
    );
    expect(
      await screen.findByText(/your administrator has been notified/i),
    ).toBeInTheDocument();
  });

  it("shows the backend's error message on failure and keeps the button visible", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ message: "Could not send the request" }, 400),
      ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<RequestPasswordChangeForm />);

    await user.click(
      screen.getByRole("button", { name: /request a password change/i }),
    );

    expect(
      await screen.findByText(/could not send the request/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request a password change/i }),
    ).toBeInTheDocument();
  });

  it("shows a generic error when the network call itself fails", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<RequestPasswordChangeForm />);

    await user.click(
      screen.getByRole("button", { name: /request a password change/i }),
    );

    expect(
      await screen.findByText(/could not reach the server/i),
    ).toBeInTheDocument();
  });
});
