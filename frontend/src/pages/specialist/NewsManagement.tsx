import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Popconfirm,
  Typography,
  Card,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { News, Industry } from '../../types'
import { industryService } from '../../services/industryService'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

// 临时的 service 函数，后续需要创建独立的 service 文件
const newsService = {
  async list(): Promise<News[]> {
    const response = await fetch('/api/admin/news', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
    if (!response.ok) throw new Error('Failed to fetch news')
    return response.json()
  },

  async create(data: Partial<News>): Promise<News> {
    const response = await fetch('/api/admin/news', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create news')
    return response.json()
  },

  async update(id: string, data: Partial<News>): Promise<News> {
    const response = await fetch(`/api/admin/news/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update news')
    return response.json()
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/admin/news/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
    if (!response.ok) throw new Error('Failed to delete news')
  },
}

const NewsManagement: React.FC = () => {
  const [news, setNews] = useState<News[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNews, setEditingNews] = useState<News | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchNews = useCallback(async () => {
    setLoading(true)
    try {
      const data = await newsService.list()
      setNews(data)
    } catch (error: any) {
      message.error(error.message || '获取新闻列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchIndustries = useCallback(async () => {
    try {
      const data = await industryService.list()
      setIndustries(data)
    } catch (error: any) {
      message.error(error.message || '获取行业列表失败')
    }
  }, [])

  useEffect(() => {
    fetchNews()
    fetchIndustries()
  }, [fetchNews, fetchIndustries])

  const handleCreate = () => {
    setEditingNews(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (newsItem: News) => {
    setEditingNews(newsItem)
    form.setFieldsValue({
      industryId: newsItem.industryId,
      title: newsItem.title,
      summary: newsItem.summary,
      content: newsItem.content,
      imageUrl: newsItem.imageUrl,
      externalUrl: newsItem.externalUrl,
      author: newsItem.author,
      publishedAt: newsItem.publishedAt ? new Date(newsItem.publishedAt).toISOString().slice(0, 16) : null,
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const data = {
        ...values,
        publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : undefined,
      }

      if (editingNews) {
        await newsService.update(editingNews.id, data)
        message.success('新闻更新成功')
      } else {
        await newsService.create(data)
        message.success('新闻创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      setEditingNews(null)
      await fetchNews()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await newsService.delete(id)
      message.success('新闻删除成功')
      await fetchNews()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const getIndustryName = (industryId: string) => {
    const industry = industries.find((i) => i.id === industryId)
    return industry?.name || industryId
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
    },
    {
      title: '所属行业',
      dataIndex: 'industryId',
      key: 'industryId',
      width: 150,
      render: (industryId: string) => getIndustryName(industryId),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 120,
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: News) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此新闻吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          新闻管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增新闻
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={news}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingNews ? '编辑新闻' : '新增新闻'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingNews(null)
        }}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="industryId"
            label="所属行业"
            rules={[{ required: true, message: '请选择所属行业' }]}
          >
            <Select placeholder="请选择所属行业">
              {industries.map((industry) => (
                <Option key={industry.id} value={industry.id}>
                  {industry.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[
              { required: true, message: '请输入标题' },
              { max: 200, message: '标题不能超过200个字符' },
            ]}
          >
            <Input placeholder="请输入新闻标题" />
          </Form.Item>
          <Form.Item
            name="summary"
            label="摘要"
            rules={[
              { required: true, message: '请输入摘要' },
              { max: 500, message: '摘要不能超过500个字符' },
            ]}
          >
            <TextArea rows={3} placeholder="请输入新闻摘要" />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <TextArea rows={6} placeholder="请输入新闻内容" />
          </Form.Item>
          <Form.Item name="imageUrl" label="图片URL">
            <Input placeholder="请输入图片URL" />
          </Form.Item>
          <Form.Item name="externalUrl" label="外部链接">
            <Input placeholder="请输入外部链接URL" />
          </Form.Item>
          <Form.Item
            name="author"
            label="作者"
            rules={[{ required: true, message: '请输入作者' }]}
          >
            <Input placeholder="请输入作者名称" />
          </Form.Item>
          <Form.Item name="publishedAt" label="发布时间">
            <Input type="datetime-local" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default NewsManagement
