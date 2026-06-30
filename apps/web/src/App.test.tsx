import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App.js";

describe("App", () => {
  it("renders the shell message and deferred-product-ui disclaimer", () => {
    render(<App />);

    expect(screen.getByText(/workspace shell is running/i)).toBeDefined();

    expect(
      screen.getByText(/product ui ships in future changes/i),
    ).toBeDefined();
  });
});
