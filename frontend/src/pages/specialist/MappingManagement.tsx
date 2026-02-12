import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  Space,
  message,
  Popconfirm,
  Typography,
  Card,
  Tag,
  Tabs,
} from 'antd'
import { PlusOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons'
import { UseCase, Solution } from '../../types'
import { useCaseService } from '../../services/useCaseService'
import { solutionService } from '../../services/solutionService'
import { mappingService, MappedSolution, MappedUseCase } from '../../services/mappingService'

const { Title } = Typography
const { Option } = Select
const { TabPane } = Tabs

const MappingManagement: React.FC = () => {
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null)
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null)
  const [mappedSolutions, setMappedSolutions] = useState<MappedSolution[]>([])
  const [mappedUseCases, setMappedUseCases] = useState<MappedUseCase[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [viewMode, setViewMode] = useState<'usecase' | 'solution'>('usecase')
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchUseCases = useCallback(async () => {
    try {
      const data = await useCaseService.list()
      setUseCases(data)
    } catch (error: any) {
      message.error(error.message || '获取用例列表失败')
    }
  }, [])

  const fetchSolutions = useCallback(async () => {
    try {
      const data = await solutionService.list()
      setSolutions(data)
    } catch (error: any) {
      message.error(error.message || '获取解决方案列表失败')
    }
  }, [])

  const fetchMappedSolutions = useCallback(async (useCaseId: string) => {
    setLoading(true)
    try {
      const data = await mappingService.getSolutionsForUseCase(useCaseId)
      setMappedSolutions(data)
    } catch (error: any) {
      message.error(error.message || '获取关联的解决方案失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMappedUseCases = useCallback(async (solutionId: string) => {
    setLoading(true)
    try {
      const data = await mappingService.getUseCasesForSolution(solutionId)
      setMappedUseCases(data)
    } catch (error: any) {
      message.error(error.message || '获取关联的用例失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUseCases()
    fetchSolutions()
  }, [fetchUseCases, fetchSolutions])

  useEffect(() => {
    if (viewMode === 'usecase' && selectedUseCase) {
      fetchMappedSolutions(selectedUseCase)
    }
  }, [viewMode, selectedUseCase, fetchMappedSolutions])

  useEffect(() => {
    if (viewMode === 'solution' && selectedSolution) {
      fetchMappedUseCases(selectedSolution)
    }
  }, [viewMode, selectedSolution, fetchMappedUseCases])

  const handleAddMapping = () => {
    form.resetFields()
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      if (viewMode === 'usecase') {
        await mappingService.createMapping(selectedUseCase!, values.solutionId)
        message.success('关联创建成功')
        await fetchMappedSolutions(selectedUseCase!)
      } else {
        await mappingService.createMapping(values.useCaseId, selectedSolution!)
        message.success('关联创建成功')
        await fetchMappedUseCases(selectedSolution!)
      }

      setModalVisible(false)
      form.resetFields()
    } catch (error: any) {
      if (error.errorFields) return // form validation error
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteMapping = async (useCaseId: string, solutionId: string) => {
    try {
      await mappingService.deleteMapping(useCaseId, solutionId)
      message.success('关联删除成功')

      if (viewMode === 'usecase' && selectedUseCase) {
        await fetchMappedSolutions(selectedUseCase)
      } else if (viewMode === 'solution' && selectedSolution) {
        await fetchMappedUseCases(selectedSolution)
      }
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const solutionColumns = [
    {
      title: '解决方案名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '关联时间',
      dataIndex: 'mappedAt',
      key: 'mappedAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: MappedSolution) => (
        <Popconfirm
          title="确定要解除此关联吗？"
          description="如果存在依赖该关联的客户案例，将无法解除。"
          onConfirm={() => handleDeleteMapping(selectedUseCase!, record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            解除关联
          </Button>
        </Popconfirm>
      ),
    },
  ]

  const useCaseColumns = [
    {
      title: '用例名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '关联时间',
      dataIndex: 'mappedAt',
      key: 'mappedAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: MappedUseCase) => (
        <Popconfirm
          title="确定要解除此关联吗？"
          description="如果存在依赖该关联的客户案例，将无法解除。"
          onConfirm={() => handleDeleteMapping(record.id, selectedSolution!)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            解除关联
          </Button>
        </Popconfirm>
      ),
    },
  ]

  const getUseCaseName = (id: string) => {
    const useCase = useCases.find((uc) => uc.id === id)
    return useCase?.name || id
  }

  const getSolutionName = (id: string) => {
    const solution = solutions.find((s) => s.id === id)
    return solution?.name || id
  }

  return (
    <Card>
      <Title level={4}>解决方案与用例关联管理</Title>

      <Tabs activeKey={viewMode} onChange={(key) => setViewMode(key as 'usecase' | 'solution')}>
        <TabPane tab="按用例查看" key="usecase">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Space>
                <span>选择用例：</span>
                <Select
                  style={{ width: 300 }}
                  placeholder="请选择用例"
                  value={selectedUseCase}
                  onChange={setSelectedUseCase}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {useCases.map((uc) => (
                    <Option key={uc.id} value={uc.id}>
                      {uc.name}
                    </Option>
                  ))}
                </Select>
                {selectedUseCase && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMapping}>
                    添加解决方案
                  </Button>
                )}
              </Space>
            </div>

            {selectedUseCase && (
              <>
                <div>
                  <Tag color="blue" icon={<LinkOutlined />}>
                    已关联 {mappedSolutions.length} 个解决方案
                  </Tag>
                </div>
                <Table
                  columns={solutionColumns}
                  dataSource={mappedSolutions}
                  rowKey="id"
                  loading={loading}
                  pagination={false}
                />
              </>
            )}
          </Space>
        </TabPane>

        <TabPane tab="按解决方案查看" key="solution">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Space>
                <span>选择解决方案：</span>
                <Select
                  style={{ width: 300 }}
                  placeholder="请选择解决方案"
                  value={selectedSolution}
                  onChange={setSelectedSolution}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {solutions.map((s) => (
                    <Option key={s.id} value={s.id}>
                      {s.name}
                    </Option>
                  ))}
                </Select>
                {selectedSolution && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMapping}>
                    添加用例
                  </Button>
                )}
              </Space>
            </div>

            {selectedSolution && (
              <>
                <div>
                  <Tag color="cyan" icon={<LinkOutlined />}>
                    已关联 {mappedUseCases.length} 个用例
                  </Tag>
                </div>
                <Table
                  columns={useCaseColumns}
                  dataSource={mappedUseCases}
                  rowKey="id"
                  loading={loading}
                  pagination={false}
                />
              </>
            )}
          </Space>
        </TabPane>
      </Tabs>

      <Modal
        title={viewMode === 'usecase' ? '添加解决方案' : '添加用例'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        confirmLoading={submitting}
        okText="添加"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          {viewMode === 'usecase' ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <strong>当前用例：</strong> {getUseCaseName(selectedUseCase!)}
              </div>
              <Form.Item
                name="solutionId"
                label="选择解决方案"
                rules={[{ required: true, message: '请选择解决方案' }]}
              >
                <Select
                  placeholder="请选择解决方案"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {solutions
                    .filter((s) => !mappedSolutions.find((ms) => ms.id === s.id))
                    .map((s) => (
                      <Option key={s.id} value={s.id}>
                        {s.name}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <strong>当前解决方案：</strong> {getSolutionName(selectedSolution!)}
              </div>
              <Form.Item name="useCaseId" label="选择用例" rules={[{ required: true, message: '请选择用例' }]}>
                <Select
                  placeholder="请选择用例"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {useCases
                    .filter((uc) => !mappedUseCases.find((muc) => muc.id === uc.id))
                    .map((uc) => (
                      <Option key={uc.id} value={uc.id}>
                        {uc.name}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </Card>
  )
}

export default MappingManagement
