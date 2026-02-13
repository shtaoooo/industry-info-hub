import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { publicService } from '../../services/publicService'
import { MarkdownViewer } from '../../components/MarkdownViewer'

const { Content } = Layout

interface BlogDetail {
  id: string
  industryId: string
  title: string
  summary: string
  content?: string
  imageUrl?: string
  author: string
  publishedAt: string
}

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [blog, setBlog] = useState<BlogDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadBlogDetail()
    }
  }, [id])

  const loadBlogDetail = async () => {
    if (!id) return

    setLoading(true)
    try {
      const data = await publicService.getBlog(id)
      setBlog(data)
    } catch (error: any) {
      console.error('Failed to load blog detail:', error)
      message.error('加载博客详情失败')
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

  if (!blog) {
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
              <p style={{ color: '#6e6e73', fontSize: 16 }}>博客不存在</p>
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
            {blog.imageUrl && (
              <div
                style={{
                  width: '100%',
                  height: 400,
                  borderRadius: 18,
                  background: `url(${blog.imageUrl}) center/cover`,
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
                {new Date(blog.publishedAt).toLocaleDateString('en-US', {
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
                {blog.title}
              </h1>
              <p
                style={{
                  fontSize: 21,
                  color: '#6e6e73',
                  lineHeight: 1.5,
                  margin: '0 0 8px 0',
                }}
              >
                {blog.summary}
              </p>
              <div style={{ fontSize: 14, color: '#86868b' }}>By {blog.author}</div>
            </div>

            {blog.content && (
              <div className="apple-card" style={{ padding: 40, marginTop: 32 }}>
                <MarkdownViewer content={blog.content} />
              </div>
            )}
          </article>
        </div>
      </Content>
    </Layout>
  )
}

export default BlogDetail
