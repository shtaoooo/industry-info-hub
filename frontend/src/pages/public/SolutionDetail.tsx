import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Space, message, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { publicService, PublicSolution } from '../../services/publicService'
import { MarkdownViewer } from '../../components/MarkdownViewer'

const SolutionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [solution, setSolution] = useState<PublicSolution | null>(null)
  const [markdownUrl, setMarkdownUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchSolutionDetails(id)
    }
  }, [id])

  const fetchSolutionDetails = async (solutionId: string) => {
    setLoading(true)
    try {
      const solutionData = await publicService.getSolution(solutionId)
      setSolution(solutionData)

      // Fetch markdown URL if available
      if (solutionData.detailMarkdownUrl) {
        try {
          const markdownData = await publicService.getSolutionMarkdown(solutionId)
          setMarkdownUrl(markdownData.url)
        } catch (error) {
          console.error('Error fetching markdown URL:', error)
        }
      }
    } catch (error: any) {
      message.error(error.message || '获取解决方案详情失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!solution) {
    return (
      <Card>
        <p>解决方案不存在</p>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </Card>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>

        <Card title="解决方案信息">
          <Descriptions column={1}>
            <Descriptions.Item label="名称">{solution.name}</Descriptions.Item>
            <Descriptions.Item label="描述">{solution.description}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(solution.createdAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {markdownUrl && (
          <MarkdownViewer url={markdownUrl} title="详细介绍" />
        )}
      </Space>
    </div>
  )
}

export default SolutionDetail
