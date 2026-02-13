import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button, Empty } from 'antd'
import { ArrowLeftOutlined, BankOutlined, ApartmentOutlined } from '@ant-design/icons'
import { publicService, PublicIndustry, PublicSubIndustry } from '../../services/publicService'

const { Content } = Layout

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

  if (!industry) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
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
    <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
      <Content style={{ padding: '60px 0' }}>
        <div className="responsive-container">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{
              marginBottom: 24,
            }}
          >
            返回首页
          </Button>

          <div
            className="apple-card"
            style={{
              padding: 32,
              marginBottom: 32,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              {industry.icon ? (
                <img
                  src={industry.icon}
                  alt={industry.name}
                  style={{
                    width: 32,
                    height: 32,
                    marginRight: 16,
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <BankOutlined style={{ fontSize: 32, color: '#0071e3', marginRight: 16 }} />
              )}
              <h2 style={{ margin: 0, color: '#1d1d1f', fontSize: 30, fontWeight: 600 }}>
                {industry.name}
              </h2>
            </div>
            <p style={{ color: '#6e6e73', fontSize: 16, lineHeight: 1.8, margin: 0 }}>
              {industry.definition}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ color: '#1d1d1f', display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 600, margin: 0 }}>
              <ApartmentOutlined style={{ marginRight: 12, color: '#0071e3' }} />
              子行业
            </h3>
          </div>

          {subIndustries.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                background: '#f5f5f7',
                borderRadius: 18,
              }}
            >
              <ApartmentOutlined style={{ fontSize: 48, color: '#86868b', marginBottom: 16 }} />
              <div style={{ color: '#6e6e73', fontSize: 16 }}>
                该行业暂无子行业信息
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {subIndustries.map((subIndustry) => (
                <div
                  key={subIndustry.id}
                  onClick={() => navigate(`/public/sub-industries/${subIndustry.id}`)}
                  className="apple-card"
                  style={{
                    padding: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    minHeight: 140,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '20%',
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#1d1d1f',
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.5,
                    }}
                  >
                    {subIndustry.name}
                  </div>
                  <div
                    style={{
                      width: '20%',
                      fontSize: 13,
                      color: '#6e6e73',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {subIndustry.definition || '-'}
                  </div>
                  <div
                    style={{
                      width: '20%',
                      fontSize: 13,
                      color: '#6e6e73',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {subIndustry.definitionCn || '-'}
                  </div>
                  <div
                    style={{
                      width: '20%',
                      fontSize: 13,
                      color: '#6e6e73',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {subIndustry.typicalGlobalCompanies?.length > 0
                      ? subIndustry.typicalGlobalCompanies.join(', ')
                      : '-'}
                  </div>
                  <div
                    style={{
                      width: '20%',
                      fontSize: 13,
                      color: '#6e6e73',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {subIndustry.typicalChineseCompanies?.length > 0
                      ? subIndustry.typicalChineseCompanies.join(', ')
                      : '-'}
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

export default IndustryDetail
