import React, { useState } from 'react'
import { List, Button, message, Typography, Space, Modal } from 'antd'
import { EyeOutlined, FileOutlined, LoadingOutlined, FullscreenOutlined } from '@ant-design/icons'
import { Document } from '../types'
import { documentService } from '../services/documentService'

const { Text } = Typography

interface DocumentDownloadListProps {
  documents: Document[]
  title?: string
}

export const DocumentDownloadList: React.FC<DocumentDownloadListProps> = ({ documents, title = '相关文档' }) => {
  const [loading, setLoading] = useState<string | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [previewDocName, setPreviewDocName] = useState<string>('')

  const handleView = async (doc: Document) => {
    setLoading(doc.id)
    
    const hideLoading = message.loading('正在获取文档链接，请稍候...', 0)
    
    try {
      const response = await documentService.getDownloadUrl(doc.id, doc.s3Key)
      
      hideLoading()
      
      // Open preview modal
      setPreviewUrl(response.url)
      setPreviewDocName(doc.name)
      setPreviewVisible(true)
    } catch (error: any) {
      hideLoading()
      console.error('View error:', error)
      message.error(error.message || '获取文档链接失败，请稍后重试')
    } finally {
      setLoading(null)
    }
  }

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleClosePreview = () => {
    setPreviewVisible(false)
    setPreviewUrl('')
    setPreviewDocName('')
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
                icon={loading === doc.id ? <LoadingOutlined /> : <EyeOutlined />}
                loading={loading === doc.id}
                onClick={() => handleView(doc)}
                disabled={loading === doc.id}
              >
                {loading === doc.id ? '加载中' : '预览'}
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
      <div style={{ 
        marginTop: 12, 
        padding: '8px 12px', 
        background: '#f0f7ff', 
        borderRadius: 4,
        fontSize: 12,
        color: '#666'
      }}>
        💡 提示：点击"预览"在当前页面查看文档，大文件会渐进式加载
      </div>

      {/* PDF Preview Modal */}
      <Modal
        title={
          <Space>
            <FileOutlined />
            <span>{previewDocName}</span>
          </Space>
        }
        open={previewVisible}
        onCancel={handleClosePreview}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="newTab" icon={<FullscreenOutlined />} onClick={handleOpenInNewTab}>
            在新标签页打开
          </Button>,
          <Button key="close" onClick={handleClosePreview}>
            关闭
          </Button>,
        ]}
      >
        <div style={{ 
          width: '100%', 
          height: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 4
              }}
              title={previewDocName}
            />
          ) : (
            <Text type="secondary">加载中...</Text>
          )}
        </div>
      </Modal>
    </div>
  )
}
