import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Typography, Spin, message, Button, Empty } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined, BulbOutlined } from '@ant-design/icons'
import { publicService, PublicUseCase, PublicSolution } from '../../services/publicService'
import { DocumentDownloadList } from '../../components/DocumentDownloadList'

const { Content } = Layout
const { Title, Paragraph } = Typography

const UseCaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [useCase, setUseCase] = useState<PublicUseCase | null>(null)
  const [solutions, setSolutions] = useState<PublicSolution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadUseCaseData()
    }
  }, [id])

  const loadUseCaseData = async () => {
    if (!id) return

    setLoading(true)
    try {
      const [useCaseData, solutionsData] = await Promise.all([
        publicService.getUseCase(id),
        publicService.getSolutionsForUseCase(id),
      ])
      setUseCase(useCaseData)
      setSolutions(solutionsData)
    } catch (error: any) {
      console.error('Failed to load use case data:', error)
      message.error('加载用例信息失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ padding: 32 }}>
          <div style={{ textAlign: 'center', paddingTop: 100 }}>
            <Spin size="large" />
          </div>
        </Content>
      </Layout>
    )
  }

  if (!useCase) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ padding: 32 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{
                marginBottom: 24,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
              }}
            >
              返回
            </Button>
            <Empty description="用例不存在" />
          </div>
        </Content>
      </Layout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Content style={{ padding: 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{
              marginBottom: 24,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
            }}
          >
            返回
          </Button>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              padding: 32,
              marginBottom: 32,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <FileTextOutlined style={{ fontSize: 32, color: '#8b9cf7', marginRight: 16 }} />
              <Title level={2} style={{ margin: 0, color: '#fff' }}>
                {useCase.name}
              </Title>
            </div>
            <Paragraph style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1.8 }}>
              {useCase.description}
            </Paragraph>

            {useCase.documents && useCase.documents.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Title level={5} style={{ color: '#fff', marginBottom: 12 }}>
                  相关文档
                </Title>
                <DocumentDownloadList documents={useCase.documents} />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <Title level={3} style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
              <BulbOutlined style={{ marginRight: 12, color: '#8b9cf7' }} />
              相关解决方案
            </Title>
          </div>

          {solutions.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <BulbOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }} />
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16 }}>
                该用例暂无关联的解决方案
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 20,
              }}
            >
              {solutions.map((solution) => (
                <div
                  key={solution.id}
                  onClick={() => navigate(`/public/solutions/${solution.id}`)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 16,
                    padding: 24,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.4)'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
                    {solution.name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.45)',
                      lineHeight: '1.6',
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {solution.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default UseCaseDetail
