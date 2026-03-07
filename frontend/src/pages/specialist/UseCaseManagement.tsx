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
  Tag,
  Upload,
  List,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, FileOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { UseCase, SubIndustry, Industry, Document } from '../../types'
import { useCaseService, CreateUseCaseRequest, UpdateUseCaseRequest } from '../../services/useCaseService'
import { subIndustryService } from '../../services/subIndustryService'
import { industryService } from '../../services/industryService'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

const UseCaseManagement: React.FC = () => {
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [subIndustries, setSubIndustries] = useState<SubIndustry[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUseCase, setEditingUseCase] = useState<UseCase | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const [selectedTier2, setSelectedTier2] = useState<SubIndustry | null>(null)
  const [tier3Options, setTier3Options] = useState<SubIndustry[]>([])
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false)
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const fetchUseCases = useCallback(async () => {
    setLoading(true)
    try {
      const data = await useCaseService.list()
      setUseCases(data)
    } catch (error: any) {
      message.error(error.message || '获取用例列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSubIndustries = useCallback(async () => {
    try {
      const data = await subIndustryService.listAll()
      setSubIndustries(data)
    } catch (error: any) {
      message.error(error.message || '获取子行业列表失败')
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
    fetchUseCases()
    fetchSubIndustries()
    fetchIndustries()
  }, [fetchUseCases, fetchSubIndustries, fetchIndustries])

  const handleCreate = () => {
    setEditingUseCase(null)
    form.resetFields()
    setSelectedTier2(null)
    setTier3Options([])
    // Set default markdown template for new use case
    form.setFieldsValue({
      detailMarkdown: `## 📋 业务场景

[业务场景具体内容]

## 🎯 客户痛点

痛点1：[痛点1描述]
[痛点1具体内容]

痛点2：[痛点2描述]
[痛点2具体内容]

痛点3：[痛点3描述]
[痛点3具体内容]

## 👥 切入人群

- 角色1
- 角色2
- 角色3

## 💬 沟通话术

> [话术具体内容]`
    })
    setModalVisible(true)
  }

  const handleEdit = async (useCase: UseCase) => {
    setEditingUseCase(useCase)
    
    // Find the sub-industry for this use case
    const subIndustry = subIndustries.find(si => si.id === useCase.subIndustryId)
    
    // Load markdown content from S3 if available
    let markdownContent = ''
    try {
      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/public/use-cases/${useCase.id}`)
      if (response.ok) {
        const useCaseDetail = await response.json()
        if (useCaseDetail.detailMarkdownUrl) {
          const mdResponse = await fetch(useCaseDetail.detailMarkdownUrl)
          if (mdResponse.ok) {
            markdownContent = await mdResponse.text()
          }
        }
      }
    } catch (error) {
      console.error('Failed to load markdown content:', error)
    }
    
    // If it's a Tier3, find its parent and set up the cascading selects
    if (subIndustry?.level === 'Tier3' && subIndustry.parentSubIndustryId) {
      const parentTier2 = subIndustries.find(si => si.id === subIndustry.parentSubIndustryId)
      if (parentTier2) {
        setSelectedTier2(parentTier2)
        const tier3List = subIndustries.filter(si => si.parentSubIndustryId === parentTier2.id)
        setTier3Options(tier3List)
        form.setFieldsValue({
          tier2SubIndustryId: parentTier2.id,
          tier3SubIndustryId: useCase.subIndustryId,
          name: useCase.name,
          summary: useCase.summary || useCase.description,
          detailMarkdown: markdownContent,
          recommendationScore: useCase.recommendationScore || 3,
        })
      }
    } else {
      // It's a Tier2 sub-industry
      setSelectedTier2(null)
      setTier3Options([])
      form.setFieldsValue({
        tier2SubIndustryId: useCase.subIndustryId,
        tier3SubIndustryId: undefined,
        name: useCase.name,
        summary: useCase.summary || useCase.description,
        detailMarkdown: markdownContent,
        recommendationScore: useCase.recommendationScore || 3,
      })
    }
    
    setModalVisible(true)
  }

  const handleTier2Change = (tier2Id: string) => {
    const tier2 = subIndustries.find(si => si.id === tier2Id)
    setSelectedTier2(tier2 || null)
    
    // Clear Tier3 selection
    form.setFieldValue('tier3SubIndustryId', undefined)
    
    // If it's a Tier2-Group, load Tier3 options
    if (tier2?.level === 'Tier2-Group') {
      const tier3List = subIndustries.filter(si => si.parentSubIndustryId === tier2Id)
      setTier3Options(tier3List)
    } else {
      setTier3Options([])
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // Determine the actual subIndustryId to use
      const finalSubIndustryId = values.tier3SubIndustryId || values.tier2SubIndustryId

      if (editingUseCase) {
        const updateData: UpdateUseCaseRequest = {
          subIndustryId: finalSubIndustryId,
          name: values.name,
          summary: values.summary,
          detailMarkdown: values.detailMarkdown,
          recommendationScore: values.recommendationScore,
        }
        await useCaseService.update(editingUseCase.id, updateData)
        message.success('用例更新成功')
      } else {
        const createData: CreateUseCaseRequest = {
          subIndustryId: finalSubIndustryId,
          name: values.name,
          summary: values.summary,
          detailMarkdown: values.detailMarkdown,
          recommendationScore: values.recommendationScore,
        }
        await useCaseService.create(createData)
        message.success('用例创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      setEditingUseCase(null)
      setSelectedTier2(null)
      setTier3Options([])
      await fetchUseCases()
    } catch (error: any) {
      if (error.errorFields) return // form validation error
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await useCaseService.delete(id)
      message.success('用例删除成功')
      await fetchUseCases()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const handleUploadDocument = (useCase: UseCase) => {
    setSelectedUseCase(useCase)
    setFileList([])
    setUploadModalVisible(true)
  }

  const handleViewDocuments = (useCase: UseCase) => {
    setSelectedUseCase(useCase)
    setDocumentsModalVisible(true)
  }

  const handleUploadSubmit = async () => {
    if (!selectedUseCase || fileList.length === 0) {
      message.warning('请选择要上传的文件')
      return
    }

    setUploading(true)
    try {
      const uploadFile = fileList[0]
      // Get the actual File object
      const file = uploadFile.originFileObj || uploadFile as any
      
      if (!file) {
        message.error('无法读取文件')
        setUploading(false)
        return
      }
      
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string
          const base64Content = base64.split(',')[1]
          
          await useCaseService.uploadDocument(selectedUseCase.id, {
            fileName: uploadFile.name,
            fileContent: base64Content,
            contentType: uploadFile.type || 'application/pdf',
          })
          
          message.success('文档上传成功')
          setUploadModalVisible(false)
          setFileList([])
          await fetchUseCases()
        } catch (error: any) {
          message.error(error.message || '上传失败')
        } finally {
          setUploading(false)
        }
      }
      
      reader.onerror = () => {
        message.error('文件读取失败')
        setUploading(false)
      }
      
      reader.readAsDataURL(file)
    } catch (error: any) {
      message.error(error.message || '上传失败')
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedUseCase) return
    
    try {
      await useCaseService.deleteDocument(selectedUseCase.id, docId)
      message.success('文档删除成功')
      await fetchUseCases()
      // Update selected use case
      const updated = useCases.find(uc => uc.id === selectedUseCase.id)
      if (updated) {
        setSelectedUseCase(updated)
      }
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const getSubIndustryName = (subIndustryId: string) => {
    const subIndustry = subIndustries.find((si) => si.id === subIndustryId)
    return subIndustry?.name || subIndustryId
  }

  const getIndustryName = (industryId: string) => {
    const industry = industries.find((i) => i.id === industryId)
    return industry?.name || industryId
  }

  const columns = [
    {
      title: '用例名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '所属行业',
      dataIndex: 'industryId',
      key: 'industryId',
      width: 150,
      render: (industryId: string) => <Tag color="blue">{getIndustryName(industryId)}</Tag>,
    },
    {
      title: '所属子行业',
      dataIndex: 'subIndustryId',
      key: 'subIndustryId',
      width: 300,
      render: (subIndustryId: string) => <Tag color="cyan">{getSubIndustryName(subIndustryId)}</Tag>,
    },
    {
      title: '推荐指数',
      dataIndex: 'recommendationScore',
      key: 'recommendationScore',
      width: 150,
      render: (score: number) => {
        const displayScore = score || 3
        return (
          <div>
            {'⭐'.repeat(displayScore)}
            <span style={{ marginLeft: 4, color: '#6e6e73' }}>({displayScore})</span>
          </div>
        )
      },
    },
    {
      title: '文档数量',
      dataIndex: 'documents',
      key: 'documents',
      width: 100,
      render: (documents: Document[], record: UseCase) => {
        const count = documents?.length || 0
        if (count > 0) {
          return (
            <Button 
              type="link" 
              onClick={() => handleViewDocuments(record)}
              style={{ padding: 0 }}
            >
              {count}
            </Button>
          )
        }
        return count
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: UseCase) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" icon={<UploadOutlined />} onClick={() => handleUploadDocument(record)}>
            上传文档
          </Button>
          <Popconfirm
            title="确定要删除此用例吗？"
            description="删除后将无法恢复。"
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
          用例管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增用例
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={useCases}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingUseCase ? '编辑用例' : '新增用例'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingUseCase(null)
        }}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="tier2SubIndustryId"
            label="所属子行业 (Tier2)"
            rules={[{ required: true, message: '请选择所属子行业' }]}
          >
            <Select 
              placeholder="请选择Tier2子行业" 
              onChange={handleTier2Change}
            >
              {subIndustries
                .filter(si => si.level === 'Tier2-individual' || si.level === 'Tier2-Group')
                .map((subIndustry) => (
                  <Option key={subIndustry.id} value={subIndustry.id}>
                    {getIndustryName(subIndustry.industryId)} / {subIndustry.name}
                    {subIndustry.level === 'Tier2-Group' && ' (包含Tier3子行业)'}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          
          {selectedTier2?.level === 'Tier2-Group' && tier3Options.length > 0 && (
            <Form.Item
              name="tier3SubIndustryId"
              label="所属子行业 (Tier3)"
              rules={[{ required: true, message: '请选择Tier3子行业' }]}
            >
              <Select 
                placeholder="请选择Tier3子行业"
              >
                {tier3Options.map((subIndustry) => (
                  <Option key={subIndustry.id} value={subIndustry.id}>
                    {subIndustry.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="用例名称"
            rules={[
              { required: true, message: '请输入用例名称' },
              { max: 100, message: '用例名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入用例名称" />
          </Form.Item>
          <Form.Item
            name="summary"
            label="简要描述"
            rules={[
              { required: true, message: '请输入简要描述' },
              { max: 500, message: '简要描述不能超过500个字符' },
            ]}
          >
            <TextArea rows={3} placeholder="请输入简要描述" />
          </Form.Item>
          <Form.Item
            name="detailMarkdown"
            label="具体内容"
            rules={[{ max: 50000, message: '具体内容不能超过50000个字符' }]}
          >
            <TextArea 
              rows={6} 
              placeholder={`## 📋 业务场景

[业务场景具体内容]

## 🎯 客户痛点

痛点1：[痛点1描述]
[痛点1具体内容]

痛点2：[痛点2描述]
[痛点2具体内容]

## 👥 切入人群

- 非常规事业部负责人
- 压裂工程经理
- 技术研发团队

## 💬 沟通话术

> 压裂服务的效果直接影响单井产量...`}
            />
          </Form.Item>
          <Form.Item
            name="recommendationScore"
            label="推荐指数"
            rules={[{ required: true, message: '请选择推荐指数' }]}
            initialValue={3}
          >
            <Select placeholder="请选择推荐指数">
              <Option value={5}>⭐⭐⭐⭐⭐ (5星 - 强烈推荐)</Option>
              <Option value={4}>⭐⭐⭐⭐ (4星 - 推荐)</Option>
              <Option value={3}>⭐⭐⭐ (3星 - 一般)</Option>
              <Option value={2}>⭐⭐ (2星 - 较少推荐)</Option>
              <Option value={1}>⭐ (1星 - 不推荐)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        title="上传文档"
        open={uploadModalVisible}
        onOk={handleUploadSubmit}
        onCancel={() => {
          setUploadModalVisible(false)
          setFileList([])
        }}
        confirmLoading={uploading}
        okText="上传"
        cancelText="取消"
      >
        <p style={{ marginBottom: 16 }}>
          为用例 <strong>{selectedUseCase?.name}</strong> 上传PDF文档
        </p>
        <Upload
          accept=".pdf"
          maxCount={1}
          fileList={fileList}
          beforeUpload={(file) => {
            const isPDF = file.type === 'application/pdf'
            if (!isPDF) {
              message.error('只能上传PDF文件')
              return false
            }
            const isLt10M = file.size / 1024 / 1024 < 10
            if (!isLt10M) {
              message.error('文件大小不能超过10MB')
              return false
            }
            setFileList([file as UploadFile])
            return false
          }}
          onRemove={() => {
            setFileList([])
          }}
        >
          <Button icon={<UploadOutlined />}>选择PDF文件</Button>
        </Upload>
      </Modal>

      {/* View Documents Modal */}
      <Modal
        title="文档列表"
        open={documentsModalVisible}
        onCancel={() => setDocumentsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDocumentsModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <p style={{ marginBottom: 16 }}>
          用例：<strong>{selectedUseCase?.name}</strong>
        </p>
        <List
          dataSource={selectedUseCase?.documents || []}
          renderItem={(doc: Document) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="delete"
                  title="确定要删除此文档吗？"
                  onConfirm={() => handleDeleteDocument(doc.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="link" danger size="small">
                    删除
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={<FileOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                title={doc.name}
                description={`上传时间: ${new Date(doc.uploadedAt).toLocaleString('zh-CN')}`}
              />
            </List.Item>
          )}
          locale={{ emptyText: '暂无文档' }}
        />
      </Modal>
    </Card>
  )
}

export default UseCaseManagement
