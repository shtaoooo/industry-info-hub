import React, { useState } from 'react'
import { Button, message, Space, Typography, List, Popconfirm } from 'antd'
import { UploadOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons'
import { Document } from '../types'
import { validateDocumentFile } from '../utils/validation'

const { Text } = Typography

interface DocumentUploaderProps {
  documents: Document[]
  onUpload: (fileName: string, fileContent: string, contentType: string) => Promise<void>
  onDelete: (docId: string) => Promise<void>
  loading?: boolean
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  documents,
  onUpload,
  onDelete,
  loading = false,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate document file
      const validation = validateDocumentFile(selectedFile)
      if (!validation.valid) {
        message.error(validation.message || '文件验证失败')
        setFile(null)
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      message.error('请先选择文件')
      return
    }

    setUploading(true)
    try {
      // Read file as base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const base64Content = e.target?.result as string
          // Remove data URL prefix
          const base64Data = base64Content.split(',')[1]

          await onUpload(file.name, base64Data, file.type)
          message.success('文档上传成功')

          // Clear file selection
          setFile(null)
          const fileInput = document.getElementById('document-file-input') as HTMLInputElement
          if (fileInput) {
            fileInput.value = ''
          }
        } catch (error: any) {
          message.error(error.message || '上传失败')
        } finally {
          setUploading(false)
        }
      }
      reader.onerror = () => {
        message.error('读取文件失败')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      message.error(error.message || '上传失败')
      setUploading(false)
    }
  }

  const handleDelete = async (docId: string) => {
    try {
      await onDelete(docId)
      message.success('文档删除成功')
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>文档管理</Text>
        </div>

        {documents.length > 0 && (
          <List
            size="small"
            bordered
            dataSource={documents}
            renderItem={(doc) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="delete"
                    title="确定要删除此文档吗？"
                    onConfirm={() => handleDelete(doc.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <Space>
                  <FileOutlined />
                  <Text>{doc.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(doc.uploadedAt).toLocaleString('zh-CN')}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        )}

        <div>
          <input
            id="document-file-input"
            type="file"
            onChange={handleFileChange}
            disabled={uploading || loading}
            style={{ display: 'none' }}
          />
          <label htmlFor="document-file-input">
            <Button
              icon={<FileOutlined />}
              disabled={uploading || loading}
              style={{ marginRight: 8 }}
              onClick={() => document.getElementById('document-file-input')?.click()}
            >
              选择文件
            </Button>
          </label>
          {file && <Text type="secondary">{file.name}</Text>}
        </div>
        {file && (
          <Button type="primary" icon={<UploadOutlined />} onClick={handleUpload} loading={uploading || loading}>
            上传
          </Button>
        )}
      </Space>
    </div>
  )
}
