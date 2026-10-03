import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical } from "lucide-react";

export default function RowActionsMenu({ label, items, disabled = false }) {
  const id = useId();
  const trigger = useRef(null);
  const menu = useRef(null);
  const initialFocus = useRef(0);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  const updatePosition = useCallback(() => {
    if (!trigger.current || !menu.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const bounds = menu.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const leftEdge = (viewport?.offsetLeft || 0) + 8;
    const topEdge = (viewport?.offsetTop || 0) + 8;
    const rightEdge = leftEdge + (viewport?.width || window.innerWidth) - 16;
    const bottomEdge = topEdge + (viewport?.height || window.innerHeight) - 16;
    if (anchor.bottom < topEdge || anchor.top > bottomEdge) { setOpen(false); return; }
    setPosition({
      left: Math.max(leftEdge, Math.min(anchor.right - bounds.width, rightEdge - bounds.width)),
      top: Math.max(topEdge, anchor.bottom + 6 + bounds.height <= bottomEdge
        ? anchor.bottom + 6 : Math.min(anchor.top - bounds.height - 6, bottomEdge - bounds.height)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const buttons = menu.current?.querySelectorAll("[role='menuitem']") || [];
    buttons[initialFocus.current < 0 ? buttons.length - 1 : 0]?.focus({ preventScroll: true });
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function outside(event) {
      if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false);
    }
    function scroll(event) {
      if (!menu.current?.contains(event.target)) updatePosition();
    }
    const resize = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", resize);
    };
  }, [open, updatePosition]);

  function handleKeyDown(event) {
    if (event.key === "Escape") { event.preventDefault(); close(true); return; }
    if (event.key === "Tab") { close(true); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...menu.current.querySelectorAll("[role='menuitem']")];
    const index = buttons.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  return (
    <>
      <button ref={trigger} className="catalog-actions-trigger" type="button" title={label}
        aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        disabled={disabled} onClick={() => { initialFocus.current = 0; setOpen(current => !current); }}
        onKeyDown={event => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault(); initialFocus.current = event.key === "ArrowUp" ? -1 : 0; setOpen(true);
          }
        }}>
        <EllipsisVertical size={19} aria-hidden="true" />
      </button>
      {open && !disabled && createPortal(
        <div ref={menu} id={id} role="menu" aria-label={label} className="row-actions-menu"
          style={position} onKeyDown={handleKeyDown}>
          {items.map(item => (
            <button key={item.label} role="menuitem" type="button" className={item.danger ? "is-danger" : ""}
              onClick={() => { close(true); item.onSelect(); }}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </div>, document.body,
      )}
    </>
  );
}
