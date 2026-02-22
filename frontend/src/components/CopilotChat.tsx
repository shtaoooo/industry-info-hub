import React, { useState, useRef, useEffect } from 'react'
import { Input, Button, Spin } from 'antd'
import { RobotOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons'
import { copilotService } from '../services/copilotService'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const CopilotChat: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是行业分类助手。请输入企业名称，我会帮你分析该企业所属的行业信息。' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await copilotService.chat(text)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '抱歉，分析失败，请稍后重试。' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#0071e3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0, 113, 227, 0.4)',
          zIndex: 1000,
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <RobotOutlined style={{ fontSize: 26, color: '#fff' }} />
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        width: 400,
        height: 520,
        borderRadius: 18,
        background: '#ffffff',
        border: '1px solid #d2d2d7',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          background: '#0071e3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RobotOutlined style={{ fontSize: 20, color: '#fff' }} />
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>行业分类助手</span>
        </div>
        <CloseOutlined
          onClick={() => setOpen(false)}
          style={{ color: '#fff', fontSize: 16, cursor: 'pointer' }}
        />
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.role === 'user' ? '#0071e3' : '#f5f5f7',
                color: msg.role === 'user' ? '#fff' : '#1d1d1f',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '14px 14px 14px 4px',
                background: '#f5f5f7',
              }}
            >
              <Spin size="small" />
              <span style={{ marginLeft: 8, color: '#86868b', fontSize: 13 }}>分析中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e5e5ea',
          display: 'flex',
          gap: 8,
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          placeholder="输入企业名称，如：华为、Tesla..."
          disabled={loading}
          style={{ borderRadius: 12 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!input.trim()}
          style={{ borderRadius: 12 }}
        />
      </div>
    </div>
  )
}

export default CopilotChat
