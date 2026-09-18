// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { LandingBackgroundMusic } from "./LandingBackgroundMusicControl.js";

describe("LandingBackgroundMusic", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      this.dispatchEvent(new Event("pause"));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not autoplay and exposes an accessible play state", () => {
    render(<LandingBackgroundMusic musicUrl="/files/music-001" />);

    const button = screen.getByRole("button", {
      name: "Play background music",
    });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(
      screen
        .getByTestId("landing-background-music")
        .querySelector("audio")
        ?.hasAttribute("autoplay"),
    ).toBe(false);
  });

  it("plays and pauses from the floating button while reflecting state", async () => {
    render(<LandingBackgroundMusic musicUrl="/files/music-001" />);

    const playButton = screen.getByRole("button", {
      name: "Play background music",
    });
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Pause background music" }),
      ).toBeTruthy();
      expect(
        screen
          .getByRole("button", { name: "Pause background music" })
          .getAttribute("aria-pressed"),
      ).toBe("true");
      expect(
        screen
          .getByRole("button", { name: "Pause background music" })
          .getAttribute("data-playing"),
      ).toBe("true");
    });
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();

    fireEvent.click(
      screen.getByRole("button", { name: "Pause background music" }),
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Play background music" })
          .getAttribute("aria-pressed"),
      ).toBe("false");
      expect(
        screen
          .getByRole("button", { name: "Play background music" })
          .getAttribute("data-playing"),
      ).toBe("false");
    });
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("returns to the paused state and announces asynchronous audio errors", async () => {
    render(<LandingBackgroundMusic musicUrl="/files/music-001" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Play background music" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Pause background music" }),
      ).toBeTruthy(),
    );

    const audio = screen
      .getByTestId("landing-background-music")
      .querySelector("audio");
    if (!audio) throw new Error("Expected landing audio element");
    fireEvent.error(audio);

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Play background music" })
          .getAttribute("aria-pressed"),
      ).toBe("false");
      expect(
        screen
          .getByRole("button", { name: "Play background music" })
          .getAttribute("data-playing"),
      ).toBe("false");
      expect(screen.getByRole("status").textContent).toBe(
        "Background music could not be played. Please try again.",
      );
    });
  });

  it("returns to the paused state and announces rejected play promises", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new Error("Playback was blocked"),
    );
    render(<LandingBackgroundMusic musicUrl="/files/music-001" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Play background music" }),
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Play background music" })
          .getAttribute("aria-pressed"),
      ).toBe("false");
      expect(screen.getByRole("status").textContent).toBe(
        "Background music could not be played. Please try again.",
      );
    });
  });

  it("renders nothing when the public payload has no music", () => {
    const { container } = render(<LandingBackgroundMusic musicUrl={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("pauses and resets the audio when the landing island unmounts", async () => {
    const { unmount } = render(
      <LandingBackgroundMusic musicUrl="/files/music-001" />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Play background music" }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Pause background music" }),
      ).toBeTruthy();
    });

    unmount();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});
