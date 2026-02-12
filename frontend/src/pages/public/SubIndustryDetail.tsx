import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Typography, Spin, message, Button } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons'
import { publicService, PublicUseCase } from '../../services/publicService'

const { Content } = Layout
const { Title } = Typography

const SubIndustryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [useCases, setUseCases] = useState<PublicUseCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadUseCases()
    }
  }, [id])

  const loadUseCases = async () => {
    if (!id) return

    setLoading(true)
    try {
      const data = await publicService.listUseCases(id)
      setUseCases(data)
    } catch (error: any) {
      console.error('Failed to load use cases:', error)
      message.error('加载用例信息失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ padding: '60px 0' }}>
          <div className="responsive-container">
            <div style={{ textAlign: 'center', paddingTop: 100 }}>
              <Spin size="large" />
            </div>
          </div>
        </Content>
      </Layout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Content style={{ padding: '60px 0' }}>
        <div className="responsive-container">
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

          <div style={{ marginBottom: 16 }}>
            <Title level={3} style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
              <FileTextOutlined style={{ marginRight: 12, color: '#8b9cf7' }} />
              行业用例
            </Title>
          </div>

          {useCases.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <FileTextOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }} />
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16 }}>
                该子行业暂无用例信息
              </div>
            </div>
          ) : (
            <div className="responsive-grid-auto">
              {useCases.map((useCase) => (
                <div
                  key={useCase.id}
                  onClick={() => navigate(`/public/use-cases/${useCase.id}`)}
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
                    {useCase.name}
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
                    {useCase.description}
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

export default SubIndustryDetail
