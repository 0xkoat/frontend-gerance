import { render, screen } from "@testing-library/react";
import { NextOnlyPagination } from "@/components/security/next-only-pagination";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

describe("NextOnlyPagination", () => {
  it("renders nothing on page 1 with no next page", () => {
    const { container } = render(
      <NextOnlyPagination
        page={1}
        hasNextPage={false}
        buildHref={(p) => `/vm?page=${p}`}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("disables Previous on page 1", () => {
    render(
      <NextOnlyPagination
        page={1}
        hasNextPage={true}
        buildHref={(p) => `/vm?page=${p}`}
      />,
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("links Previous to page - 1 past page 1", () => {
    render(
      <NextOnlyPagination
        page={3}
        hasNextPage={true}
        buildHref={(p) => `/vm?page=${p}`}
      />,
    );

    // nativeButton={false} tells Base UI the rendered element (a Link, not a
    // native <button>) still acts as a button, so it stamps role="button"
    // rather than leaving the implicit link role — asserting on that role
    // is what confirms the fix, not an unrelated test tweak.
    expect(screen.getByRole("button", { name: "Previous" })).toHaveAttribute(
      "href",
      "/vm?page=2",
    );
  });

  it("disables Next when there is no next page", () => {
    render(
      <NextOnlyPagination
        page={2}
        hasNextPage={false}
        buildHref={(p) => `/vm?page=${p}`}
      />,
    );

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("links Next to page + 1 when there is a next page", () => {
    render(
      <NextOnlyPagination
        page={2}
        hasNextPage={true}
        buildHref={(p) => `/vm?page=${p}`}
      />,
    );

    expect(screen.getByRole("button", { name: "Next" })).toHaveAttribute(
      "href",
      "/vm?page=3",
    );
  });

  it("shows the current page number, with no total (no honest total exists)", () => {
    render(
      <NextOnlyPagination
        page={4}
        hasNextPage={true}
        buildHref={(p) => `/vm?page=${p}`}
      />,
    );

    expect(screen.getByText("Page 4")).toBeInTheDocument();
    expect(screen.queryByText(/of \d/)).not.toBeInTheDocument();
  });
});
