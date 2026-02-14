import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button, Empty, Pagination } from 'antd'
import { ArrowLeftOutlined, BankOutlined, ApartmentOutlined } from '@ant-design/icons'
import { publicService, PublicIndustry, PublicSubIndustry, PublicNews, PublicBlog } from '../../services/publicService'

const { Content } = Layout

const NEWS_PER_PAGE = 6
const BLOGS_PER_PAGE = 5

const IndustryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [industry, setIndustry] = useState<PublicIndustry | null>(null)
  const [subIndustries, setSubIndustries] = useState<PublicSubIndustry[]>([])
  const [news, setNews] = useState<PublicNews[]>([])
  const [blogs, setBlogs] = useState<PublicBlog[]>([])
  const [loading, setLoading] = useState(true)
  const [newsPage, setNewsPage] = useState(1)
  const [blogsPage, setBlogsPage] = useState(1)

  useEffect(() => {
    if (id) {
      loadIndustryData()
    }
  }, [id])

  const loadIndustryData = async () => {
    if (!id) return

    setLoading(true)
    try {
      // Load industry and sub-industries first (critical data)
      const [industryData, subIndustriesData] = await Promise.all([
        publicService.getIndustry(id),
        publicService.listSubIndustries(id),
      ])
      setIndustry(industryData)
      setSubIndustries(subIndustriesData)

      // Load news and blogs independently (non-critical, may fail if GSI not ready)
      const [newsData, blogsData] = await Promise.all([
        publicService.getIndustryNews(id).catch((err) => {
          console.warn('Failed to load news:', err)
          return [] as PublicNews[]
        }),
        publicService.getIndustryBlogs(id).catch((err) => {
          console.warn('Failed to load blogs:', err)
          return [] as PublicBlog[]
        }),
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
    // Check if it has an external URL
    if (item.externalUrl) {
      window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
    } else {
      // Navigate to news detail page to show markdown content
      navigate(`/public/news/${item.id}`)
    }
  }

  const handleBlogClick = (item: PublicBlog) => {
    // Check if it has an external URL
    if (item.externalUrl) {
      window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
    } else {
      // Navigate to blog detail page to show markdown content
      navigate(`/public/blogs/${item.id}`)
    }
  }

  const paginatedNews = news.slice((newsPage - 1) * NEWS_PER_PAGE, newsPage * NEWS_PER_PAGE)
  const paginatedBlogs = blogs.slice((blogsPage - 1) * BLOGS_PER_PAGE, blogsPage * BLOGS_PER_PAGE)

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
                    width: 64,
                    height: 64,
                    marginRight: 16,
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <BankOutlined style={{ fontSize: 64, color: '#0071e3', marginRight: 16 }} />
              )}
              <h2 style={{ margin: 0, color: '#1d1d1f', fontSize: 30, fontWeight: 600 }}>
                {industry.name}
              </h2>
            </div>
            <p style={{ color: '#6e6e73', fontSize: 16, lineHeight: 1.8, margin: 0, marginBottom: 8 }}>
              {industry.definition}
            </p>
            {industry.definitionCn && (
              <p style={{ color: '#6e6e73', fontSize: 16, lineHeight: 1.8, margin: 0 }}>
                {industry.definitionCn}
              </p>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3
              style={{
                color: '#1d1d1f',
                fontSize: 24,
                fontWeight: 600,
                margin: 0,
              }}
            >
              Sub-Industries
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

          {/* Latest News Section */}
          {news.length > 0 && (
            <>
              <div style={{ marginTop: 80, marginBottom: 24 }}>
                <h3
                  style={{
                    color: '#1d1d1f',
                    fontSize: 32,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Latest News
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                {paginatedNews.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNewsClick(item)}
                    className="apple-card"
                    style={{
                      padding: 0,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'transform 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {item.imageUrl && (
                      <div
                        style={{
                          width: '100%',
                          height: 200,
                          background: `url(${item.imageUrl}) center/cover`,
                        }}
                      />
                    )}
                    <div style={{ padding: 24 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#86868b',
                          marginBottom: 8,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {new Date(item.publishedAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <h4
                        style={{
                          fontSize: 19,
                          fontWeight: 600,
                          color: '#1d1d1f',
                          margin: '0 0 8px 0',
                          lineHeight: 1.3,
                        }}
                      >
                        {item.title}
                      </h4>
                      <p
                        style={{
                          fontSize: 14,
                          color: '#6e6e73',
                          lineHeight: 1.6,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {news.length > NEWS_PER_PAGE && (
                <div style={{ marginTop: 32, textAlign: 'center' }}>
                  <Pagination
                    current={newsPage}
                    total={news.length}
                    pageSize={NEWS_PER_PAGE}
                    onChange={setNewsPage}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}

          {/* In the Loop (Blogs) Section */}
          {blogs.length > 0 && (
            <>
              <div style={{ marginTop: 80, marginBottom: 24 }}>
                <h3
                  style={{
                    color: '#1d1d1f',
                    fontSize: 32,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Blogs
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {paginatedBlogs.map((item, index) => (
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f5f5f7'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {item.imageUrl && (
                      <div
                        style={{
                          width: 240,
                          height: 120,
                          borderRadius: 12,
                          background: `url(${item.imageUrl}) center/cover`,
                          marginRight: 24,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#86868b',
                          marginBottom: 8,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {new Date(item.publishedAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <h4
                        style={{
                          fontSize: 21,
                          fontWeight: 600,
                          color: '#1d1d1f',
                          margin: '0 0 8px 0',
                          lineHeight: 1.3,
                        }}
                      >
                        {item.title}
                      </h4>
                      <p
                        style={{
                          fontSize: 14,
                          color: '#6e6e73',
                          lineHeight: 1.6,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {blogs.length > BLOGS_PER_PAGE && (
                <div style={{ marginTop: 32, textAlign: 'center' }}>
                  <Pagination
                    current={blogsPage}
                    total={blogs.length}
                    pageSize={BLOGS_PER_PAGE}
                    onChange={setBlogsPage}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default IndustryDetail
