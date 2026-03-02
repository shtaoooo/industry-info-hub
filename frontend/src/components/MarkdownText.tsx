import React from 'react'
import ReactMarkdown from 'react-markdown'

interface MarkdownTextProps {
  children?: string | null
  className?: string
  style?: React.CSSProperties
  fallback?: React.ReactNode
}

/**
 * Lightweight inline markdown renderer for DynamoDB text fields.
 * Renders markdown content inline without extra wrapper styles.
 */
const MarkdownText: React.FC<MarkdownTextProps> = ({ children, className, style, fallback }) => {
  if (!children) {
    return <>{fallback || null}</>
  }

  return (
    <div className={`md-text ${className || ''}`} style={style}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}

export default MarkdownText
