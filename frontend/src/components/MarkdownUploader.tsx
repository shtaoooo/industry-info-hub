import React, { useState } from 'react'
import { Button, message, Space, Typography } from 'antd'
import { UploadOutlined, FileMarkdownOutlined } from '@ant-design/icons'
import { validateMarkdownFile } from '../utils/validation'

const { Text } = Typography

interface MarkdownUploaderProps {
  onUpload: (content: string) => Promise<void>
  loading?: boolean
}

export const MarkdownUploader: React.FC<MarkdownUploaderProps> = ({ onUpload, loading = false }) => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate markdown file
      const validation = validateMarkdownFile(selectedFile)
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
      const content = await file.text()
      await onUpload(content)
      message.success('Markdown文件上传成功')
      
      // Clear file selection
      setFile(null)
      const fileInput = document.getElementById('markdown-file-input') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (error: any) {
      message.error(error.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <input
            id="markdown-file-input"
            type="file"
            accept=".md,.markdown"
            onChange={handleFileChange}
            disabled={uploading || loading}
            style={{ display: 'none' }}
          />
          <label htmlFor="markdown-file-input">
            <Button
              icon={<FileMarkdownOutlined />}
              disabled={uploading || loading}
              style={{ marginRight: 8 }}
              onClick={() => document.getElementById('markdown-file-input')?.click()}
            >
              选择Markdown文件
            </Button>
          </label>
          {file && <Text type="secondary">{file.name}</Text>}
        </div>
        {file && (
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleUpload}
            loading={uploading || loading}
          >
            上传
          </Button>
        )}
      </Space>
    </div>
  )
}
