import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PublicationContentEditor } from "./PublicationContentEditor.js";

const originalExecCommand = document.execCommand;
const originalQueryCommandState = document.queryCommandState;
const originalQueryCommandValue = document.queryCommandValue;

const selectText = (element: HTMLElement) => {
  const text = element.firstChild;
  if (!text) throw new Error("Expected selectable editor text");
  const range = document.createRange();
  range.selectNodeContents(text);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
};

describe("PublicationContentEditor", () => {
  beforeEach(() => {
    document.execCommand = vi.fn(() => true);
    document.queryCommandState = vi.fn(() => false);
    document.queryCommandValue = vi.fn(() => "p");
  });

  afterEach(() => {
    cleanup();
    document.execCommand = originalExecCommand;
    document.queryCommandState = originalQueryCommandState;
    document.queryCommandValue = originalQueryCommandValue;
  });

  it("renders the controlled HTML value with an accessible editor and toolbar", async () => {
    render(
      <PublicationContentEditor
        value="<h2>Una historia</h2><p>Contenido <strong>importante</strong>.</p>"
        onChange={vi.fn()}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "Editor de contenido" });
    await waitFor(() =>
      expect(editor.innerHTML).toBe(
        "<h2>Una historia</h2><p>Contenido <strong>importante</strong>.</p>",
      ),
    );
    expect(
      screen.getByRole("toolbar", { name: "Formato del contenido" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Encabezado 2" })).toBeTruthy();
    expect(editor.getAttribute("aria-multiline")).toBe("true");
    expect(editor.getAttribute("aria-describedby")).toContain("instructions");
  });

  it("reflects external controlled-value updates", async () => {
    const { rerender } = render(
      <PublicationContentEditor value="<p>Primero</p>" onChange={vi.fn()} />,
    );
    const editor = screen.getByRole("textbox");
    await waitFor(() => expect(editor.innerHTML).toBe("<p>Primero</p>"));

    rerender(
      <PublicationContentEditor value="<h3>Después</h3>" onChange={vi.fn()} />,
    );
    await waitFor(() => expect(editor.innerHTML).toBe("<h3>Después</h3>"));
  });

  it("emits only the allowed HTML vocabulary and safe link schemes", async () => {
    const onChange = vi.fn();
    render(<PublicationContentEditor value="" onChange={onChange} />);
    const editor = screen.getByRole("textbox");

    editor.innerHTML =
      '<div>Texto <b>fuerte</b><img src="x"><script>bad()</script><a href="javascript:bad()">malo</a><a href="https://m199.org" style="color:red">bueno</a></div>';
    fireEvent.input(editor);

    expect(onChange).toHaveBeenLastCalledWith(
      '<p>Texto <strong>fuerte</strong>malo<a href="https://m199.org">bueno</a></p>',
    );
  });

  it("sanitizes rich paste before inserting it", () => {
    const onChange = vi.fn();
    render(
      <PublicationContentEditor value="<p>Base</p>" onChange={onChange} />,
    );
    const editor = screen.getByRole("textbox");
    editor.focus();
    const execCommand = vi.mocked(document.execCommand);

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) =>
          type === "text/html"
            ? '<h3>Título</h3><iframe src="x"></iframe><a href="data:text/html,bad">enlace</a>'
            : "",
      },
    });

    expect(execCommand).toHaveBeenCalledWith(
      "insertHTML",
      false,
      "<h3>Título</h3>enlace",
    );
  });

  it("preserves plain pasted text as text and creates line paragraphs", () => {
    render(<PublicationContentEditor value="" onChange={vi.fn()} />);
    const editor = screen.getByRole("textbox");

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) =>
          type === "text/plain" ? "<h2>No es HTML</h2>\nSegunda línea" : "",
      },
    });

    expect(document.execCommand).toHaveBeenCalledWith(
      "insertHTML",
      false,
      "<p>&lt;h2&gt;No es HTML&lt;/h2&gt;</p><p>Segunda línea</p>",
    );
  });

  it("runs formatting from toolbar and keyboard without trapping Tab", () => {
    render(
      <PublicationContentEditor value="<p>Texto</p>" onChange={vi.fn()} />,
    );
    const editor = screen.getByRole("textbox");
    fireEvent.click(screen.getByRole("button", { name: "Negrita" }));
    expect(document.execCommand).toHaveBeenCalledWith("bold", false, undefined);

    fireEvent.keyDown(editor, { key: "i", ctrlKey: true });
    expect(document.execCommand).toHaveBeenCalledWith(
      "italic",
      false,
      undefined,
    );

    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    editor.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it("creates only safe links for selected text", async () => {
    render(<PublicationContentEditor value="Texto" onChange={vi.fn()} />);
    const editor = screen.getByRole("textbox");
    await waitFor(() => expect(editor.textContent).toBe("Texto"));
    selectText(editor);

    fireEvent.click(screen.getByRole("button", { name: "Agregar enlace" }));
    const input = screen.getByLabelText("URL del enlace");
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar enlace" }));
    expect(screen.getByRole("alert").textContent).toContain("http://");
    expect(document.execCommand).not.toHaveBeenCalledWith(
      "createLink",
      false,
      expect.anything(),
    );

    fireEvent.change(input, { target: { value: "mailto:hola@m199.org" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar enlace" }));
    expect(document.execCommand).toHaveBeenCalledWith(
      "createLink",
      false,
      "mailto:hola@m199.org",
    );
  });

  it("disables editing and every formatting action", () => {
    render(
      <PublicationContentEditor
        value="<p>Solo lectura</p>"
        onChange={vi.fn()}
        disabled
      />,
    );
    const editor = screen.getByRole("textbox");
    expect(editor.getAttribute("contenteditable")).toBe("false");
    expect(editor.getAttribute("aria-disabled")).toBe("true");
    screen.getAllByRole("button").forEach((button) => {
      expect(button.hasAttribute("disabled")).toBe(true);
    });
  });
});
