import React, { useState } from 'react'
import { List, Button, message, Typography, Space } from 'antd'
import { EyeOutlined, FileOutlined } from '@ant-design/icons'
import { Document } from '../types'
import { documentService } from '../services/documentService'

const { Text } = Typography

interface DocumentDownloadListProps {
  documents: Document[]
  title?: string
}

export const DocumentDownloadList: React.FC<DocumentDownloadListProps> = ({ documents, title = '相关文档' }) => {
  const [loading, setLoading] = useState<string | null>(null)

  const handleView = async (doc: Document) => {
    setLoading(doc.id)
    try {
      const response = await documentService.getDownloadUrl(doc.id, doc.s3Key)
      
      // Open document in new window/tab
      window.open(response.url, '_blank', 'noopener,noreferrer')
      message.success('正在打开文档...')
    } catch (error: any) {
      console.error('View error:', error)
      message.error(error.message || '获取文档链接失败，请稍后重试')
    } finally {
      setLoading(null)
    }
  }

  if (!documents || documents.length === 0) {
    return (
      <div style={{ padding: '16px 0' }}>
        <Text type="secondary">暂无相关文档</Text>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>
        {title}
      </Text>
      <List
        size="small"
        bordered
        dataSource={documents}
        renderItem={(doc) => (
          <List.Item
            actions={[
              <Button
                key="view"
                type="link"
                icon={<EyeOutlined />}
                loading={loading === doc.id}
                onClick={() => handleView(doc)}
              >
                查看
              </Button>,
            ]}
          >
            <Space>
              <FileOutlined style={{ fontSize: 16, color: '#1890ff' }} />
              <div>
                <Text>{doc.name}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  上传时间: {new Date(doc.uploadedAt).toLocaleString('zh-CN')}
                </Text>
              </div>
            </Space>
          </List.Item>
        )}
      />
    </div>
  )
}
