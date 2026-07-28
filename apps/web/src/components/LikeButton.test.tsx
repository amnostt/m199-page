import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LikeButton } from "./LikeButton.js";

afterEach(() => vi.unstubAllGlobals());

describe("LikeButton", () => {
  it("posts an anonymous like once and displays the API count", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ likesCount: 8 }),
    });
    vi.stubGlobal("fetch", request);
    render(<LikeButton slug="camp-day" initialCount={7} />);

    fireEvent.click(screen.getByTestId("like-button"));

    await waitFor(() =>
      expect(screen.getByTestId("like-count").textContent).toBe("8"),
    );
    expect(request).toHaveBeenCalledWith("/outings/camp-day/like", {
      method: "POST",
    });
    expect(screen.getByTestId("like-button")).toHaveProperty("disabled", true);
  });
});
