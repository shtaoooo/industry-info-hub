import React, { useState, useRef, useEffect } from 'react'
import { Input, Button, Spin, Badge, Tooltip } from 'antd'
import {
  RobotOutlined,
  SendOutlined,
  CloseOutlined,
  SearchOutlined,
  ClearOutlined,
} from '@ant-design/icons'
import { copilotService } from '../services/copilotService'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

/**
 * Parse text containing Markdown links [text](url) and return React elements.
 * Links matching /public/ paths open in a new tab.
 */
function renderMessageContent(content: string): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(content)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    const linkText = match[1]
    const linkUrl = match[2]
    parts.push(
      <a
        key={match.index}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#0071e3',
          textDecoration: 'underline',
          textUnderlineOffset: 2,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#005bb5'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#0071e3'
        }}
      >
        {linkText}
      </a>
    )
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length > 0 ? parts : content
}

const CopilotChat: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        '你好！我是行业分类助手 🤖\n\n我可以帮你分析企业所属的行业信息。我会通过网络搜索该企业的公开资料，结合行业数据库给出分类建议。\n\n请输入企业名称开始分析。',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: new Date() }])
    setLoading(true)

    try {
      const res = await copilotService.chat(text)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, timestamp: new Date() },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '抱歉，分析失败，请稍后重试。',
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: '对话已清空。请输入企业名称开始新的分析。',
        timestamp: new Date(),
      },
    ])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  // Floating button when closed
  if (!open) {
    return (
      <Tooltip title="行业分类助手" placement="left">
        <div
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0071e3 0%, #0077ED 50%, #005bb5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(0, 113, 227, 0.45), 0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)'
            e.currentTarget.style.boxShadow =
              '0 8px 28px rgba(0, 113, 227, 0.55), 0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)'
            e.currentTarget.style.boxShadow =
              '0 6px 20px rgba(0, 113, 227, 0.45), 0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Badge dot={messages.length > 1} offset={[-4, 4]}>
            <RobotOutlined style={{ fontSize: 28, color: '#fff' }} />
          </Badge>
        </div>
      </Tooltip>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        width: 420,
        height: 560,
        borderRadius: 20,
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow:
          '0 20px 60px rgba(0, 0, 0, 0.12), 0 8px 20px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden',
        animation: 'copilotSlideUp 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #0071e3 0%, #0077ED 50%, #005bb5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RobotOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
              行业分类助手
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>
              <SearchOutlined style={{ marginRight: 4 }} />
              联网搜索 · AI 分析
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title="清空对话">
            <ClearOutlined
              onClick={handleClear}
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 15,
                cursor: 'pointer',
                padding: 4,
              }}
            />
          </Tooltip>
          <CloseOutlined
            onClick={() => setOpen(false)}
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 15,
              cursor: 'pointer',
              padding: 4,
            }}
          />
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: '#fafafa',
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {/* Avatar + Name row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: msg.role === 'user' ? '#e8e8ed' : '#0071e3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {msg.role === 'user' ? (
                  <span style={{ fontSize: 12, color: '#6e6e73' }}>我</span>
                ) : (
                  <RobotOutlined style={{ fontSize: 13, color: '#fff' }} />
                )}
              </div>
              <span style={{ fontSize: 11, color: '#86868b' }}>{formatTime(msg.timestamp)}</span>
            </div>
            {/* Message bubble */}
            <div
              style={{
                maxWidth: '88%',
                padding: '12px 16px',
                borderRadius:
                  msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? '#0071e3' : '#ffffff',
                color: msg.role === 'user' ? '#fff' : '#1d1d1f',
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                boxShadow:
                  msg.role === 'user'
                    ? 'none'
                    : '0 1px 4px rgba(0, 0, 0, 0.06)',
                border: msg.role === 'user' ? 'none' : '1px solid rgba(0, 0, 0, 0.04)',
              }}
            >
              {msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: '#0071e3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RobotOutlined style={{ fontSize: 13, color: '#fff' }} />
              </div>
            </div>
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '16px 16px 16px 4px',
                background: '#ffffff',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Spin size="small" />
              <span style={{ color: '#6e6e73', fontSize: 13 }}>
                正在搜索并分析中...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          background: '#fff',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          placeholder="输入企业名称，如：华为、Tesla..."
          disabled={loading}
          style={{
            borderRadius: 14,
            padding: '10px 16px',
            fontSize: 14,
            border: '1px solid #e5e5ea',
            boxShadow: 'none',
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!input.trim()}
          style={{
            borderRadius: 14,
            height: 42,
            width: 42,
            minWidth: 42,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: input.trim()
              ? '0 2px 8px rgba(0, 113, 227, 0.3)'
              : 'none',
          }}
        />
      </div>
    </div>
  )
}

export default CopilotChat
