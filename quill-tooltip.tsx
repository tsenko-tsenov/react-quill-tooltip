import Quill from "quill";
import type React from "react";
import { useEffect } from "react";

/**
 * Minimal shape of a Quill editor instance needed by these helpers. Matches
 * both a raw Quill instance and what `react-quill`'s `getEditor()` returns.
 */
export type QuillInstance = {
  getSelection: () => { index: number; length: number } | null;
  getBounds: (
    index: number,
    length: number
  ) => { top: number; left: number; width: number; height: number } | null;
  getText: (index: number, length: number) => string;
  setSelection: (index: number, length?: number) => void;
  format: (name: string, value: any) => void;
  formatText: (index: number, length: number, name: string, value: any) => void;
  deleteText: (index: number, length: number) => void;
  insertText: (index: number, text: string) => void;
  focus: () => void;
  container: HTMLElement;
  scroll: any;
};

export type QuillRef = React.RefObject<
  QuillInstance | { getEditor: () => QuillInstance } | null
>;

const getQuillInstance = (quillRef: QuillRef): QuillInstance | null => {
  const ref = quillRef.current;
  if (!ref) return null;
  return "getEditor" in ref ? ref.getEditor() : (ref as QuillInstance);
};

type Rect = { top: number; left: number; width: number; height: number };

/**
 * CSS class names applied by these helpers. Override via
 * `QuillTooltipOptions.classNames` to integrate with an existing design
 * system, or style the defaults directly (see `quill-tooltip.scss`).
 */
export interface QuillTooltipClassNames {
  /** Class applied to text marked with a tooltip (the `tooltip` format). */
  mark: string;
  /** Base class on every floating bubble (input / edit / hover). */
  container: string;
  /** Modifier: bubble shown while creating a new tooltip. */
  inputContainer: string;
  /** Modifier: bubble shown while editing an existing tooltip. */
  editBox: string;
  /** Modifier: read-only bubble shown on hover. */
  hoverDisplay: string;
  /** Caret/arrow element pointing at the target text. */
  caret: string;
  /** The auto-resizing `<textarea>` used for input/edit bubbles. */
  input: string;
  /** Modifier applied when `isLightContainer` reports a light background. */
  light: string;
}

export const DEFAULT_CLASS_NAMES: QuillTooltipClassNames = {
  mark: "qtt-mark",
  container: "qtt-bubble",
  inputContainer: "qtt-bubble--input",
  editBox: "qtt-bubble--edit",
  hoverDisplay: "qtt-bubble--hover",
  caret: "qtt-bubble__caret",
  input: "qtt-bubble__input",
  light: "qtt-bubble--light",
};

const DATA_ATTR = "data-qtt-tooltip";
const DEFAULT_PLACEHOLDER = "Enter tooltip text...";
const DEFAULT_BUTTON_ID = "qtt-toolbar-button";
const ZERO_WIDTH_SPACE = "\u200B";

/**
 * Shared configuration for all tooltip helpers.
 */
export interface QuillTooltipOptions {
  /**
   * Placeholder text shown in the tooltip input.
   * @default "Enter tooltip text..."
   */
  placeholder?: string;

  /**
   * Gap, in pixels, between the tooltip bubble and the target text.
   * @default 8
   */
  gap?: number;

  /**
   * Override one or more of the default CSS class names.
   */
  classNames?: Partial<QuillTooltipClassNames>;

  /**
   * Called with the DOM element the tooltip is anchored to (an inline mark,
   * for hover/click; the Quill container, for the toolbar button). Return
   * `true` to render the bubble with the `light` modifier class — useful
   * when the tooltip appears over a dark background and needs light
   * styling, or vice versa.
   * @default () => false
   */
  isLightContainer?: (element: HTMLElement) => boolean;

  /**
   * Make the hover-preview bubble track the mouse cursor while hovering
   * marked text, instead of staying anchored above the text.
   * @default false
   */
  followCursor?: boolean;
}

export interface QuillTooltipButtonOptions extends QuillTooltipOptions {
  /**
   * DOM id of the button that opens the tooltip input for the current
   * selection.
   * @default "qtt-toolbar-button"
   */
  buttonId?: string;
}

export interface QuillTooltipRendererOptions extends QuillTooltipOptions {
  /**
   * Render the hover bubble with `dir="rtl"`.
   * @default false
   */
  rtl?: boolean;
}

const resolveClassNames = (
  classNames?: Partial<QuillTooltipClassNames>
): QuillTooltipClassNames => ({ ...DEFAULT_CLASS_NAMES, ...classNames });

let isTooltipFormatRegistered = false;

/**
 * Registers the `tooltip` inline format with Quill. Idempotent — safe to
 * call on every render/mount.
 */
export const registerTooltipFormat = (
  classNames?: Partial<QuillTooltipClassNames>
) => {
  if (isTooltipFormatRegistered) return;
  isTooltipFormatRegistered = true;

  const markClass = resolveClassNames(classNames).mark;
  const Inline = Quill.import("blots/inline") as any;

  class TooltipBlot extends Inline {
    static blotName = "tooltip";
    static tagName = "span";
    declare domNode: HTMLElement;

    static create(value: string) {
      const node = super.create() as HTMLElement;
      node.setAttribute(DATA_ATTR, value);
      node.classList.add(markClass);
      return node;
    }

    static formats(node: HTMLElement) {
      return node.getAttribute(DATA_ATTR);
    }

    format(name: string, value: string | boolean) {
      if (name !== "tooltip") {
        super.format(name, value);
        return;
      }
      if (value && typeof value === "string") {
        this.domNode.setAttribute(DATA_ATTR, value);
      } else {
        this.domNode.removeAttribute(DATA_ATTR);
        this.domNode.classList.remove(markClass);
        if (
          this.domNode.attributes.length === 0 &&
          this.domNode.classList.length === 0
        ) {
          super.format(name, false);
        }
      }
    }
  }

  Quill.register(TooltipBlot as any);
};

/**
 * `Quill#getBounds` returns `null` for an out-of-range index/length (can
 * happen transiently as content changes underneath an open bubble). Callers
 * here treat that as "no usable geometry" rather than crashing.
 */
const getBoundsSafe = (
  quill: QuillInstance,
  index: number,
  length: number
): Rect | null => quill.getBounds(index, length);

const isMultilineSelection = (
  quill: QuillInstance,
  index: number,
  length: number
): boolean => {
  const bounds = getBoundsSafe(quill, index, length);
  const singleCharBounds = getBoundsSafe(quill, index, 1);
  if (!bounds || !singleCharBounds) return false;
  return bounds.height > singleCharBounds.height * 1.5;
};

const getFirstWordRect = (
  quill: QuillInstance,
  quillContainer: HTMLElement,
  index: number,
  length: number
): Rect | null => {
  const text = quill.getText(index, length);
  const words = text.trim().split(/\s+/);
  if (words.length === 0 || words[0].length === 0) return null;

  const firstWord = words[0];
  const firstWordIndex = index + text.indexOf(firstWord);
  const bounds = getBoundsSafe(quill, firstWordIndex, firstWord.length);
  if (!bounds) return null;
  const containerRect = quillContainer.getBoundingClientRect();

  return {
    top: containerRect.top + bounds.top,
    left: containerRect.left + bounds.left,
    width: bounds.width,
    height: bounds.height,
  };
};

const getTargetRectForQuillSelection = (
  quill: QuillInstance,
  quillContainer: HTMLElement,
  index: number,
  length: number,
  bounds: Rect | null
): Rect => {
  if (isMultilineSelection(quill, index, length)) {
    const firstWordRect = getFirstWordRect(quill, quillContainer, index, length);
    if (firstWordRect) return firstWordRect;
  }
  bounds = bounds ?? { top: 0, left: 0, width: 0, height: 0 };
  const containerRect = quillContainer.getBoundingClientRect();
  return {
    top: containerRect.top + bounds.top,
    left: containerRect.left + bounds.left,
    width: bounds.width,
    height: bounds.height,
  };
};

const isMultilineElement = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  const tempSpan = document.createElement("span");
  tempSpan.textContent = "M";
  tempSpan.style.visibility = "hidden";
  tempSpan.style.position = "absolute";
  const computed = window.getComputedStyle(element);
  tempSpan.style.fontSize = computed.fontSize;
  tempSpan.style.fontFamily = computed.fontFamily;
  tempSpan.style.lineHeight = computed.lineHeight;
  document.body.appendChild(tempSpan);
  const singleLineHeight = tempSpan.getBoundingClientRect().height;
  document.body.removeChild(tempSpan);
  return rect.height > singleLineHeight * 1.5;
};

const getFirstWordRectForElement = (element: HTMLElement): Rect | null => {
  const text = element.textContent || "";
  const words = text.trim().split(/\s+/);
  if (words.length === 0 || words[0].length === 0) return null;

  const firstWord = words[0];
  const firstWordIndex = text.indexOf(firstWord);
  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  let charCount = 0;
  let textNode: Text | null = null;
  while ((textNode = walker.nextNode() as Text | null)) {
    const nodeLength = (textNode.textContent || "").length;
    if (charCount + nodeLength > firstWordIndex) {
      const startOffset = firstWordIndex - charCount;
      const endOffset = Math.min(startOffset + firstWord.length, nodeLength);
      range.setStart(textNode, startOffset);
      range.setEnd(textNode, endOffset);
      break;
    }
    charCount += nodeLength;
  }

  if (range.collapsed) return null;
  const rect = range.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
};

const getTargetRectForElement = (element: HTMLElement): Rect => {
  const rect = element.getBoundingClientRect();
  if (isMultilineElement(element)) {
    const firstWordRect = getFirstWordRectForElement(element);
    if (firstWordRect) return firstWordRect;
  }
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
};

/** Where a bubble should sit (viewport coordinates) above `targetRect`. */
export const positionTooltip = (
  tooltipBox: HTMLElement,
  targetRect: Rect,
  gap = 8
): { top: number; left: number } => {
  const wasAppended = tooltipBox.parentElement === document.body;
  if (!wasAppended) {
    tooltipBox.style.visibility = "hidden";
    document.body.appendChild(tooltipBox);
  }

  const tooltipHeight = tooltipBox.offsetHeight;
  const actualGap = Math.max(gap, 12);
  const top = targetRect.top - tooltipHeight - actualGap + 6;
  const left = targetRect.left + targetRect.width / 2;

  if (!wasAppended) {
    tooltipBox.parentNode?.removeChild(tooltipBox);
    tooltipBox.style.visibility = "";
  }

  return { top, left };
};

const removeIfConnected = (element: Element) => {
  if (!element.isConnected) return;
  const parent = element.parentNode;
  if (!parent || !parent.contains(element)) return;
  try {
    parent.removeChild(element);
  } catch {
    // Already removed elsewhere (e.g. a concurrent cleanup); ignore.
  }
};

const removeExistingBubbles = (classNames: QuillTooltipClassNames) => {
  document.body
    .querySelectorAll(
      `.${classNames.inputContainer}, .${classNames.editBox}, .${classNames.hoverDisplay}`
    )
    .forEach(removeIfConnected);
};

const createBubble = (
  variantClass: string,
  classNames: QuillTooltipClassNames,
  anchor: HTMLElement,
  isLightContainer?: (element: HTMLElement) => boolean
): HTMLElement => {
  const bubble = document.createElement("div");
  const classes = [classNames.container, variantClass];
  if (isLightContainer?.(anchor)) classes.push(classNames.light);
  bubble.className = classes.join(" ");
  return bubble;
};

const addCaret = (bubble: HTMLElement, classNames: QuillTooltipClassNames) => {
  const caret = document.createElement("div");
  caret.className = classNames.caret;
  bubble.appendChild(caret);
};

const positionAndStyle = (
  bubble: HTMLElement,
  targetRect: Rect,
  gap: number | undefined
) => {
  const { top, left } = positionTooltip(bubble, targetRect, gap);
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  bubble.style.transform = "translateX(-50%)";
};

/** A zero-size rect at the mouse position, for cursor-anchored positioning. */
const cursorRect = (e: MouseEvent) => ({
  top: e.clientY,
  left: e.clientX,
  width: 0,
  height: 0,
});

/**
 * When `followCursor` is enabled, tracks the bubble to the mouse position
 * instead of a fixed spot above the target. Returns a cleanup function, or
 * `null` if not enabled.
 */
const attachCursorFollow = (
  target: HTMLElement,
  bubble: HTMLElement,
  gap: number | undefined,
  followCursor: boolean | undefined
): (() => void) | null => {
  if (!followCursor) return null;
  // The bubble tracks the raw cursor position, so it can end up under the
  // pointer as it moves. Without this, hovering onto the bubble itself
  // fires `mouseleave` on `target` (this listener is scoped to `target`,
  // so tracking then stalls) followed by a fresh `mouseover` once the
  // cursor clears it again — handleHover sees an existing bubble and
  // replaces it, which reads as the bubble blinking and jumping.
  bubble.style.pointerEvents = "none";
  const onMouseMove = (e: MouseEvent) => {
    positionAndStyle(bubble, cursorRect(e), gap);
  };
  target.addEventListener("mousemove", onMouseMove);
  return () => target.removeEventListener("mousemove", onMouseMove);
};

const createAutoResizeTextarea = (
  value: string,
  placeholder: string,
  classNames: QuillTooltipClassNames,
  onResize: () => void
): HTMLTextAreaElement => {
  const textarea = document.createElement("textarea");
  textarea.className = classNames.input;
  textarea.rows = 1;
  textarea.style.overflow = "hidden";
  textarea.value = value;
  textarea.placeholder = placeholder;

  const resize = () => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    onResize();
  };

  textarea.addEventListener("input", resize);
  setTimeout(resize, 0);
  return textarea;
};

/**
 * Opens a tooltip-text input bubble for the editor's current selection.
 * Exposed standalone (not just via `setupTooltipButton`) for callers that
 * want to trigger it from a custom toolbar handler or other UI. No-ops if
 * there's no active selection.
 */
export const openTooltipInput = (
  quillRef: QuillRef,
  options: QuillTooltipOptions = {}
) => {
  const quill = getQuillInstance(quillRef);
  if (!quill) return;

  const range = quill.getSelection();
  if (!range || range.length === 0) return;

  const classNames = resolveClassNames(options.classNames);
  const placeholder = options.placeholder || DEFAULT_PLACEHOLDER;

  const bounds = quill.getBounds(range.index, range.length);
  const quillContainer = quill.container;
  removeExistingBubbles(classNames);

  const bubble = createBubble(
    classNames.inputContainer,
    classNames,
    quillContainer,
    options.isLightContainer
  );

  const targetRect = getTargetRectForQuillSelection(
    quill,
    quillContainer,
    range.index,
    range.length,
    bounds
  );

  const textarea = createAutoResizeTextarea(
    "",
    placeholder,
    classNames,
    () => positionAndStyle(bubble, targetRect, options.gap)
  );
  bubble.appendChild(textarea);
  addCaret(bubble, classNames);
  document.body.appendChild(bubble);

  positionAndStyle(bubble, targetRect, options.gap);
  textarea.focus();

  let isApplied = false;
  const apply = () => {
    if (isApplied) return;
    isApplied = true;

    const tooltipText = textarea.value.trim();
    if (bubble.isConnected) {
      textarea.removeEventListener("keydown", onKeydown);
      textarea.removeEventListener("blur", apply);
      removeIfConnected(bubble);
    }

    if (tooltipText) {
      quill.formatText(range.index, range.length, "tooltip", tooltipText);
      const boundaryIndex = range.index + range.length;
      // A real, explicitly unformatted character has to go right after the
      // mark so typing there doesn't inherit its formatting — clearing the
      // *pending* format alone doesn't survive past the first keystroke,
      // and an unformatted insert still lands inside the mark when it's
      // the last thing on the line (nothing to disambiguate against).
      quill.insertText(boundaryIndex, ZERO_WIDTH_SPACE);
      quill.formatText(boundaryIndex, ZERO_WIDTH_SPACE.length, "tooltip", false);
      quill.setSelection(boundaryIndex + 1, 0);
      quill.focus();
    } else {
      quill.setSelection(range.index, range.length);
      quill.focus();
    }
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      apply();
    } else if (e.key === "Escape") {
      if (isApplied) return;
      isApplied = true;
      if (bubble.isConnected) {
        textarea.removeEventListener("keydown", onKeydown);
        textarea.removeEventListener("blur", apply);
        removeIfConnected(bubble);
      }
      quill.setSelection(range.index, range.length);
      quill.focus();
    }
  };

  textarea.addEventListener("keydown", onKeydown);
  textarea.addEventListener("blur", apply);
};

/**
 * Wires a toolbar button (looked up by id) to open a tooltip-text input for
 * the editor's current selection. Call after both the button and the Quill
 * instance have mounted.
 */
export const setupTooltipButton = (
  quillRef: QuillRef,
  options: QuillTooltipButtonOptions = {}
) => {
  const buttonId = options.buttonId || DEFAULT_BUTTON_ID;
  const button = document.getElementById(buttonId) as HTMLButtonElement | null;
  if (!button) return;

  button.onclick = () => openTooltipInput(quillRef, options);
};

const handleHover = (
  quill: QuillInstance,
  quillContainer: HTMLElement,
  classNames: QuillTooltipClassNames,
  options: QuillTooltipOptions,
  e: Event
) => {
  const target = e.target as HTMLElement;
  if (!target?.classList.contains(classNames.mark) || !target.hasAttribute(DATA_ATTR)) {
    return;
  }

  if (document.body.querySelector(`.${classNames.editBox}`)) return;

  const existingHover = document.body.querySelector(`.${classNames.hoverDisplay}`);
  if (existingHover) removeIfConnected(existingHover);

  const tooltipText = target.getAttribute(DATA_ATTR) || "";
  if (!tooltipText) return;

  const bubble = createBubble(
    classNames.hoverDisplay,
    classNames,
    target,
    options.isLightContainer
  );
  bubble.textContent = tooltipText;
  addCaret(bubble, classNames);
  document.body.appendChild(bubble);

  const blot = Quill.find(target) as any;
  const targetRect = blot
    ? getTargetRectForQuillSelection(
        quill,
        quillContainer,
        blot.offset(quill.scroll),
        blot.length(),
        quill.getBounds(blot.offset(quill.scroll), blot.length())
      )
    : getTargetRectForElement(target);

  // Start from the cursor itself when following it — anchoring at
  // `targetRect` first (e.g. the start of the marked phrase) and only
  // catching up to the pointer on the next mousemove reads as the bubble
  // jumping from the text to the cursor.
  const initialRect = options.followCursor ? cursorRect(e as MouseEvent) : targetRect;
  positionAndStyle(bubble, initialRect, options.gap);
  const stopFollowingCursor = attachCursorFollow(target, bubble, options.gap, options.followCursor);

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const cleanup = () => {
    removeIfConnected(bubble);
    target.removeEventListener("mouseleave", remove);
    bubble.removeEventListener("mouseenter", cancel);
    bubble.removeEventListener("mouseleave", remove);
    window.removeEventListener("scroll", onScroll, true);
    stopFollowingCursor?.();
  };
  const remove = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (!bubble.isConnected) return;
      cleanup();
    }, 100);
  };
  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  // The bubble is positioned in viewport coordinates at open time and
  // doesn't track its anchor's position, so any scroll — the page, or a
  // scrollable ancestor like the editor itself — leaves it pointing at
  // the wrong spot. Dismiss it rather than let it drift out of place.
  // Capture phase because scroll events don't bubble.
  const onScroll = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (bubble.isConnected) cleanup();
  };

  target.addEventListener("mouseleave", remove);
  bubble.addEventListener("mouseenter", cancel);
  bubble.addEventListener("mouseleave", remove);
  window.addEventListener("scroll", onScroll, true);
};

const handleClick = (
  quill: QuillInstance,
  quillContainer: HTMLElement,
  classNames: QuillTooltipClassNames,
  options: QuillTooltipOptions,
  e: Event
) => {
  const clickX = (e as MouseEvent).clientX;
  const clickY = (e as MouseEvent).clientY;

  setTimeout(() => {
    const target = document.elementFromPoint(clickX, clickY) as HTMLElement;
    if (!target?.classList.contains(classNames.mark) || !target.hasAttribute(DATA_ATTR)) {
      return;
    }

    removeExistingBubbles(classNames);
    const bubble = createBubble(
      classNames.editBox,
      classNames,
      target,
      options.isLightContainer
    );

    const blot = Quill.find(target) as any;
    const targetRect = blot
      ? getTargetRectForQuillSelection(
          quill,
          quillContainer,
          blot.offset(quill.scroll),
          blot.length(),
          quill.getBounds(blot.offset(quill.scroll), blot.length())
        )
      : getTargetRectForElement(target);

    const textarea = createAutoResizeTextarea(
      target.getAttribute(DATA_ATTR) || "",
      "",
      classNames,
      () => positionAndStyle(bubble, targetRect, options.gap)
    );
    bubble.appendChild(textarea);
    addCaret(bubble, classNames);
    document.body.appendChild(bubble);

    positionAndStyle(bubble, targetRect, options.gap);
    textarea.focus();
    textarea.select();

    let isSaved = false;
    const save = () => {
      if (isSaved) return;
      isSaved = true;

      const newTooltip = textarea.value.trim();
      const currentBlot = Quill.find(target) as any;
      if (currentBlot) {
        const index = currentBlot.offset(quill.scroll);
        const length = currentBlot.length();
        if (newTooltip) {
          quill.formatText(index, length, "tooltip", newTooltip);
        } else {
          const textContent = quill.getText(index, length);
          quill.setSelection(index, length);
          quill.deleteText(index, length);
          quill.insertText(index, textContent);
          quill.setSelection(index, textContent.length);
        }
      }

      if (bubble.isConnected) {
        textarea.removeEventListener("keydown", onKeydown);
        textarea.removeEventListener("blur", save);
        removeIfConnected(bubble);
      }
    };

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        save();
      } else if (e.key === "Escape") {
        if (isSaved) return;
        isSaved = true;
        if (bubble.isConnected) {
          textarea.removeEventListener("keydown", onKeydown);
          textarea.removeEventListener("blur", save);
          removeIfConnected(bubble);
        }
      }
    };

    textarea.addEventListener("keydown", onKeydown);
    textarea.addEventListener("blur", save);
  }, 0);
};

/**
 * Attaches hover-to-preview and click-to-edit behavior for tooltip-marked
 * text inside a live Quill editor. Safe to call repeatedly (e.g. on
 * re-render) — listeners are replaced, not stacked.
 *
 * @returns Cleanup function — call on unmount to remove all listeners
 */
export const setupTooltipInteractions = (
  quillRef: QuillRef,
  options: QuillTooltipOptions = {}
): (() => void) => {
  const quill = getQuillInstance(quillRef);
  if (!quill) return () => {};

  const quillContainer = quill.container;
  const classNames = resolveClassNames(options.classNames);

  const onClick = (e: Event) => handleClick(quill, quillContainer, classNames, options, e);
  const onHover = (e: Event) => handleHover(quill, quillContainer, classNames, options, e);

  quillContainer.addEventListener("click", onClick, true);
  quillContainer.addEventListener("mouseover", onHover, true);

  const checkVisibility = () => {
    const rect = quillContainer.getBoundingClientRect();
    const isVisible =
      rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
    if (!isVisible) removeExistingBubbles(classNames);
  };
  const onVisibilityChange = () => {
    if (document.hidden) removeExistingBubbles(classNames);
  };

  window.addEventListener("scroll", checkVisibility, true);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    quillContainer.removeEventListener("click", onClick, true);
    quillContainer.removeEventListener("mouseover", onHover, true);
    window.removeEventListener("scroll", checkVisibility, true);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
};

/**
 * React hook wiring `registerTooltipFormat` + `setupTooltipInteractions` to a
 * live Quill editor's lifecycle. Re-runs when `quillRef.current` changes.
 */
export const useQuillTooltip = (
  quillRef: QuillRef,
  options: QuillTooltipOptions = {}
) => {
  // Must run during render, not inside the effect below: `formats` on
  // ReactQuill/Quill snapshots the global format registry when the editor
  // instance is constructed, which happens in the *child*'s mount effect —
  // React runs that before this hook's own effect (parent effects fire
  // last). Registering here guarantees `Quill.register` has already run by
  // the time any Quill instance using this ref is created.
  registerTooltipFormat(options.classNames);

  useEffect(() => {
    return setupTooltipInteractions(quillRef, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quillRef.current, options.followCursor]);
};

/**
 * Attaches hover-to-preview behavior for tooltip-marked text inside a
 * read-only container (e.g. Quill HTML rendered via
 * `dangerouslySetInnerHTML`, outside of any live Quill instance).
 *
 * @returns Cleanup function — call on unmount
 */
export const setupTooltipRenderer = (
  containerRef: React.RefObject<HTMLElement | null>,
  options: QuillTooltipRendererOptions = {}
): (() => void) => {
  const container = containerRef.current;
  if (!container) return () => {};

  const classNames = resolveClassNames(options.classNames);

  const onHover = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target?.classList.contains(classNames.mark) || !target.hasAttribute(DATA_ATTR)) {
      return;
    }

    const existingHover = document.body.querySelector(`.${classNames.hoverDisplay}`);
    if (existingHover) removeIfConnected(existingHover);

    const tooltipText = target.getAttribute(DATA_ATTR) || "";
    if (!tooltipText) return;

    const bubble = createBubble(
      classNames.hoverDisplay,
      classNames,
      target,
      options.isLightContainer
    );
    if (options.rtl) bubble.setAttribute("dir", "rtl");
    bubble.textContent = tooltipText;
    addCaret(bubble, classNames);
    document.body.appendChild(bubble);

    // See the matching comment in `handleHover` — start at the cursor
    // itself when following it, instead of jumping there from the anchor.
    const initialRect = options.followCursor
      ? cursorRect(e as MouseEvent)
      : getTargetRectForElement(target);
    positionAndStyle(bubble, initialRect, options.gap);
    const stopFollowingCursor = attachCursorFollow(target, bubble, options.gap, options.followCursor);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      removeIfConnected(bubble);
      target.removeEventListener("mouseleave", remove);
      bubble.removeEventListener("mouseenter", cancel);
      bubble.removeEventListener("mouseleave", remove);
      window.removeEventListener("scroll", onScroll, true);
      stopFollowingCursor?.();
    };
    const remove = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!bubble.isConnected) return;
        cleanup();
      }, 100);
    };
    const cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
    // See the matching comment in `handleHover` — dismiss on scroll rather
    // than let the bubble drift away from its (now-moved) anchor.
    const onScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (bubble.isConnected) cleanup();
    };

    target.addEventListener("mouseleave", remove);
    bubble.addEventListener("mouseenter", cancel);
    bubble.addEventListener("mouseleave", remove);
    window.addEventListener("scroll", onScroll, true);
  };

  container.addEventListener("mouseover", onHover, true);

  return () => {
    container.removeEventListener("mouseover", onHover, true);
    const existingHover = document.body.querySelector(`.${classNames.hoverDisplay}`);
    if (existingHover) removeIfConnected(existingHover);
  };
};

/**
 * React hook wiring `setupTooltipRenderer` to a container's lifecycle.
 * Re-runs whenever `deps` changes (pass the rendered content and any
 * formatting props affecting layout, e.g. `[content, rtl]`).
 */
export const useQuillTooltipRenderer = (
  containerRef: React.RefObject<HTMLElement | null>,
  options: QuillTooltipRendererOptions = {},
  deps: React.DependencyList = []
) => {
  useEffect(() => {
    return setupTooltipRenderer(containerRef, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
