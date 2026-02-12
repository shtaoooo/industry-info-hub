import React, { useState } from 'react'
import { List, Button, message, Typography, Space } from 'antd'
import { DownloadOutlined, FileOutlined } from '@ant-design/icons'
import { Document } from '../types'
import { documentService } from '../services/documentService'

const { Text } = Typography

interface DocumentDownloadListProps {
  documents: Document[]
  title?: string
}

export const DocumentDownloadList: React.FC<DocumentDownloadListProps> = ({ documents, title = '相关文档' }) => {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id)
    try {
      const response = await documentService.getDownloadUrl(doc.id, doc.s3Key)
      
      // Open download URL in new window
      window.open(response.url, '_blank')
      message.success('文档下载链接已生成')
    } catch (error: any) {
      console.error('Download error:', error)
      message.error(error.message || '获取下载链接失败，请稍后重试')
    } finally {
      setDownloading(null)
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
                key="download"
                type="link"
                icon={<DownloadOutlined />}
                loading={downloading === doc.id}
                onClick={() => handleDownload(doc)}
              >
                下载
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
