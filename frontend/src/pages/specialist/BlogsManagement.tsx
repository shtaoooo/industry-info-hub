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
  // Cascading select states
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const [tier2Options, setTier2Options] = useState<SubIndustry[]>([])
  const [tier3Options, setTier3Options] = useState<SubIndustry[]>([])
  const [useCaseOptions, setUseCaseOptions] = useState<UseCase[]>([])
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
  const fetchIndustries = useCallback(async () => {
    try {
      const data = await industryService.list()
      setIndustries(data)
    } catch (error: any) {
      message.error(error.message || '获取行业列表失败')
    }
  }, [])
  const fetchSubIndustries = useCallback(async () => {
    try {
      const data = await subIndustryService.listAll()
      setSubIndustries(data)
    } catch (error: any) {
      message.error(error.message || '获取子行业列表失�?)
    }
  }, [])
  const fetchUseCases = useCallback(async () => {
    try {
      const data = await useCaseService.list()
      setUseCases(data)
    } catch (error: any) {
      message.error(error.message || '获取用例列表失败')
    }
  }, [])
  useEffect(() => {
    fetchBlogs()
    fetchIndustries()
    fetchSubIndustries()
    fetchUseCases()
  }, [fetchBlogs, fetchIndustries, fetchSubIndustries, fetchUseCases])
  const handleCreate = () => {
    setEditingBlog(null)
    form.resetFields()
    setSelectedIndustry(null)
    setTier2Options([])
    setTier3Options([])
    setUseCaseOptions([])
    setModalVisible(true)
  }
  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog)
    // Set up cascading selects based on existing data
    if (blog.useCaseIds && blog.useCaseIds.length > 0) {
      // 找到第一个use case来设置级联选择�?
      const firstUseCaseId = blog.useCaseIds[0]
      const useCase = useCases.find(uc => uc.id === firstUseCaseId)
      if (useCase) {
        const subIndustry = subIndustries.find(si => si.id === useCase.subIndustryId)
        // Set industry
        setSelectedIndustry(blog.industryId)
        const tier2List = subIndustries.filter(si => si.industryId === blog.industryId && (!si.level || si.level === 'Tier2-individual' || si.level === 'Tier2-Group'))
        setTier2Options(tier2List)
        if (subIndustry?.level === 'Tier3' && subIndustry.parentSubIndustryId) {
          // It's a Tier3, set up parent Tier2
          const tier3List = subIndustries.filter(si => si.parentSubIndustryId === subIndustry.parentSubIndustryId)
          setTier3Options(tier3List)
          // Set use cases for Tier3
          const ucList = useCases.filter(uc => uc.subIndustryId === useCase.subIndustryId)
          setUseCaseOptions(ucList)
          form.setFieldsValue({
            industryId: blog.industryId,
            tier2SubIndustryId: subIndustry.parentSubIndustryId,
            tier3SubIndustryId: useCase.subIndustryId,
            useCaseIds: blog.useCaseIds,
            title: blog.title,
            summary: blog.summary,
            content: blog.content,
            imageUrl: blog.imageUrl,
            externalUrl: blog.externalUrl,
            author: blog.author,
            publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString().slice(0, 16) : null,
          })
        } else {
          // It's a Tier2
          // Set use cases for Tier2
          const ucList = useCases.filter(uc => uc.subIndustryId === useCase.subIndustryId)
          setUseCaseOptions(ucList)
          form.setFieldsValue({
            industryId: blog.industryId,
            tier2SubIndustryId: useCase.subIndustryId,
            tier3SubIndustryId: undefined,
            useCaseIds: blog.useCaseIds,
            title: blog.title,
            summary: blog.summary,
            content: blog.content,
            imageUrl: blog.imageUrl,
            externalUrl: blog.externalUrl,
            author: blog.author,
            publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString().slice(0, 16) : null,
          })
        }
      }
    } else {
      // No use case associated
      form.setFieldsValue({
        industryId: blog.industryId,
        title: blog.title,
        summary: blog.summary,
        content: blog.content,
        imageUrl: blog.imageUrl,
        externalUrl: blog.externalUrl,
        author: blog.author,
        publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString().slice(0, 16) : null,
      })
    }
    setModalVisible(true)
  }
  const handleIndustryChange = (industryId: string) => {
    setSelectedIndustry(industryId)
    // Clear downstream selections
    form.setFieldsValue({
      tier2SubIndustryId: undefined,
      tier3SubIndustryId: undefined,
      useCaseIds: undefined,
    })
    // Load Tier2 sub-industries for this industry
    const tier2List = subIndustries.filter(si => 
      si.industryId === industryId && 
      (!si.level || si.level === 'Tier2-individual' || si.level === 'Tier2-Group')
    )
    setTier2Options(tier2List)
    setTier3Options([])
    setUseCaseOptions([])
  }
  const handleTier2Change = (tier2Id: string) => {
    console.log('Tier2 changed:', tier2Id)
    // Clear downstream selections
    form.setFieldsValue({
      tier3SubIndustryId: undefined,
      useCaseIds: undefined,
    })
    const tier2 = subIndustries.find(si => si.id === tier2Id)
    console.log('Found tier2:', tier2)
    if (tier2?.level === 'Tier2-Group') {
      // Load Tier3 options
      const tier3List = subIndustries.filter(si => si.parentSubIndustryId === tier2Id)
      console.log('Tier3 options:', tier3List)
      setTier3Options(tier3List)
      setUseCaseOptions([])
    } else {
      // It's Tier2-individual, load use cases directly
      setTier3Options([])
      const ucList = useCases.filter(uc => uc.subIndustryId === tier2Id)
      console.log('Use case options for Tier2:', ucList)
      setUseCaseOptions(ucList)
    }
  }
  const handleTier3Change = (tier3Id: string) => {
    console.log('Tier3 changed:', tier3Id)
    // Clear use case selection
    form.setFieldsValue({
      useCaseIds: undefined,
    })
    // Load use cases for this Tier3
    const ucList = useCases.filter(uc => uc.subIndustryId === tier3Id)
    console.log('Use case options for Tier3:', ucList)
    setUseCaseOptions(ucList)
  }
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      console.log('Form values:', values)
      console.log('useCaseOptions:', useCaseOptions)
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
      console.log('Submitting data:', data)
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
      setSelectedIndustry(null)
      setTier2Options([])
      setTier3Options([])
      setUseCaseOptions([])
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
  const getIndustryName = (industryId: string) => {
    const industry = industries.find((i) => i.id === industryId)
    return industry?.name || industryId
  }
  const getUseCaseNames = (useCaseIds?: string[]) => {
    if (!useCaseIds || useCaseIds.length === 0) return '-'
    const names = useCaseIds.map(id => {
      const useCase = useCases.find((uc) => uc.id === id)
      return useCase?.name || id
    })
    return names.join(', ')
  }
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '所属行�?,
      dataIndex: 'industryId',
      key: 'industryId',
      width: 120,
      render: (industryId: string) => getIndustryName(industryId),
    },
    {
      title: '关联用例',
      dataIndex: 'useCaseIds',
      key: 'useCaseIds',
      width: 200,
      render: (useCaseIds?: string[]) => (
        <div style={{ 
          maxWidth: 200, 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }} title={getUseCaseNames(useCaseIds)}>
          {useCaseIds && useCaseIds.length > 0 ? (
            <span>
              {useCaseIds.length} 个用�?
            </span>
          ) : '-'}
        </div>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
    },
    {
      title: '作�?,
      dataIndex: 'author',
      key: 'author',
      width: 100,
    },
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
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增博客
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={blogs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `�?${total} 条` }}
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
          setSelectedIndustry(null)
          setTier2Options([])
          setTier3Options([])
          setUseCaseOptions([])
        }}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="industryId"
            label="所属行�?
            rules={[{ required: true, message: '请选择所属行�? }]}
          >
            <Select 
              placeholder="请选择所属行�?
              onChange={handleIndustryChange}
            >
              {industries.map((industry) => (
                <Option key={industry.id} value={industry.id}>
                  {industry.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="tier2SubIndustryId"
            label="二级子行业（可选）"
            tooltip="选择子行业后可以关联到具体的用例"
          >
            <Select 
              placeholder="请选择二级子行�?
              onChange={handleTier2Change}
              disabled={!selectedIndustry}
              allowClear
            >
              {tier2Options.map((si) => (
                <Option key={si.id} value={si.id}>
                  {si.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          {tier3Options.length > 0 && (
            <Form.Item
              name="tier3SubIndustryId"
              label="三级子行�?
            >
              <Select 
                placeholder="请选择三级子行�?
                onChange={handleTier3Change}
                allowClear
              >
                {tier3Options.map((si) => (
                  <Option key={si.id} value={si.id}>
                    {si.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item
            name="useCaseIds"
            label="关联用例（可选）"
            tooltip="可以选择多个用例，该博客会显示在所有选中用例的详情页�?
          >
            <Select 
              mode="multiple"
              placeholder="请选择关联用例"
              disabled={useCaseOptions.length === 0}
              allowClear
              maxTagCount="responsive"
            >
              {useCaseOptions.map((uc) => (
                <Option key={uc.id} value={uc.id}>
                  {uc.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[
              { required: true, message: '请输入标�? },
              { max: 200, message: '标题不能超过200个字�? },
            ]}
          >
            <Input placeholder="请输入博客标�? />
          </Form.Item>
          <Form.Item
            name="summary"
            label="摘要"
            rules={[
              { required: true, message: '请输入摘�? },
              { max: 500, message: '摘要不能超过500个字�? },
            ]}
          >
            <TextArea rows={3} placeholder="请输入博客摘�? />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <TextArea rows={6} placeholder="请输入博客内�? />
          </Form.Item>
          <Form.Item name="imageUrl" label="图片URL">
            <Input placeholder="请输入图片URL" />
          </Form.Item>
          <Form.Item name="externalUrl" label="外部链接">
            <Input placeholder="请输入外部链接URL" />
          </Form.Item>
          <Form.Item
            name="author"
            label="作�?
            rules={[{ required: true, message: '请输入作�? }]}
          >
            <Input placeholder="请输入作者名�? />
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
