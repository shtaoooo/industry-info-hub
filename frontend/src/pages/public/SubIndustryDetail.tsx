import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Typography, Spin, message, Button } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons'
import { publicService, PublicUseCase, PublicSubIndustry } from '../../services/publicService'
import MarkdownText from '../../components/MarkdownText'

const { Content } = Layout
const { Title } = Typography

const SubIndustryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [subIndustry, setSubIndustry] = useState<PublicSubIndustry | null>(null)
  const [useCases, setUseCases] = useState<PublicUseCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return

    setLoading(true)
    try {
      const data = await publicService.listUseCases(id)
      setSubIndustry(data.subIndustry)
      setUseCases(data.useCases)
    } catch (error: any) {
      console.error('Failed to load data:', error)
      message.error('加载信息失败')
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
        <div className="responsive-container public-detail-content">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{
              marginBottom: 24,
            }}
          >
            返回
          </Button>

          {/* Sub-Industry Header */}
          {subIndustry && (
            <div className="apple-card" style={{ padding: 32, marginBottom: 32 }}>
              <h2 style={{ margin: 0, color: '#1d1d1f', fontSize: 30, fontWeight: 600, marginBottom: 16 }}>
                {subIndustry.name}
              </h2>
              <MarkdownText style={{ color: '#6e6e73', fontSize: 16, lineHeight: 1.8 }}>
                {subIndustry.definition}
              </MarkdownText>
              {subIndustry.definitionCn && (
                <MarkdownText style={{ color: '#6e6e73', fontSize: 16, lineHeight: 1.8, marginTop: 8 }}>
                  {subIndustry.definitionCn}
                </MarkdownText>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <Title level={3} style={{ display: 'flex', alignItems: 'center' }}>
              <FileTextOutlined style={{ marginRight: 12, color: '#0071e3' }} />
              Use Cases
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
              <div className="public-detail-secondary" style={{ fontSize: 16 }}>
                该子行业暂无用例信息
              </div>
            </div>
          ) : (
            <div className="responsive-grid-max-3">
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
                  <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
                    {useCase.name}
                  </div>
                  <div
                    className="public-detail-secondary md-text-compact"
                    style={{
                      fontSize: 15,
                      lineHeight: '1.6',
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      marginBottom: 16,
                    }}
                  >
                    <MarkdownText>{useCase.businessScenario || useCase.description}</MarkdownText>
                  </div>
                  {useCase.targetAudience && (
                    <>
                      <div style={{ 
                        borderTop: '1px solid #d2d2d7', 
                        margin: '16px 0',
                      }} />
                      <div style={{
                        fontSize: 14,
                        color: '#6e6e73',
                        lineHeight: '1.5',
                      }}>
                        <span style={{ fontWeight: 600, color: '#1d1d1f' }}>切入人群：</span>
                        <MarkdownText className="md-text-compact" style={{ display: 'inline' }}>{useCase.targetAudience}</MarkdownText>
                      </div>
                    </>
                  )}
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
