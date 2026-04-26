import { useEffect, useRef, useId } from 'react'

/**
 * Bottom-sheet on mobile (slides up from bottom) / centered modal on tablet+
 * Implements: role=dialog + aria-modal + aria-labelledby, Esc-to-close,
 * outside-click-to-close, focus trap, focus restore on unmount, safe-area-bottom,
 * iOS-style spring easing.
 *
 * Props:
 *   open          - boolean (parent controls mount; this is rendered only when open)
 *   onClose       - () => void
 *   onTryClose    - optional () => boolean   (return false to block close, e.g. dirty form)
 *   labelledBy    - id of element that titles the sheet (auto-generated if omitted)
 *   size          - 'sm' | 'md' | 'lg' | 'xl' | '4xl'  desktop max-width
 *   dismissable   - if false, scrim click + Esc do nothing (default true)
 *   showHandle    - mobile drag handle visible (default true)
 *   className     - extra classes on the panel
 */
const SIZE = {
  sm:   'sm:max-w-sm',
  md:   'sm:max-w-md',
  lg:   'sm:max-w-lg',
  xl:   'sm:max-w-xl',
  '2xl':'sm:max-w-2xl',
  '4xl':'sm:max-w-4xl',
}

export default function Sheet({
  open,
  onClose,
  onTryClose,
  labelledBy,
  size = 'md',
  dismissable = true,
  showHandle = true,
  className = '',
  children,
}) {
  const panelRef = useRef(null)
  const lastFocusedRef = useRef(null)
  const fallbackId = useId()
  const titleId = labelledBy || `sheet-title-${fallbackId}`

  function attemptClose() {
    if (!dismissable) return
    if (onTryClose && onTryClose() === false) return
    onClose?.()
  }

  // Save the element that opened the sheet so we can restore focus on unmount.
  useEffect(() => {
    if (!open) return
    lastFocusedRef.current = document.activeElement

    // Move focus into the sheet (first focusable element)
    requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelector(
        'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])',
      )
      ;(focusable || panel).focus({ preventScroll: true })
    })

    // Lock body scroll while sheet is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      const last = lastFocusedRef.current
      if (last && typeof last.focus === 'function') {
        last.focus({ preventScroll: true })
      }
    }
  }, [open])

  // Esc to close + focus trap
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        attemptClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open]) // eslint-disable-line

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-sheet flex items-end sm:items-center justify-center sm:p-4"
      role="presentation"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-scrim-in"
        onClick={attemptClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          'sheet-panel relative w-full',
          SIZE[size] || SIZE.md,
          'max-h-[100dvh] sm:max-h-[90dvh]',
          'animate-sheet-in sm:animate-sheet-in-sm',
          'pb-[env(safe-area-inset-bottom)]',
          className,
        ].join(' ')}
      >
        {showHandle && (
          <div
            className="sm:hidden mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-slate-300 shrink-0"
            aria-hidden="true"
          />
        )}
        {/* children may use this id on their visible title */}
        {typeof children === 'function' ? children({ titleId }) : children}
      </div>
    </div>
  )
}
