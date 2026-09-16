import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
} from "lucide-react";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { sanitizeAndMakeSafe } from "../lib/sanitize.js";

const SAFE_LINK_PATTERN = /^(https?:\/\/|mailto:)[^\s]+$/i;

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );

type FormatName =
  | "paragraph"
  | "heading2"
  | "heading3"
  | "bold"
  | "italic"
  | "unorderedList"
  | "orderedList"
  | "blockquote";

const formatStateDefaults: Record<FormatName, boolean> = {
  paragraph: false,
  heading2: false,
  heading3: false,
  bold: false,
  italic: false,
  unorderedList: false,
  orderedList: false,
  blockquote: false,
};

const normalizeEditableHtml = (html: string): string => {
  const source = document.createElement("div");
  source.innerHTML = html;

  for (const [from, to] of [
    ["b", "strong"],
    ["i", "em"],
    ["div", "p"],
  ] as const) {
    source.querySelectorAll(from).forEach((element) => {
      const replacement = document.createElement(to);
      replacement.append(...element.childNodes);
      element.replaceWith(replacement);
    });
  }

  const sanitized = document.createElement("div");
  sanitized.innerHTML = sanitizeAndMakeSafe(source.innerHTML);
  sanitized.querySelectorAll("a").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href || !SAFE_LINK_PATTERN.test(href)) {
      anchor.replaceWith(...anchor.childNodes);
      return;
    }
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
  });

  return sanitized.innerHTML === "<br>" ? "" : sanitized.innerHTML;
};

export interface PublicationContentEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

interface ToolbarButtonProps {
  label: string;
  active: boolean;
  disabled: boolean;
  onActivate: () => void;
  children: React.ReactNode;
}

function ToolbarButton({
  label,
  active,
  disabled,
  onActivate,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="size-10"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onActivate}
    >
      {children}
    </Button>
  );
}

export function PublicationContentEditor({
  id,
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel = "Editor de contenido",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: PublicationContentEditorProps) {
  const generatedId = useId();
  const editorId = id ?? `publication-content-${generatedId}`;
  const instructionsId = `${editorId}-instructions`;
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const lastEmittedValueRef = useRef<string | null>(null);
  const [formats, setFormats] = useState(formatStateDefaults);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const rememberSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const refreshFormatState = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (
      !editor ||
      !selection ||
      selection.rangeCount === 0 ||
      !editor.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      return;
    }

    const block = document.queryCommandValue?.("formatBlock").toLowerCase();
    setFormats({
      paragraph: block === "p" || block === "paragraph",
      heading2: block === "h2",
      heading3: block === "h3",
      blockquote: block === "blockquote",
      bold: document.queryCommandState?.("bold") ?? false,
      italic: document.queryCommandState?.("italic") ?? false,
      unorderedList:
        document.queryCommandState?.("insertUnorderedList") ?? false,
      orderedList: document.queryCommandState?.("insertOrderedList") ?? false,
    });
  }, []);

  const captureSelectionState = useCallback(() => {
    rememberSelection();
    refreshFormatState();
  }, [refreshFormatState, rememberSelection]);

  useEffect(() => {
    const onSelectionChange = () => captureSelectionState();
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, [captureSelectionState]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = normalizeEditableHtml(value);
    if (lastEmittedValueRef.current === nextValue) {
      lastEmittedValueRef.current = null;
      return;
    }
    if (editor.innerHTML !== nextValue) editor.innerHTML = nextValue;
  }, [value]);

  const emitCurrentValue = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = normalizeEditableHtml(editor.innerHTML);
    lastEmittedValueRef.current = nextValue;
    onChange(nextValue);
  }, [onChange]);

  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const savedRange = savedRangeRef.current;
    if (!savedRange) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedRange);
  };

  const runCommand = (command: string, commandValue?: string) => {
    if (disabled) return;
    restoreSelection();
    document.execCommand(command, false, commandValue);
    emitCurrentValue();
    captureSelectionState();
  };

  const formatButtons: Array<{
    name: FormatName;
    label: string;
    command: string;
    value?: string;
    icon: React.ReactNode;
  }> = [
    {
      name: "paragraph",
      label: "Párrafo",
      command: "formatBlock",
      value: "p",
      icon: <Pilcrow />,
    },
    {
      name: "heading2",
      label: "Encabezado 2",
      command: "formatBlock",
      value: "h2",
      icon: <Heading2 />,
    },
    {
      name: "heading3",
      label: "Encabezado 3",
      command: "formatBlock",
      value: "h3",
      icon: <Heading3 />,
    },
    {
      name: "bold",
      label: "Negrita",
      command: "bold",
      icon: <Bold />,
    },
    {
      name: "italic",
      label: "Cursiva",
      command: "italic",
      icon: <Italic />,
    },
    {
      name: "unorderedList",
      label: "Lista con viñetas",
      command: "insertUnorderedList",
      icon: <List />,
    },
    {
      name: "orderedList",
      label: "Lista numerada",
      command: "insertOrderedList",
      icon: <ListOrdered />,
    },
    {
      name: "blockquote",
      label: "Cita",
      command: "formatBlock",
      value: "blockquote",
      icon: <Quote />,
    },
  ];

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const richText = event.clipboardData.getData("text/html");
    const plainText = event.clipboardData.getData("text/plain");
    const pastedHtml = richText
      ? normalizeEditableHtml(richText)
      : normalizeEditableHtml(
          plainText
            .split(/\r?\n/)
            .map((line) => `<p>${escapeHtml(line)}</p>`)
            .join(""),
        );
    runCommand("insertHTML", pastedHtml);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b" || key === "i") {
      event.preventDefault();
      runCommand(key === "b" ? "bold" : "italic");
    }
    if (key === "k") {
      event.preventDefault();
      rememberSelection();
      setLinkOpen(true);
      setLinkError(null);
    }
  };

  const applyLink = () => {
    if (!SAFE_LINK_PATTERN.test(linkValue)) {
      setLinkError("Usa una URL completa http://, https:// o mailto:.");
      return;
    }
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setLinkError("Selecciona el texto que se convertirá en enlace.");
      return;
    }
    runCommand("createLink", linkValue);
    setLinkValue("");
    setLinkError(null);
    setLinkOpen(false);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background">
      <div
        role="toolbar"
        aria-label="Formato del contenido"
        className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 p-1.5"
      >
        {formatButtons.map((format) => (
          <ToolbarButton
            key={format.name}
            label={format.label}
            active={formats[format.name]}
            disabled={disabled}
            onActivate={() => runCommand(format.command, format.value)}
          >
            {format.icon}
          </ToolbarButton>
        ))}
        <Button
          type="button"
          variant={linkOpen ? "secondary" : "ghost"}
          size="icon"
          className="size-10"
          aria-label="Agregar enlace"
          aria-expanded={linkOpen}
          disabled={disabled}
          onClick={() => {
            rememberSelection();
            setLinkOpen((current) => !current);
            setLinkError(null);
          }}
        >
          <Link />
        </Button>
      </div>

      {linkOpen && (
        <div className="flex flex-wrap items-start gap-2 border-b border-border bg-muted/30 p-3">
          <div className="min-w-56 flex-1">
            <label className="sr-only" htmlFor={`${editorId}-link`}>
              URL del enlace
            </label>
            <Input
              id={`${editorId}-link`}
              value={linkValue}
              onChange={(event) => {
                setLinkValue(event.target.value);
                setLinkError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                }
                if (event.key === "Escape") {
                  setLinkOpen(false);
                  setLinkError(null);
                  editorRef.current?.focus();
                }
              }}
              placeholder="https://ejemplo.org"
              aria-invalid={Boolean(linkError)}
              aria-describedby={
                linkError ? `${editorId}-link-error` : undefined
              }
              disabled={disabled}
              autoFocus
            />
            {linkError && (
              <p
                id={`${editorId}-link-error`}
                role="alert"
                className="mt-1 text-sm text-destructive"
              >
                {linkError}
              </p>
            )}
          </div>
          <Button type="button" onClick={applyLink} disabled={disabled}>
            Aplicar enlace
          </Button>
        </div>
      )}

      <div
        ref={editorRef}
        id={editorId}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        aria-invalid={ariaInvalid}
        aria-disabled={disabled}
        aria-describedby={[ariaDescribedBy, instructionsId]
          .filter(Boolean)
          .join(" ")}
        contentEditable={!disabled}
        suppressContentEditableWarning
        spellCheck
        data-placeholder="Escribe el contenido de la publicación…"
        className="min-h-64 max-w-none overflow-y-auto px-4 py-3 text-base leading-7 outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-4 [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-4 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
        onInput={() => {
          emitCurrentValue();
          captureSelectionState();
        }}
        onBlur={() => {
          const editor = editorRef.current;
          if (!editor) return;
          const normalized = normalizeEditableHtml(editor.innerHTML);
          if (editor.innerHTML !== normalized) editor.innerHTML = normalized;
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={captureSelectionState}
        onMouseUp={captureSelectionState}
        onPaste={handlePaste}
      />
      <p
        id={instructionsId}
        className="border-t border-border px-4 py-2 text-sm text-muted-foreground"
      >
        Selecciona texto para aplicar formato. Usa Ctrl o ⌘ + B, I o K para
        negrita, cursiva o enlaces.
      </p>
    </div>
  );
}
