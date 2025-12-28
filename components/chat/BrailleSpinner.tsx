import React, { useState, useEffect } from 'react'

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export const BrailleSpinner: React.FC = () => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % BRAILLE_FRAMES.length)
    }, 80)
    return () => clearInterval(interval)
  }, [])

  return <span className="text-white/40 ml-1">{BRAILLE_FRAMES[frame]}</span>
}

export default BrailleSpinner
