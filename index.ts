/**
 * React Quill Tooltip
 *
 * Adds inline "tooltip" annotations to Quill content: mark selected text via
 * a toolbar button, preview on hover, and edit on click — for both a live
 * editor and read-only rendered HTML.
 *
 * @packageDocumentation
 */

export {
  defineTooltipFormat,
  openTooltipEditor,
  attachTooltipButton,
  attachTooltipEditor,
  attachTooltipRenderer,
  useTooltipEditor,
  useTooltipRenderer,
  computeTooltipPosition,
  DEFAULT_CLASS_NAMES,
  type QuillInstance,
  type QuillRef,
  type QuillTooltipClassNames,
  type QuillTooltipOptions,
  type QuillTooltipButtonOptions,
  type QuillTooltipRendererOptions,
} from "./quill-tooltip";

// Import the default styles in your application:
// import 'react-quill-tooltip/quill-tooltip.scss';
