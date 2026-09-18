import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PublicImageCarousel } from "./PublicImageCarousel.js";

describe("PublicImageCarousel", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("renders the complete image sequence and hides navigation for one image", () => {
    render(<PublicImageCarousel images={["/one.jpg"]} label="la misión Uno" />);

    expect(
      screen.getByRole("region", { name: "Galería de la misión Uno" }),
    ).toBeTruthy();
    expect(screen.queryByText("La Misión en imágenes")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Ampliar imagen 1 de 1/ }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Imagen anterior" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Imagen siguiente" }),
    ).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("keeps the primary image separate from the cropped thumbnail sequence", () => {
    render(
      <PublicImageCarousel
        images={["/one.jpg", "/two.jpg"]}
        label="la misión Uno"
      />,
    );

    const mainButton = screen.getByRole("button", {
      name: /Ampliar imagen 1 de 2/,
    });
    const thumbnails = screen.getByRole("list", {
      name: "Seleccionar imagen de la misión Uno",
    });

    expect(mainButton.querySelector("img")).toBeTruthy();
    expect(thumbnails.querySelectorAll("img")).toHaveLength(2);
    expect(mainButton.querySelector("img")?.closest("button")).toBe(mainButton);
  });

  it("keeps the desktop media frame separate from carousel controls", () => {
    render(
      <PublicImageCarousel
        images={["/one.jpg", "/two.jpg"]}
        label="la publicación Demo"
      />,
    );

    const carousel = screen.getByTestId("public-image-carousel");
    const frame = carousel.querySelector(".public-image-carousel__frame");
    const toolbar = carousel.querySelector(".public-image-carousel__toolbar");

    expect(frame?.querySelector("img")).toBeTruthy();
    expect(frame?.contains(toolbar)).toBe(false);
    expect(toolbar?.querySelectorAll("button")).toHaveLength(2);
    expect(
      carousel.querySelectorAll(".public-image-carousel__thumbnail"),
    ).toHaveLength(2);
  });

  it("browses thumbnails, opens a lightbox, supports arrows and restores focus", () => {
    render(
      <PublicImageCarousel
        images={["/one.jpg", "/two.jpg", "/three.jpg"]}
        label="la publicación Demo"
      />,
    );

    const mainImage = screen.getByRole("button", {
      name: /Ampliar imagen 1 de 3/,
    });
    fireEvent.click(screen.getByRole("button", { name: /Ver imagen 2 de 3/ }));
    expect(mainImage.getAttribute("aria-label")).toContain("2 de 3");

    fireEvent.click(mainImage);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cerrar imagen ampliada" }),
    );

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByRole("dialog").textContent).toContain("Imagen 3 de 3");
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByRole("dialog").textContent).toContain("Imagen 2 de 3");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(mainImage);
  });

  it("exposes thumbnails as a semantic list and closes with the explicit control", () => {
    render(
      <PublicImageCarousel
        images={["/one.jpg", "/two.jpg"]}
        label="la misión Uno"
      />,
    );

    const thumbnails = screen.getByRole("list", {
      name: "Seleccionar imagen de la misión Uno",
    });
    expect(thumbnails.querySelectorAll(":scope > li")).toHaveLength(2);

    const mainImage = screen.getByRole("button", {
      name: /Ampliar imagen 1 de 2/,
    });
    fireEvent.click(mainImage);
    fireEvent.click(
      screen.getByRole("button", { name: "Cerrar imagen ampliada" }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(mainImage);
  });

  it("keeps blank sources on the public fallback", () => {
    render(<PublicImageCarousel images={["  "]} label="la misión Uno" />);

    expect(
      screen.getByRole("button", { name: /Ampliar imagen/ }).innerHTML,
    ).toContain('src="/assets/template-picture.png"');
  });

  it("switches failed images to the public fallback", () => {
    render(
      <PublicImageCarousel images={["/broken.jpg"]} label="la misión Uno" />,
    );

    const image = screen.getAllByRole("presentation")[0]!;
    fireEvent.error(image);

    expect(image.getAttribute("src")).toBe("/assets/template-picture.png");
  });
});
