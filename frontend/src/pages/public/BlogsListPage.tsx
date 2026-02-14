import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button, Empty, Pagination, Input } from 'antd'
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons'
import { publicService, PublicIndustry, PublicBlog } from '../../services/publicService'

const { Content } = Layout
const PAGE_SIZE = 20

const BlogsListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [industry, setIndustry] = useState<PublicIndustry | null>(null)
  const [blogs, setBlogs] = useState<PublicBlog[]>([])
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
      const [industryData, blogsData] = await Promise.all([
        publicService.getIndustry(id),
        publicService.getIndustryBlogs(id),
      ])
      setIndustry(industryData)
      setBlogs(blogsData)
    } catch (error: any) {
      console.error('Failed to load blogs:', error)
      message.error('加载博客列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleBlogClick = (item: PublicBlog) => {
    if (item.externalUrl) {
      window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
    } else {
      navigate(`/public/blogs/${item.id}`)
    }
  }

  const filteredBlogs = searchText.trim()
    ? blogs.filter((item) => {
        const keyword = searchText.toLowerCase()
        return item.title.toLowerCase().includes(keyword) || item.summary.toLowerCase().includes(keyword)
      })
    : blogs

  const paginatedBlogs = filteredBlogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

          <h2 style={{ color: '#1d1d1f', fontSize: 32, fontWeight: 600, marginBottom: 32 }}>Blogs</h2>

          <Input
            placeholder="搜索博客标题或摘要..."
            prefix={<SearchOutlined style={{ color: '#86868b', fontSize: 18 }} />}
            allowClear
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1) }}
            style={{ marginBottom: 32, background: '#f5f5f7', border: 'none', borderRadius: 12, padding: '12px 16px', fontSize: 15 }}
            size="large"
          />

          {filteredBlogs.length === 0 ? (
            <Empty description={searchText ? '没有匹配的博客' : '暂无博客'} />
          ) : (
            <>
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

              {filteredBlogs.length > PAGE_SIZE && (
                <div style={{ marginTop: 40, textAlign: 'center' }}>
                  <Pagination current={page} total={filteredBlogs.length} pageSize={PAGE_SIZE} onChange={setPage} showSizeChanger={false} />
                </div>
              )}
            </>
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default BlogsListPage
