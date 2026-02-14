import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button, Empty, Pagination, Input } from 'antd'
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons'
import { publicService, PublicIndustry, PublicNews } from '../../services/publicService'

const { Content } = Layout
const PAGE_SIZE = 20

const NewsListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [industry, setIndustry] = useState<PublicIndustry | null>(null)
  const [news, setNews] = useState<PublicNews[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [industryData, newsData] = await Promise.all([
        publicService.getIndustry(id),
        publicService.getIndustryNews(id),
      ])
      setIndustry(industryData)
      setNews(newsData)
    } catch (error: any) {
      console.error('Failed to load news:', error)
      message.error('加载新闻列表失败')
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

  const filteredNews = searchText.trim()
    ? news.filter((item) => {
        const keyword = searchText.toLowerCase()
        return item.title.toLowerCase().includes(keyword) || item.summary.toLowerCase().includes(keyword)
      })
    : news

  const paginatedNews = filteredNews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
        <Content style={{ padding: '60px 0' }}>
          <div className="responsive-container">
            <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
          </div>
        </Content>
      </Layout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
      <Content style={{ padding: '60px 0' }}>
        <div className="responsive-container">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/public/industries/${id}`)} style={{ marginBottom: 24 }}>
            {industry?.name || '返回'}
          </Button>

          <h2 style={{ color: '#1d1d1f', fontSize: 32, fontWeight: 600, marginBottom: 32 }}>News</h2>

          <Input
            placeholder="搜索新闻标题或摘要..."
            prefix={<SearchOutlined style={{ color: '#86868b' }} />}
            allowClear
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1) }}
            style={{ marginBottom: 24, maxWidth: 480, borderRadius: 8 }}
            size="large"
          />

          {filteredNews.length === 0 ? (
            <Empty description={searchText ? '没有匹配的新闻' : '暂无新闻'} />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
                {paginatedNews.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNewsClick(item)}
                    className="apple-card"
                    style={{ padding: 0, cursor: 'pointer', overflow: 'hidden', transition: 'transform 0.3s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    {item.imageUrl && (
                      <div style={{ width: '100%', height: 160, background: `url(${item.imageUrl}) center/cover` }} />
                    )}
                    <div style={{ padding: 20 }}>
                      <div style={{ fontSize: 12, color: '#86868b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', margin: '0 0 8px 0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.title}
                      </h4>
                      <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {filteredNews.length > PAGE_SIZE && (
                <div style={{ marginTop: 40, textAlign: 'center' }}>
                  <Pagination current={page} total={filteredNews.length} pageSize={PAGE_SIZE} onChange={setPage} showSizeChanger={false} />
                </div>
              )}
            </>
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default NewsListPage
