# React Quill Tooltip

Add tooltips to text inside a [Quill](https://quilljs.com/) editor. Select
some text, click a button, type a note — done. Hover the marked text to
preview it, click it to edit.

Works with a live editor, and with read-only Quill HTML (e.g. rendered via
`dangerouslySetInnerHTML`).

## Install

```bash
npm install react-quill-tooltip
# or
yarn add react-quill-tooltip
```

You'll also need `react-quill` and `quill` if your project doesn't already
have them.

## Quick start

```tsx
import { useRef, useEffect } from "react";
import ReactQuill from "react-quill";
import { useQuillTooltip, setupTooltipButton } from "react-quill-tooltip";
import "react-quill/dist/quill.snow.css";
import "react-quill-tooltip/quill-tooltip.scss";

function Editor() {
  const quillRef = useRef<ReactQuill>(null);

  // Registers the `tooltip` format and wires up hover/click behavior.
  useQuillTooltip(quillRef);

  // Wires the "Add tooltip" button below to open a tooltip input for the
  // current selection. Run this after mount, once the button exists.
  useEffect(() => {
    setupTooltipButton(quillRef);
  }, []);

  return (
    <>
      {/* The button lives inside the same container Quill renders its own
          toolbar buttons into, so it sits with them instead of floating
          somewhere else on the page. */}
      <div id="my-toolbar">
        <button className="ql-bold" />
        <button className="ql-italic" />
        <button id="qtt-toolbar-button" type="button">
          Add tooltip
        </button>
      </div>
      <ReactQuill
        ref={quillRef}
        formats={["bold", "italic", "tooltip"]}
        modules={{ toolbar: { container: "#my-toolbar" } }}
      />
    </>
  );
}
```

That's the whole setup. Here's what happens at runtime:

1. Select some text and click **Add tooltip** — a small input appears, asking
   for a note.
2. Type a note and hit **Enter** (or click away) — the text gets underlined
   and marked.
3. **Hover** the marked text later to preview the note. **Click** it to edit,
   or clear the text and save to remove the tooltip.

> **Heads up:** call `useQuillTooltip` in the component body, not inside a
> `useEffect`. It registers the `tooltip` format, and that has to happen
> before `<ReactQuill>` mounts — putting it in an effect runs it one render
> too late, and the format silently doesn't get applied.

## Read-only content

Just showing Quill HTML somewhere (a rendered post, a comment, etc.) and only
need the hover preview, no editing? Use the renderer hook instead — it skips
all the Quill-editor wiring and just watches a plain container for marked
text:

```tsx
import { useRef } from "react";
import { useQuillTooltipRenderer } from "react-quill-tooltip";

function Post({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // Re-runs whenever `html` changes, so it stays in sync with new content.
  useQuillTooltipRenderer(ref, {}, [html]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
```

## Styling

Everything is a CSS custom property, so most theming needs no CSS overrides
at all — just set the variables somewhere in your app's CSS (`:root` works
fine):

```css
:root {
  --qtt-bg: #333;
  --qtt-text: #fff;
  --qtt-border-radius: 6px;
  --qtt-width: 300px;
}
```

Need different styling depending on where a tooltip lands (e.g. a dark
section of the page)? Pass `isLightContainer` — return `true` for a given
anchor element and its bubble gets a light-background variant instead:

```tsx
useQuillTooltip(quillRef, {
  isLightContainer: (el) => el.closest(".dark-section") !== null,
});
```

## API

| Function                                                 | What it does                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `useQuillTooltip(quillRef, options?)`                      | Hook. Registers the format and hover/click behavior on a live editor.     |
| `useQuillTooltipRenderer(containerRef, options?, deps?)`   | Hook. Hover-preview only, for read-only rendered HTML.                    |
| `setupTooltipButton(quillRef, options?)`                   | Wires a toolbar button (by id) to open the tooltip input.                 |
| `openTooltipInput(quillRef, options?)`                     | Opens the tooltip input directly, for a custom trigger.                   |
| `setupTooltipInteractions` / `setupTooltipRenderer`        | Non-hook versions of the two hooks above, for manual setup/teardown.      |
| `registerTooltipFormat(classNames?)`                       | Registers the Quill format on its own (done automatically otherwise).     |

The hook and non-hook version of the same thing behave identically — reach
for the hook in a React component, and the plain function anywhere else
(e.g. wiring things up outside of React).

**Options** (all optional, shared by every function above):

```ts
{
  placeholder?: string;                 // input placeholder, default "Enter tooltip text..."
  gap?: number;                         // px between bubble and text, default 8
  classNames?: Partial<QuillTooltipClassNames>; // override the default qtt-* CSS classes
  isLightContainer?: (el: HTMLElement) => boolean; // use light bubble styling
  followCursor?: boolean;               // hover bubble tracks the mouse instead of staying put
}
```

`setupTooltipButton` also takes `buttonId` (default `"qtt-toolbar-button"`).
The renderer functions also take `rtl` (default `false`).

## TypeScript

Types are exported alongside everything else:

```ts
import type {
  QuillTooltipOptions,
  QuillTooltipClassNames,
} from "react-quill-tooltip";
```

## Requirements

- React 16.8+
- Quill 1.3+ or 2.0+

## License

MIT
