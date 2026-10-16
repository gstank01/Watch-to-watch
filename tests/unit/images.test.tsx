// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Poster } from "@/components/poster";
import { ProviderLogo } from "@/components/provider-logo";

describe("images", () => {
  it("serves posters through our own image route, not straight from TMDB", () => {
    render(<Poster path="/the-bear.jpg" title="The Bear" />);
    const img = screen.getByRole("img", { name: "Poster for The Bear" });
    // The exact origin depends on the build; e2e checks the production URL.
    expect(img.getAttribute("src")).toMatch(
      /\/_next\/image\?url=https%3A%2F%2Fimage\.tmdb\.org%2Ft%2Fp%2Fw342%2Fthe-bear\.jpg/,
    );
  });

  it("shows the title instead of a broken image when a poster fails", () => {
    render(<Poster path="/missing.jpg" title="The Bear" />);
    fireEvent.error(screen.getByRole("img", { name: "Poster for The Bear" }));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByTestId("poster-fallback")).toHaveTextContent("The Bear");
  });

  it("shows the title when there is no poster at all", () => {
    render(<Poster path={null} title="Paddington" />);
    expect(screen.getByTestId("poster-fallback")).toHaveTextContent("Paddington");
  });

  it("falls back to initials when a logo fails", () => {
    const { container } = render(<ProviderLogo path="/logo.jpg" name="Netflix" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("Ne");
  });
});
