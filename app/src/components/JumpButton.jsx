/**
 * An in-page jump that survives HashRouter.
 *
 * A plain <a href="#request"> cannot work here. The router keeps the route in
 * the hash, so the browser would overwrite "#/catering" with "#request" and the
 * app would try to render a route called "request" instead of scrolling. A
 * button says what this really is — a scroll, not a navigation — and nothing
 * touches the URL.
 *
 * focusRef moves the caret to the field the jump is really about, which is both
 * the accessible thing to do on an in-page jump and the reason someone pressed
 * the button. preventScroll keeps the browser from fighting the scroll below.
 */
export function JumpButton({ targetId, focusRef, className, children, ...rest }) {
  const go = () => {
    const target = document.getElementById(targetId)
    if (!target) return

    // The fixed header is already cleared by a scroll-margin-top on the target,
    // so read the offset back out of the CSS rather than keeping a second copy
    // of the header height in here.
    const pad = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
    const absolute = (el) => el.getBoundingClientRect().top + window.scrollY
    let top = absolute(target) - pad

    const field = focusRef?.current
    if (field) {
      // Where the field would land once the section is at the top. On a phone
      // the page stacks, which drops it onto the bottom edge with nowhere for
      // the answers to appear and the keyboard about to cover it. When that
      // happens, bring the field itself up to about a third of the way down —
      // far enough to keep its heading in shot, high enough to leave the rest
      // of the screen for results.
      if (absolute(field) - top > window.innerHeight * 0.55) {
        top = absolute(field) - window.innerHeight * 0.3
      }
      field.focus({ preventScroll: true })
    }

    // No behavior given, so this follows scroll-behavior from base.css, which
    // already turns smooth off under prefers-reduced-motion.
    window.scrollTo({ top })
  }

  return (
    <button type="button" className={className} onClick={go} {...rest}>
      {children}
    </button>
  )
}
