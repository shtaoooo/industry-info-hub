import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Spin, Alert, Typography } from 'antd'
import { FileMarkdownOutlined } from '@ant-design/icons'

const { Title } = Typography

interface MarkdownViewerProps {
  url?: string
  content?: string
  title?: string
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ url, content, title }) => {
  const [markdownContent, setMarkdownContent] = useState<string>(content || '')
  const [loading, setLoading] = useState<boolean>(!!url && !content)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (url && !content) {
      fetchMarkdownContent(url)
    }
  }, [url, content])

  const fetchMarkdownContent = async (markdownUrl: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(markdownUrl)
      if (!response.ok) {
        throw new Error('获取Markdown内容失败')
      }
      const text = await response.text()
      setMarkdownContent(text)
    } catch (err: any) {
      console.error('Error fetching markdown:', err)
      setError(err.message || '加载Markdown内容失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        style={{ marginTop: 16 }}
      />
    )
  }

  if (!markdownContent) {
    return (
      <Alert
        message="暂无内容"
        description="该解决方案暂未上传详细介绍"
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    )
  }

  return (
    <div className="markdown-viewer">
      {title && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileMarkdownOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
        </div>
      )}
      <div className="markdown-content">
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
      </div>

      <style>{`
        .markdown-viewer {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .markdown-content {
          line-height: 1.8;
          color: #333;
        }

        .markdown-content h1 {
          font-size: 28px;
          font-weight: 600;
          margin-top: 24px;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e8e8e8;
        }

        .markdown-content h2 {
          font-size: 24px;
          font-weight: 600;
          margin-top: 20px;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid #e8e8e8;
        }

        .markdown-content h3 {
          font-size: 20px;
          font-weight: 600;
          margin-top: 16px;
          margin-bottom: 10px;
        }

        .markdown-content h4 {
          font-size: 18px;
          font-weight: 600;
          margin-top: 14px;
          margin-bottom: 8px;
        }

        .markdown-content h5 {
          font-size: 16px;
          font-weight: 600;
          margin-top: 12px;
          margin-bottom: 6px;
        }

        .markdown-content h6 {
          font-size: 14px;
          font-weight: 600;
          margin-top: 10px;
          margin-bottom: 6px;
        }

        .markdown-content p {
          margin-bottom: 16px;
        }

        .markdown-content ul,
        .markdown-content ol {
          margin-bottom: 16px;
          padding-left: 24px;
        }

        .markdown-content li {
          margin-bottom: 8px;
        }

        .markdown-content code {
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px;
          color: #d63384;
        }

        .markdown-content pre {
          background: #f5f5f5;
          padding: 16px;
          border-radius: 6px;
          overflow-x: auto;
          margin-bottom: 16px;
        }

        .markdown-content pre code {
          background: none;
          padding: 0;
          color: #333;
        }

        .markdown-content blockquote {
          border-left: 4px solid #1890ff;
          padding-left: 16px;
          margin: 16px 0;
          color: #666;
          font-style: italic;
        }

        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }

        .markdown-content table th,
        .markdown-content table td {
          border: 1px solid #e8e8e8;
          padding: 8px 12px;
          text-align: left;
        }

        .markdown-content table th {
          background: #fafafa;
          font-weight: 600;
        }

        .markdown-content a {
          color: #1890ff;
          text-decoration: none;
        }

        .markdown-content a:hover {
          text-decoration: underline;
        }

        .markdown-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 16px 0;
        }

        .markdown-content hr {
          border: none;
          border-top: 1px solid #e8e8e8;
          margin: 24px 0;
        }
      `}</style>
    </div>
  )
}
