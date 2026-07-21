# React Quill Tooltip

Add tooltips to text inside a [Quill](https://quilljs.com/) editor. Select
some text, click a button, type a note — done. Hover the marked text to
preview it, click it to edit.

Works with a live editor, and with read-only Quill HTML (e.g. rendered via
`dangerouslySetInnerHTML`).

## Install

```bash
npm install react-quill-tooltip
```

You'll also need `react-quill` and `quill` if your project doesn't already
have them.

## Quick start

```tsx
import { useRef, useEffect } from "react";
import ReactQuill from "react-quill";
import { useQuillTooltip, setupTooltipButton } from "react-quill-tooltip";
import "react-quill-tooltip/quill-tooltip.scss";

function Editor() {
  const quillRef = useRef<ReactQuill>(null);

  // Registers the tooltip format and wires up hover/click behavior.
  useQuillTooltip(quillRef);

  // Wires the button below to open a tooltip input for the current selection.
  useEffect(() => {
    setupTooltipButton(quillRef);
  }, []);

  return (
    <>
      <button id="qtt-toolbar-button" type="button">
        Add tooltip
      </button>
      <ReactQuill ref={quillRef} formats={["bold", "italic", "tooltip"]} />
    </>
  );
}
```

Select some text, click the button, type a note, hit Enter. Hover the marked
text to preview it, click it to edit.

> **Note:** call `useQuillTooltip` directly in the component body, not inside
> a `useEffect`. It needs to register the `tooltip` format before
> `<ReactQuill>` mounts.

## Read-only content

Just showing Quill HTML somewhere (a rendered post, a comment, etc.) and only
need the hover preview, no editing? Use the renderer hook instead:

```tsx
import { useRef } from "react";
import { useQuillTooltipRenderer } from "react-quill-tooltip";

function Post({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useQuillTooltipRenderer(ref, {}, [html]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
```

## Styling

Everything is a CSS custom property, so most theming needs no CSS overrides
at all — just set the variables:

```css
:root {
  --qtt-bg: #333;
  --qtt-text: #fff;
  --qtt-border-radius: 6px;
  --qtt-width: 300px;
}
```

Need different styling depending on where a tooltip lands (e.g. a dark
section of the page)? Pass `isLightContainer`:

```tsx
useQuillTooltip(quillRef, {
  isLightContainer: (el) => el.closest(".dark-section") !== null,
});
```

## API

| Function                                                   | What it does                                                          |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `useQuillTooltip(quillRef, options?)`                        | Hook. Registers the format and hover/click behavior on a live editor.  |
| `useQuillTooltipRenderer(containerRef, options?, deps?)`     | Hook. Hover-preview only, for read-only rendered HTML.                 |
| `setupTooltipButton(quillRef, options?)`                     | Wires a toolbar button (by id) to open the tooltip input.              |
| `openTooltipInput(quillRef, options?)`                       | Opens the tooltip input directly, for a custom trigger.                |
| `setupTooltipInteractions` / `setupTooltipRenderer`          | Non-hook versions of the two hooks above, for manual setup/teardown.   |
| `registerTooltipFormat(classNames?)`                         | Registers the Quill format on its own (done automatically otherwise). |

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
