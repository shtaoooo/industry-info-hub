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
  Dropdown,
  List,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, LinkOutlined } from '@ant-design/icons'
import { News, Industry } from '../../types'
import { industryService } from '../../services/industryService'
import { api } from '../../services/api'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

interface NewsFeed {
  id: string
  industryId: string
  name: string
  url: string
  description?: string
  createdAt: string
  createdBy: string
}

const newsService = {
  list: () => api.get<News[]>('/admin/news'),
  create: (data: Partial<News>) => api.post<News>('/admin/news', data),
  update: (id: string, data: Partial<News>) => api.put<News>(`/admin/news/${id}`, data),
  delete: (id: string) => api.delete<void>(`/admin/news/${id}`),
}

const newsFeedService = {
  list: (industryId: string) => api.get<NewsFeed[]>(`/admin/news-feeds?industryId=${industryId}`),
  create: (data: Partial<NewsFeed>) => api.post<NewsFeed>('/admin/news-feeds', data),
  delete: (id: string) => api.delete<void>(`/admin/news-feeds/${id}`),
}

const NewsManagement: React.FC = () => {
  const [news, setNews] = useState<News[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNews, setEditingNews] = useState<News | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  // News Feeds state
  const [feedsModalVisible, setFeedsModalVisible] = useState(false)
  const [feedsIndustryId, setFeedsIndustryId] = useState<string>('')
  const [feeds, setFeeds] = useState<NewsFeed[]>([])
  const [feedsLoading, setFeedsLoading] = useState(false)
  const [addFeedVisible, setAddFeedVisible] = useState(false)
  const [feedForm] = Form.useForm()
  const [feedSubmitting, setFeedSubmitting] = useState(false)

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

  // News Feeds handlers
  const openFeedsModal = () => {
    if (industries.length > 0) {
      setFeedsIndustryId(industries[0].id)
      loadFeeds(industries[0].id)
    }
    setFeedsModalVisible(true)
  }

  const loadFeeds = async (industryId: string) => {
    if (!industryId) return
    setFeedsLoading(true)
    try {
      const data = await newsFeedService.list(industryId)
      setFeeds(data)
    } catch (error: any) {
      message.error(error.message || '获取订阅源失败')
    } finally {
      setFeedsLoading(false)
    }
  }

  const handleFeedsIndustryChange = (industryId: string) => {
    setFeedsIndustryId(industryId)
    loadFeeds(industryId)
  }

  const handleAddFeed = async () => {
    try {
      const values = await feedForm.validateFields()
      setFeedSubmitting(true)
      await newsFeedService.create({
        industryId: feedsIndustryId,
        name: values.name,
        url: values.url,
        description: values.description,
      })
      message.success('订阅源添加成功')
      feedForm.resetFields()
      setAddFeedVisible(false)
      await loadFeeds(feedsIndustryId)
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || '添加订阅源失败')
    } finally {
      setFeedSubmitting(false)
    }
  }

  const handleDeleteFeed = async (feedId: string) => {
    try {
      await newsFeedService.delete(feedId)
      message.success('订阅源已删除')
      await loadFeeds(feedsIndustryId)
    } catch (error: any) {
      message.error(error.message || '删除订阅源失败')
    }
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

  const settingsMenuItems = [
    {
      key: 'feeds',
      icon: <LinkOutlined />,
      label: '编辑新闻订阅源',
      onClick: openFeedsModal,
    },
  ]

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          新闻管理
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增新闻
          </Button>
          <Dropdown menu={{ items: settingsMenuItems }} placement="bottomRight">
            <Button icon={<SettingOutlined />} />
          </Dropdown>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={news}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1200 }}
      />

      {/* 新增/编辑新闻对话框 */}
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
          <Form.Item name="industryId" label="所属行业" rules={[{ required: true, message: '请选择所属行业' }]}>
            <Select placeholder="请选择所属行业">
              {industries.map((industry) => (
                <Option key={industry.id} value={industry.id}>{industry.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }, { max: 200, message: '标题不能超过200个字符' }]}>
            <Input placeholder="请输入新闻标题" />
          </Form.Item>
          <Form.Item name="summary" label="摘要" rules={[{ required: true, message: '请输入摘要' }, { max: 500, message: '摘要不能超过500个字符' }]}>
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
          <Form.Item name="author" label="作者" rules={[{ required: true, message: '请输入作者' }]}>
            <Input placeholder="请输入作者名称" />
          </Form.Item>
          <Form.Item name="publishedAt" label="发布时间">
            <Input type="datetime-local" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新闻订阅源对话框 */}
      <Modal
        title="新闻订阅源管理"
        open={feedsModalVisible}
        onCancel={() => {
          setFeedsModalVisible(false)
          setAddFeedVisible(false)
          feedForm.resetFields()
        }}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <Select
            value={feedsIndustryId}
            onChange={handleFeedsIndustryChange}
            style={{ width: '100%' }}
            placeholder="选择行业"
          >
            {industries.map((industry) => (
              <Option key={industry.id} value={industry.id}>{industry.name}</Option>
            ))}
          </Select>
        </div>

        <List
          loading={feedsLoading}
          dataSource={feeds}
          locale={{ emptyText: '该行业暂无订阅源' }}
          renderItem={(feed) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="delete"
                  title="确定要删除此订阅源吗？"
                  onConfirm={() => handleDeleteFeed(feed.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<LinkOutlined style={{ fontSize: 20, color: '#0071e3', marginTop: 4 }} />}
                title={feed.name}
                description={
                  <div>
                    <a href={feed.url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>{feed.url}</a>
                    {feed.description && <div style={{ color: '#86868b', marginTop: 4 }}>{feed.description}</div>}
                  </div>
                }
              />
            </List.Item>
          )}
        />

        {!addFeedVisible ? (
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setAddFeedVisible(true)}
            style={{ width: '100%', marginTop: 16 }}
          >
            添加订阅源
          </Button>
        ) : (
          <div style={{ marginTop: 16, padding: 16, background: '#f5f5f7', borderRadius: 8 }}>
            <Form form={feedForm} layout="vertical">
              <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入订阅源名称' }]}>
                <Input placeholder="例如：AWS 官方博客" />
              </Form.Item>
              <Form.Item name="url" label="链接" rules={[{ required: true, message: '请输入订阅源链接' }, { type: 'url', message: '请输入有效的URL' }]}>
                <Input placeholder="https://..." />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <Input placeholder="可选描述" />
              </Form.Item>
            </Form>
            <Space>
              <Button type="primary" onClick={handleAddFeed} loading={feedSubmitting}>保存</Button>
              <Button onClick={() => { setAddFeedVisible(false); feedForm.resetFields() }}>取消</Button>
            </Space>
          </div>
        )}
      </Modal>
    </Card>
  )
}

export default NewsManagement
