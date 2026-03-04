import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button, Empty } from 'antd'
import { ArrowLeftOutlined, BankOutlined, ApartmentOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { publicService, PublicIndustry, PublicSubIndustry, PublicNews, PublicBlog } from '../../services/publicService'

const { Content } = Layout

const IndustryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [industry, setIndustry] = useState<PublicIndustry | null>(null)
  const [subIndustries, setSubIndustries] = useState<PublicSubIndustry[]>([])
  const [news, setNews] = useState<PublicNews[]>([])
  const [blogs, setBlogs] = useState<PublicBlog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTier2, setExpandedTier2] = useState<Set<string>>(new Set())
  const newsScrollRef = useRef<HTMLDivElement>(null)

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
      const [newsData, blogsData] = await Promise.all([
        publicService.getIndustryNews(id, 5).catch(() => [] as PublicNews[]),
        publicService.getIndustryBlogs(id, 5).catch(() => [] as PublicBlog[]),
      ])
      setNews(newsData)
      setBlogs(blogsData)
    } catch (error: any) {
      console.error('Failed to load industry data:', error)
      message.error('加载行业信息失败')
    } finally {
      setLoading(false)
    }
  }

  const handleNewsClick = (item: PublicNews) => {
    if (item.externalUrl) {
      window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
    } else {
      navigate(`/public/news/${item.id}`)
    }
  }

  const handleBlogClick = (item: PublicBlog) => {
    if (item.externalUrl) {
      window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
    } else {
      navigate(`/public/blogs/${item.id}`)
    }
  }

  const scrollNews = (direction: 'left' | 'right') => {
    if (newsScrollRef.current) {
      const containerWidth = newsScrollRef.current.clientWidth
      const cardWidth = (containerWidth - 48) / 3 + 24 // card width + gap
      newsScrollRef.current.scrollBy({
        left: direction === 'left' ? -cardWidth : cardWidth,
        behavior: 'smooth',
      })
    }
  }

  const toggleTier2Expansion = (tier2Id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedTier2((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(tier2Id)) {
        newSet.delete(tier2Id)
      } else {
        newSet.add(tier2Id)
      }
      return newSet
    })
  }

  const handleSubIndustryClick = (subIndustryId: string) => {
    navigate(`/public/sub-industries/${subIndustryId}`)
  }

  // Separate Tier2 and Tier3 sub-industries
  const tier2SubIndustries = subIndustries.filter(
    (sub) => sub.level === 'Tier2-Group' || sub.level === 'Tier2-individual' || !sub.level
  )
  const tier3SubIndustries = subIndustries.filter((sub) => sub.level === 'Tier3')

  // Create a map for quick Tier3 lookup by parent
  const tier3ByParent = tier3SubIndustries.reduce((acc, tier3) => {
    if (tier3.parentSubIndustryId) {
      if (!acc[tier3.parentSubIndustryId]) {
        acc[tier3.parentSubIndustryId] = []
      }
      acc[tier3.parentSubIndustryId].push(tier3)
    }
    return acc
  }, {} as Record<string, PublicSubIndustry[]>)

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
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 24 }}>
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
        <div className="responsive-container public-detail-content">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 24 }}>
            返回首页
          </Button>

          <div className="apple-card" style={{ padding: 32, marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              {industry.icon ? (
                <img src={industry.icon} alt={industry.name} style={{ width: 64, height: 64, marginRight: 16, objectFit: 'contain' }} />
              ) : (
                <BankOutlined style={{ fontSize: 64, color: '#0071e3', marginRight: 16 }} />
              )}
              <h2 style={{ margin: 0, color: '#1d1d1f', fontSize: 30, fontWeight: 600 }}>{industry.name}</h2>
            </div>
            <p style={{ color: '#6e6e73', fontSize: 16, lineHeight: 1.8, margin: 0, marginBottom: 8 }}>{industry.definition}</p>
            {industry.definitionCn && (
              <p style={{ color: '#6e6e73', fontSize: 16, lineHeight: 1.8, margin: 0 }}>{industry.definitionCn}</p>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ color: '#1d1d1f', fontSize: 24, fontWeight: 600, margin: 0 }}>Sub-Industries</h3>
          </div>

          {subIndustries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#f5f5f7', borderRadius: 18 }}>
              <ApartmentOutlined style={{ fontSize: 48, color: '#86868b', marginBottom: 16 }} />
              <div style={{ color: '#6e6e73', fontSize: 16 }}>该行业暂无子行业信息</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'visible' }}>
              {tier2SubIndustries.map((subIndustry) => {
                const hasTier3Children = tier3ByParent[subIndustry.id]?.length > 0
                const isExpanded = expandedTier2.has(subIndustry.id)

                return (
                  <React.Fragment key={subIndustry.id}>
                    {/* Tier2 Sub-Industry Card with Stacked Effect */}
                    <div
                      style={{
                        position: 'relative',
                        marginBottom: hasTier3Children && !isExpanded ? tier3ByParent[subIndustry.id].length * 8 : 0,
                      }}
                    >
                      {/* Stacked cards behind (only when collapsed and has children) */}
                      {hasTier3Children && !isExpanded && tier3ByParent[subIndustry.id].map((_, stackIndex) => (
                        <div
                          key={`stack-${stackIndex}`}
                          style={{
                            position: 'absolute',
                            top: (stackIndex + 1) * 8,
                            left: (stackIndex + 1) * 8,
                            right: -(stackIndex + 1) * 8,
                            bottom: -(stackIndex + 1) * 8,
                            zIndex: -stackIndex - 1,
                            pointerEvents: 'none',
                            background: '#ffffff',
                            border: '1px solid #d2d2d7',
                            borderRadius: 18,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                          }}
                        />
                      ))}

                      {/* Main Tier2 Card */}
                      <div
                        className="apple-card"
                        onClick={() => {
                          if (hasTier3Children) {
                            toggleTier2Expansion(subIndustry.id, { stopPropagation: () => {} } as React.MouseEvent)
                          } else {
                            handleSubIndustryClick(subIndustry.id)
                          }
                        }}
                        style={{
                          padding: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 16,
                          minHeight: 140,
                          overflow: 'hidden',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 16,
                            flex: 1,
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
                              whiteSpace: 'pre-wrap',
                              display: '-webkit-box',
                              WebkitLineClamp: 5,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {subIndustry.typicalGlobalCompanies?.length > 0
                              ? subIndustry.typicalGlobalCompanies.join('\n')
                              : '-'}
                          </div>
                          <div
                            style={{
                              width: '20%',
                              fontSize: 13,
                              color: '#6e6e73',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              display: '-webkit-box',
                              WebkitLineClamp: 5,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {subIndustry.typicalChineseCompanies?.length > 0
                              ? subIndustry.typicalChineseCompanies.join('\n')
                              : '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tier3 Sub-Industries (Expanded) */}
                    {hasTier3Children && isExpanded && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          marginLeft: 32,
                          animation: 'slideDown 0.3s ease',
                        }}
                      >
                        {tier3ByParent[subIndustry.id].map((tier3) => (
                          <div
                            key={tier3.id}
                            onClick={() => handleSubIndustryClick(tier3.id)}
                            className="apple-card"
                            style={{
                              padding: '20px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 16,
                              minHeight: 100,
                              overflow: 'hidden',
                              background: '#f9f9fb',
                              border: '1px solid #e8e8ed',
                            }}
                          >
                            <div
                              style={{
                                width: '20%',
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#1d1d1f',
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.5,
                              }}
                            >
                              {tier3.name}
                            </div>
                            <div
                              style={{
                                width: '40%',
                                fontSize: 13,
                                color: '#6e6e73',
                                lineHeight: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {tier3.definitionCn || '-'}
                            </div>
                            <div
                              style={{
                                width: '20%',
                                fontSize: 13,
                                color: '#6e6e73',
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {tier3.typicalGlobalCompanies?.length > 0
                                ? tier3.typicalGlobalCompanies.join('\n')
                                : '-'}
                            </div>
                            <div
                              style={{
                                width: '20%',
                                fontSize: 13,
                                color: '#6e6e73',
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {tier3.typicalChineseCompanies?.length > 0
                                ? tier3.typicalChineseCompanies.join('\n')
                                : '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          )}

          {/* Latest News Section - Horizontal Scroll */}
          {news.length > 0 && (
            <>
              <div style={{ marginTop: 80, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ color: '#1d1d1f', fontSize: 32, fontWeight: 600, margin: 0 }}>Latest News</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button shape="circle" icon={<LeftOutlined />} onClick={() => scrollNews('left')} style={{ border: '1px solid #d2d2d7' }} />
                  <Button shape="circle" icon={<RightOutlined />} onClick={() => scrollNews('right')} style={{ border: '1px solid #d2d2d7' }} />
                </div>
              </div>

              <div
                ref={newsScrollRef}
                style={{
                  display: 'flex',
                  gap: 24,
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  paddingBottom: 8,
                }}
              >
                {news.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNewsClick(item)}
                    className="apple-card"
                    style={{
                      padding: 0,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'transform 0.3s ease',
                      minWidth: 'calc((100% - 48px) / 3)',
                      maxWidth: 'calc((100% - 48px) / 3)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    {item.imageUrl && (
                      <div style={{ width: '100%', height: 200, background: `url(${item.imageUrl}) center/cover` }} />
                    )}
                    <div style={{ padding: 24 }}>
                      <div style={{ fontSize: 12, color: '#86868b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      <h4 style={{ fontSize: 19, fontWeight: 600, color: '#1d1d1f', margin: '0 0 8px 0', lineHeight: 1.3 }}>{item.title}</h4>
                      <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Button
                  type="link"
                  onClick={() => navigate(`/public/industries/${id}/news`)}
                  style={{ fontSize: 16, color: '#0071e3', fontWeight: 500 }}
                >
                  More →
                </Button>
              </div>
            </>
          )}

          {/* Blogs Section */}
          {blogs.length > 0 && (
            <>
              <div style={{ marginTop: 80, marginBottom: 24 }}>
                <h3 style={{ color: '#1d1d1f', fontSize: 32, fontWeight: 600, margin: 0 }}>Blogs</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {blogs.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => handleBlogClick(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '32px 0',
                      borderTop: index === 0 ? '1px solid #d2d2d7' : 'none',
                      borderBottom: '1px solid #d2d2d7',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f7' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {item.imageUrl && (
                      <div style={{ width: 240, height: 120, borderRadius: 12, background: `url(${item.imageUrl}) center/cover`, marginRight: 24, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#86868b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      <h4 style={{ fontSize: 21, fontWeight: 600, color: '#1d1d1f', margin: '0 0 8px 0', lineHeight: 1.3 }}>{item.title}</h4>
                      <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Button
                  type="link"
                  onClick={() => navigate(`/public/industries/${id}/blogs`)}
                  style={{ fontSize: 16, color: '#0071e3', fontWeight: 500 }}
                >
                  More →
                </Button>
              </div>
            </>
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default IndustryDetail
