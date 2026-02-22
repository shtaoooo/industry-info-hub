import React, { useState } from 'react'
import { Form, Input, Button, message, Space } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

const { TextArea } = Input

interface SolutionMarkdownEditorProps {
  onUpload: (data: {
    targetCustomers?: string
    solutionContent?: string
    solutionSource?: string
    awsServices?: string
    whyAws?: string
    promotionKeyPoints?: string
    faq?: string
    keyTerms?: string
    successCases?: string
  }) => Promise<void>
  loading?: boolean
}

export const SolutionMarkdownEditor: React.FC<SolutionMarkdownEditorProps> = ({ onUpload, loading = false }) => {
  const [form] = Form.useForm()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    try {
      const values = await form.validateFields()
      setUploading(true)
      await onUpload(values)
      message.success('解决方案详细信息上传成功')
      form.resetFields()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Form form={form} layout="vertical">
        <Form.Item
          name="targetCustomers"
          label="适用客户群体（支持Markdown）"
        >
          <TextArea
            rows={4}
            placeholder="请输入适用客户群体描述，支持Markdown格式"
          />
        </Form.Item>
        <Form.Item
          name="solutionContent"
          label="方案内容（支持Markdown）"
        >
          <TextArea
            rows={6}
            placeholder="请输入方案内容，支持Markdown格式"
          />
        </Form.Item>
        <Form.Item
          name="solutionSource"
          label="方案来源（支持Markdown）"
        >
          <TextArea
            rows={4}
            placeholder="请输入方案来源，支持Markdown格式"
          />
        </Form.Item>
        <Form.Item
          name="awsServices"
          label="主要使用的AWS服务（支持Markdown）"
        >
          <TextArea
            rows={4}
            placeholder="请输入主要使用的AWS服务，支持Markdown格式"
          />
        </Form.Item>
        <Form.Item
          name="whyAws"
          label="Why AWS（支持Markdown）"
        >
          <TextArea
            rows={4}
            placeholder="请输入Why AWS说明，支持Markdown格式"
          />
        </Form.Item>
        <Form.Item
          name="promotionKeyPoints"
          label="方案推广关键点（支持Markdown）"
        >
          <TextArea
            rows={4}
            placeholder="请输入方案推广关键点，支持Markdown格式"
          />
        </Form.Item>
        <Form.Item
          name="faq"
          label="客户常见问题解答（支持Markdown）"
        >
          <TextArea
            rows={4}
            placeholder="请输入客户常见问题解答，支持Markdown格式"
          />
        </Form.Item>
        <Form.Item
          name="keyTerms"
          label="关键术语说明（支持Markdown）"
        >
          <TextArea
            rows={4}
            placeholder="请输入关键术语说明，支持Markdown格式"
          />
        </Form.Item>
        <Form.Item
          name="successCases"
          label="成功案例（支持Markdown）"
        >
          <TextArea
            rows={4}
            placeholder="请输入成功案例，支持Markdown格式"
          />
        </Form.Item>
      </Form>
      <Space>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={handleUpload}
          loading={uploading || loading}
        >
          保存并上传
        </Button>
      </Space>
    </div>
  )
}
