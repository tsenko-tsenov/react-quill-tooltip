import { useRef, useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useTooltipEditor, useTooltipRenderer, attachTooltipButton } from "react-quill-tooltip";
import "../../quill-tooltip.scss";
import "./App.scss";

const FORMATS = ["header", "bold", "italic", "underline", "list", "bullet", "link", "tooltip"];

const SEED_CONTENT =
  '<p>Lorem ipsum dolor sit amet, <span class="qtt-mark" data-qtt-tooltip="Consulting detail on demand, without a footnote in sight.">consectetur adipiscing elit</span>, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>' +
  '<p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in <span class="qtt-mark" data-qtt-tooltip="Reprehenderit: appearing only when someone leans in to check.">reprehenderit in voluptate</span> velit esse cillum dolore eu fugiat nulla pariatur.</p>';

function App() {
  const quillRef = useRef<ReactQuill>(null);
  const renderedRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(SEED_CONTENT);
  const [followCursor, setFollowCursor] = useState(false);
  const [lightBubble, setLightBubble] = useState(false);

  // followCursor is a "Rendered HTML" preview-only toggle, so it's not
  // passed here.
  useTooltipEditor(quillRef, {
    placeholder: "Enter tooltip text...",
  });

  useEffect(() => {
    attachTooltipButton(quillRef, {
      placeholder: "Enter tooltip text...",
    });
  }, []);

  // react-quill 2.x's initial `value` prop goes through
  // `editor.clipboard.convert()`, which silently drops it on this Quill
  // 2.x version — `dangerouslyPasteHTML` is the working path around that.
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    editor.clipboard.dangerouslyPasteHTML(SEED_CONTENT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hover-preview for the read-only rendered HTML pane.
  useTooltipRenderer(
    renderedRef,
    { followCursor, isLightContainer: () => lightBubble },
    [content, followCursor, lightBubble]
  );

  const modules = {
    toolbar: {
      container: "#custom-toolbar",
    },
  };

  return (
    <div className="app">
      <header className="masthead">
        <span className="masthead-mark" aria-hidden="true">¶</span>
        <p className="masthead-eyebrow">Tooltip Extension for Quill</p>
        <h1 className="masthead-title">React Quill Tooltip</h1>
        <p className="masthead-byline">
          Create interactive tooltips by selecting text and attaching custom content.
        </p>
        <hr className="masthead-rule" />
      </header>

      <main className="manuscript">
        <section className="draft" aria-label="Editor">
          <div className="section-label">
            <span className="section-index">01</span>
            <span>Editor</span>
          </div>

          <div className="editors-note">
            <span className="editors-note-label">Editor's note</span>
            <p>
             Select text and choose "Add tooltip" to attach a tooltip. Hover over highlighted text to preview it, or click to edit.
            </p>
          </div>

          <div id="custom-toolbar" className="custom-toolbar">
            <span className="ql-formats">
              <select className="ql-header" defaultValue="">
                <option value="">Normal</option>
                <option value="1">Heading 1</option>
                <option value="2">Heading 2</option>
                <option value="3">Heading 3</option>
              </select>
            </span>
            <span className="ql-formats">
              <button className="ql-bold" type="button"></button>
              <button className="ql-italic" type="button"></button>
              <button className="ql-underline" type="button"></button>
            </span>
            <span className="ql-formats">
              <button
                className="ql-list"
                value="ordered"
                type="button"
              ></button>
              <button
                className="ql-list"
                value="bullet"
                type="button"
              ></button>
            </span>
            <span className="ql-formats">
              <button className="ql-link" type="button"></button>
            </span>
            <span className="ql-formats">
              <button className="ql-clean" type="button"></button>
            </span>
            <span className="ql-formats qtt-toolbar-group">
              <button id="qtt-toolbar-button" className="qtt-add-button" type="button">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Add Tooltip
              </button>
            </span>
          </div>

          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={setContent}
            modules={modules}
            formats={FORMATS}
            placeholder="Start typing or select existing text..."
          />
        </section>

        <aside className="margin-rail">
          <section className="rail-block" aria-label="Rendered preview">
            <div className="section-label">
              <span className="section-index">02</span>
              <span>Preview</span>
            </div>
            <div className="toggle-group">
              <label className="demo-toggle">
                <span className="switch">
                  <input
                    type="checkbox"
                    checked={followCursor}
                    onChange={(e) => setFollowCursor(e.target.checked)}
                  />
                  <span className="switch-track">
                    <span className="switch-thumb"></span>
                  </span>
                </span>
                Follow cursor on hover
              </label>
              <label className="demo-toggle">
                <span className="switch">
                  <input
                    type="checkbox"
                    checked={lightBubble}
                    onChange={(e) => setLightBubble(e.target.checked)}
                  />
                  <span className="switch-track">
                    <span className="switch-thumb"></span>
                  </span>
                </span>
                Light tooltip style
              </label>
            </div>
            <div className="rendered-output">
              <div
                ref={renderedRef}
                className="rendered-content"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </section>

          <section className="rail-block" aria-label="HTML source">
            <div className="section-label">
              <span className="section-index">03</span>
              <span>HTML Output</span>
            </div>
            <div className="html-output">
              <pre>{content}</pre>
            </div>
          </section>
        </aside>
      </main>

      <footer className="colophon">
        <p>
          React Quill Tooltip — built with React, TypeScript, and Vite. By{" "}
          <a href="https://github.com/tsenko-tsenov" target="_blank" rel="noopener noreferrer">
            @tsenko-tsenov
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

export default App;
