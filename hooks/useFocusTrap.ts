import { useEffect, useRef, useCallback } from 'react'

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isActive: boolean,
  options: {
    onEscape?: () => void
    initialFocus?: 'first' | 'container' | React.RefObject<HTMLElement>
    returnFocus?: boolean
  } = {}
) {
  const containerRef = useRef<T>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  const { onEscape, initialFocus = 'first', returnFocus = true } = options

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []
    
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')
    
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter(el => el.offsetParent !== null && !el.hasAttribute('aria-hidden'))
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isActive || !containerRef.current) return

    if (e.key === 'Escape' && onEscape) {
      e.preventDefault()
      onEscape()
      return
    }

    if (e.key === 'Tab') {
      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  }, [isActive, onEscape, getFocusableElements])

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    previousActiveElement.current = document.activeElement as HTMLElement

    const focusableElements = getFocusableElements()
    
    if (initialFocus === 'first' && focusableElements.length > 0) {
      requestAnimationFrame(() => {
        focusableElements[0].focus()
      })
    } else if (initialFocus === 'container' && containerRef.current) {
      containerRef.current.focus()
    } else if (typeof initialFocus === 'object' && initialFocus.current) {
      initialFocus.current.focus()
    }

    return () => {
      if (returnFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive, initialFocus, returnFocus, getFocusableElements])

  useEffect(() => {
    if (!isActive) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive, handleKeyDown])

  return containerRef
}

export default useFocusTrap
