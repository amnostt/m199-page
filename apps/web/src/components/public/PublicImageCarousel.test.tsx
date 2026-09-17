import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PublicImageCarousel } from "./PublicImageCarousel.js";

describe("PublicImageCarousel", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("renders the complete image sequence and hides navigation for one image", () => {
    render(
      <PublicImageCarousel
        images={["/one.jpg"]}
        label="la misión Uno"
        heading="La Misión en imágenes"
      />,
    );

    expect(screen.getByRole("heading", { name: "La Misión en imágenes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ampliar imagen 1 de 1/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Imagen anterior" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Imagen siguiente" })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("browses thumbnails, opens a lightbox, supports arrows and restores focus", () => {
    render(
      <PublicImageCarousel
        images={["/one.jpg", "/two.jpg", "/three.jpg"]}
        label="la publicación Demo"
        heading="Más de esta historia"
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
        heading="La Misión en imágenes"
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
    fireEvent.click(screen.getByRole("button", { name: "Cerrar imagen ampliada" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(mainImage);
  });

  it("keeps blank sources on the public fallback", () => {
    render(
      <PublicImageCarousel
        images={["  "]}
        label="la misión Uno"
        heading="La Misión en imágenes"
      />,
    );

    expect(
      screen.getByRole("button", { name: /Ampliar imagen/ }).innerHTML,
    ).toContain('src="/assets/template-picture.png"');
  });

  it("switches failed images to the public fallback", () => {
    render(
      <PublicImageCarousel
        images={["/broken.jpg"]}
        label="la misión Uno"
        heading="La Misión en imágenes"
      />,
    );

    const image = screen.getAllByRole("presentation")[0]!;
    fireEvent.error(image);

    expect(image.getAttribute("src")).toBe("/assets/template-picture.png");
  });
});
