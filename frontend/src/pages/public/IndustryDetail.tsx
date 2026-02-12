import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Typography, Spin, message, Button, Empty } from 'antd'
import { ArrowLeftOutlined, BankOutlined, ApartmentOutlined } from '@ant-design/icons'
import { publicService, PublicIndustry, PublicSubIndustry } from '../../services/publicService'

const { Content } = Layout
const { Title, Paragraph } = Typography

const IndustryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [industry, setIndustry] = useState<PublicIndustry | null>(null)
  const [subIndustries, setSubIndustries] = useState<PublicSubIndustry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadIndustryData()
    }
  }, [id])

  const loadIndustryData = async () => {
    if (!id) return

    setLoading(true)
    try {
      const [industryData, subIndustriesData] = await Promise.all([
        publicService.getIndustry(id),
        publicService.listSubIndustries(id),
      ])
      setIndustry(industryData)
      setSubIndustries(subIndustriesData)
    } catch (error: any) {
      console.error('Failed to load industry data:', error)
      message.error('加载行业信息失败')
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

  if (!industry) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ padding: '60px 0' }}>
          <div className="responsive-container">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/')}
              style={{
                marginBottom: 24,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
              }}
            >
              返回首页
            </Button>
            <Empty description="行业不存在" />
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
            onClick={() => navigate('/')}
            style={{
              marginBottom: 24,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
            }}
          >
            返回首页
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
              <BankOutlined style={{ fontSize: 32, color: '#8b9cf7', marginRight: 16 }} />
              <Title level={2} style={{ margin: 0, color: '#fff' }}>
                {industry.name}
              </Title>
            </div>
            <Paragraph style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1.8 }}>
              {industry.definition}
            </Paragraph>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Title level={3} style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
              <ApartmentOutlined style={{ marginRight: 12, color: '#8b9cf7' }} />
              子行业
            </Title>
          </div>

          {subIndustries.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <ApartmentOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }} />
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16 }}>
                该行业暂无子行业信息
              </div>
            </div>
          ) : (
            <div className="responsive-grid-auto">
              {subIndustries.map((subIndustry) => (
                <div
                  key={subIndustry.id}
                  onClick={() => navigate(`/public/sub-industries/${subIndustry.id}`)}
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
                    {subIndustry.name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.45)',
                      lineHeight: '1.6',
                      marginBottom: 16,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {subIndustry.definition}
                  </div>
                  {(subIndustry.typicalGlobalCompanies?.length > 0 ||
                    subIndustry.typicalChineseCompanies?.length > 0) && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                      {subIndustry.typicalGlobalCompanies?.length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                          全球企业: {subIndustry.typicalGlobalCompanies.slice(0, 3).join(', ')}
                          {subIndustry.typicalGlobalCompanies.length > 3 && '...'}
                        </div>
                      )}
                      {subIndustry.typicalChineseCompanies?.length > 0 && (
                        <div>
                          中国企业: {subIndustry.typicalChineseCompanies.slice(0, 3).join(', ')}
                          {subIndustry.typicalChineseCompanies.length > 3 && '...'}
                        </div>
                      )}
                    </div>
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

export default IndustryDetail
