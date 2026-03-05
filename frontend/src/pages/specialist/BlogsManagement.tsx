import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Tag,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Blog, Industry, SubIndustry, UseCase } from '../../types'
import { industryService } from '../../services/industryService'
import { subIndustryService } from '../../services/subIndustryService'
import { useCaseService } from '../../services/useCaseService'
import { api } from '../../services/api'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

const blogsService = {
  list: () => api.get<Blog[]>('/specialist/blogs'),
  create: (data: Partial<Blog>) => api.post<Blog>('/specialist/blogs', data),
  update: (id: string, data: Partial<Blog>) => api.put<Blog>(`/specialist/blogs/${id}`, data),
  delete: (id: string) => api.delete<void>(`/specialist/blogs/${id}`),
}

const BlogsManagement: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [subIndustries, setSubIndustries] = useState<SubIndustry[]>([])
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const [filterIndustryId, setFilterIndustryId] = useState<string | null>(null)

  const fetchBlogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await blogsService.list()
      setBlogs(data)
    } catch (error: any) {
      message.error(error.message || '获取博客列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBlogs()
    industryService.list().then(setIndustries).catch(() => {})
    subIndustryService.listAll().then(setSubIndustries).catch(() => {})
    useCaseService.list().then(setUseCases).catch(() => {})
  }, [fetchBlogs])

  // Build use case options grouped by sub-industry, filtered by selected industry
  const useCaseSelectOptions = useMemo(() => {
    const filtered = filterIndustryId
      ? useCases.filter(uc => {
          const si = subIndustries.find(s => s.id === uc.subIndustryId)
          return si?.industryId === filterIndustryId
        })
      : useCases

    // Group by subIndustry
    const groups: Record<string, { label: string; cases: UseCase[] }> = {}
    filtered.forEach(uc => {
      const si = subIndustries.find(s => s.id === uc.subIndustryId)
      const key = uc.subIndustryId
      if (!groups[key]) {
        groups[key] = { label: si?.name || key, cases: [] }
      }
      groups[key].cases.push(uc)
    })
    return groups
  }, [useCases, subIndustries, filterIndustryId])

  const openModal = (blog?: Blog) => {
    if (blog) {
      setEditingBlog(blog)
      setFilterIndustryId(blog.industryId || null)
      form.setFieldsValue({
        industryId: blog.industryId,
        useCaseIds: blog.useCaseIds || [],
        title: blog.title,
        summary: blog.summary,
        content: blog.content,
        imageUrl: blog.imageUrl,
        externalUrl: blog.externalUrl,
        author: blog.author,
        publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString().slice(0, 16) : null,
      })
    } else {
      setEditingBlog(null)
      setFilterIndustryId(null)
      form.resetFields()
    }
    setModalVisible(true)
  }

  const handleIndustryChange = (val: string) => {
    setFilterIndustryId(val || null)
    // Clear use case selection when industry changes
    form.setFieldValue('useCaseIds', [])
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const data = {
        industryId: values.industryId,
        useCaseIds: values.useCaseIds || [],
        title: values.title,
        summary: values.summary,
        content: values.content,
        imageUrl: values.imageUrl,
        externalUrl: values.externalUrl,
        author: values.author,
        publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : undefined,
      }
      if (editingBlog) {
        await blogsService.update(editingBlog.id, data)
        message.success('博客更新成功')
      } else {
        await blogsService.create(data)
        message.success('博客创建成功')
      }
      setModalVisible(false)
      form.resetFields()
      setEditingBlog(null)
      setFilterIndustryId(null)
      await fetchBlogs()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await blogsService.delete(id)
      message.success('博客删除成功')
      await fetchBlogs()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const getIndustryName = (industryId: string) =>
    industries.find(i => i.id === industryId)?.name || industryId

  const getUseCaseNames = (useCaseIds?: string[]) => {
    if (!useCaseIds || useCaseIds.length === 0) return '-'
    return useCaseIds.map(id => useCases.find(uc => uc.id === id)?.name || id).join(', ')
  }

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', width: 200 },
    {
      title: '所属行业',
      dataIndex: 'industryId',
      key: 'industryId',
      width: 120,
      render: (id: string) => getIndustryName(id),
    },
    {
      title: '关联用例',
      dataIndex: 'useCaseIds',
      key: 'useCaseIds',
      width: 200,
      render: (ids?: string[]) =>
        ids && ids.length > 0 ? (
          <span title={getUseCaseNames(ids)}>{ids.length} 个用例</span>
        ) : '-',
    },
    { title: '摘要', dataIndex: 'summary', key: 'summary', ellipsis: true },
    { title: '作者', dataIndex: 'author', key: 'author', width: 100 },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 160,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: Blog) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此博客吗？"
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
          博客管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增博客
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={blogs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1400 }}
      />
      <Modal
        title={editingBlog ? '编辑博客' : '新增博客'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingBlog(null)
          setFilterIndustryId(null)
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
            <Select placeholder="请选择所属行业" onChange={handleIndustryChange} allowClear>
              {industries.map(i => (
                <Option key={i.id} value={i.id}>{i.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="useCaseIds"
            label="关联用例（可多选，支持跨子行业）"
            tooltip="可选择任意子行业下的用例，选择行业后可缩小范围"
          >
            <Select
              mode="multiple"
              placeholder="搜索并选择用例"
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              maxTagCount="responsive"
              allowClear
            >
              {Object.entries(useCaseSelectOptions).map(([siId, group]) => (
                <Select.OptGroup key={siId} label={<Tag color="blue">{group.label}</Tag>}>
                  {group.cases.map(uc => (
                    <Option key={uc.id} value={uc.id} label={uc.name}>
                      {uc.name}
                    </Option>
                  ))}
                </Select.OptGroup>
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
            <Input placeholder="请输入博客标题" />
          </Form.Item>
          <Form.Item
            name="summary"
            label="摘要"
            rules={[
              { required: true, message: '请输入摘要' },
              { max: 500, message: '摘要不能超过500个字符' },
            ]}
          >
            <TextArea rows={3} placeholder="请输入博客摘要" />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <TextArea rows={6} placeholder="请输入博客内容" />
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

export default BlogsManagement
