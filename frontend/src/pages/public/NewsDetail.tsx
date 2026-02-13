import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { publicService } from '../../services/publicService'
import MarkdownViewer from '../../components/MarkdownViewer'

const { Content } = Layout

interface NewsDetail {
  id: string
  industryId: string
  title: string
  summary: string
  content: string
  imageUrl?: string
  author: string
  publishedAt: string
}

const NewsDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [news, setNews] = useState<NewsDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadNewsDetail()
    }
  }, [id])

  const loadNewsDetail = async () => {
    if (!id) return

    setLoading(true)
    try {
      const data = await publicService.getNews(id)
      setNews(data)
    } catch (error: any) {
      console.error('Failed to load news detail:', error)
      message.error('加载新闻详情失败')
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

  if (!news) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
        <Content style={{ padding: '60px 0' }}>
          <div className="responsive-container">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ marginBottom: 24 }}
            >
              返回
            </Button>
            <div style={{ textAlign: 'center', padding: 60 }}>
              <p style={{ color: '#6e6e73', fontSize: 16 }}>新闻不存在</p>
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
            style={{ marginBottom: 24 }}
          >
            返回
          </Button>

          <article>
            {news.imageUrl && (
              <div
                style={{
                  width: '100%',
                  height: 400,
                  borderRadius: 18,
                  background: `url(${news.imageUrl}) center/cover`,
                  marginBottom: 32,
                }}
              />
            )}

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  color: '#86868b',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {new Date(news.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <h1
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: '#1d1d1f',
                  margin: '0 0 16px 0',
                  lineHeight: 1.1,
                }}
              >
                {news.title}
              </h1>
              <p
                style={{
                  fontSize: 21,
                  color: '#6e6e73',
                  lineHeight: 1.5,
                  margin: '0 0 8px 0',
                }}
              >
                {news.summary}
              </p>
              <div style={{ fontSize: 14, color: '#86868b' }}>By {news.author}</div>
            </div>

            <div className="apple-card" style={{ padding: 40, marginTop: 32 }}>
              <MarkdownViewer content={news.content} />
            </div>
          </article>
        </div>
      </Content>
    </Layout>
  )
}

export default NewsDetail
