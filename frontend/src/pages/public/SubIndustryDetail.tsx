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
      <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
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
    <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
      <Content style={{ padding: '60px 0' }}>
        <div className="responsive-container">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{
              marginBottom: 24,
            }}
          >
            返回
          </Button>

          <div style={{ marginBottom: 16 }}>
            <Title level={3} style={{ color: '#1d1d1f', display: 'flex', alignItems: 'center' }}>
              <FileTextOutlined style={{ marginRight: 12, color: '#0071e3' }} />
              行业用例
            </Title>
          </div>

          {useCases.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                background: '#f5f5f7',
                borderRadius: 18,
              }}
            >
              <FileTextOutlined style={{ fontSize: 48, color: '#86868b', marginBottom: 16 }} />
              <div style={{ color: '#6e6e73', fontSize: 16 }}>
                该子行业暂无用例信息
              </div>
            </div>
          ) : (
            <div className="responsive-grid-auto">
              {useCases.map((useCase) => (
                <div
                  key={useCase.id}
                  onClick={() => navigate(`/public/use-cases/${useCase.id}`)}
                  className="apple-card"
                  style={{
                    padding: 24,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>
                    {useCase.name}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      color: '#6e6e73',
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
