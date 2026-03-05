import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button, Empty } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined, BulbOutlined, UserOutlined, ExclamationCircleOutlined, CommentOutlined, FileOutlined, ReadOutlined } from '@ant-design/icons'
import { publicService, PublicUseCase, PublicSolution, PublicBlog } from '../../services/publicService'
import { DocumentDownloadList } from '../../components/DocumentDownloadList'
import MarkdownText from '../../components/MarkdownText'

const { Content } = Layout

const UseCaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [useCase, setUseCase] = useState<PublicUseCase | null>(null)
  const [solutions, setSolutions] = useState<PublicSolution[]>([])
  const [blogs, setBlogs] = useState<PublicBlog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadUseCaseData()
    }
  }, [id])

  const loadUseCaseData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [useCaseData, solutionsData, blogsData] = await Promise.all([
        publicService.getUseCase(id),
        publicService.getSolutionsForUseCase(id),
        publicService.getUseCaseBlogs(id).catch(() => []), // 如果没有blogs也不报错
      ])
      setUseCase(useCaseData)
      setSolutions(solutionsData)
      setBlogs(blogsData)
    } catch (error: any) {
      console.error('Failed to load use case data:', error)
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
            <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
          </div>
        </Content>
      </Layout>
    )
  }

  if (!useCase) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
        <Content style={{ padding: '60px 0' }}>
          <div className="responsive-container">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>返回</Button>
            <Empty description="用例不存在" />
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
            style={{ marginBottom: 32 }}
            size="large"
          >
            返回
          </Button>

          {/* 标题 */}
          <h1 style={{ 
            margin: '0 0 40px 0', 
            fontSize: 40, 
            fontWeight: 700, 
            color: '#1d1d1f',
            lineHeight: 1.2
          }}>
            {useCase.name}
          </h1>

          {/* 场景介绍卡片 */}
          <div className="apple-card" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 10, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <FileOutlined style={{ fontSize: 20, color: '#ffffff' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>场景介绍</h3>
            </div>
            <MarkdownText style={{ 
              fontSize: 16, 
              lineHeight: 1.8, 
              margin: 0, 
              color: '#1d1d1f',
              paddingLeft: 52
            }}>
              {useCase.businessScenario || useCase.description}
            </MarkdownText>
          </div>

          {/* 客户痛点卡片 */}
          <div className="apple-card" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 10, 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <ExclamationCircleOutlined style={{ fontSize: 20, color: '#ffffff' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>客户痛点</h3>
            </div>
            <MarkdownText style={{ 
              paddingLeft: 52,
              fontSize: 16, 
              lineHeight: 1.8, 
              color: '#1d1d1f',
            }} fallback={<span style={{ color: '#86868b', fontStyle: 'italic', paddingLeft: 52, display: 'block' }}>暂无数据</span>}>
              {useCase.customerPainPoints}
            </MarkdownText>
          </div>

          {/* 切入人群卡片 */}
          <div className="apple-card" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 10, 
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <UserOutlined style={{ fontSize: 20, color: '#ffffff' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>切入人群</h3>
            </div>
            <MarkdownText style={{ 
              paddingLeft: 52,
              fontSize: 16, 
              lineHeight: 1.8, 
              color: '#1d1d1f',
            }} fallback={<span style={{ color: '#86868b', fontStyle: 'italic', paddingLeft: 52, display: 'block' }}>暂无数据</span>}>
              {useCase.targetAudience}
            </MarkdownText>
          </div>

          {/* 沟通话术 - 引用框样式 */}
          <div className="apple-card" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 10, 
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <CommentOutlined style={{ fontSize: 20, color: '#ffffff' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>沟通话术</h3>
            </div>
            <div style={{ 
              marginLeft: 52,
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
              borderRadius: 12,
              borderLeft: '4px solid #fa709a',
              boxShadow: '0 2px 8px rgba(250, 112, 154, 0.1)'
            }}>
              <MarkdownText style={{ 
                fontSize: 16, 
                lineHeight: 1.8, 
                color: '#1d1d1f',
                fontStyle: 'italic'
              }} fallback={<span style={{ color: '#86868b' }}>暂无数据</span>}>
                {useCase.communicationScript}
              </MarkdownText>
            </div>
          </div>

          {/* 相关文档卡片 */}
          {useCase.documents && useCase.documents.length > 0 && (
            <div className="apple-card" style={{ padding: 32, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 10, 
                  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <FileTextOutlined style={{ fontSize: 20, color: '#1d1d1f' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>相关文档</h3>
              </div>
              <div style={{ paddingLeft: 52 }}>
                <DocumentDownloadList documents={useCase.documents} />
              </div>
            </div>
          )}

          {/* 相关解决方案标题 */}
          <div style={{ marginBottom: 24, marginTop: 48 }}>
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: 28, 
              fontWeight: 700, 
              margin: 0,
              color: '#1d1d1f'
            }}>
              <BulbOutlined style={{ marginRight: 12, color: '#0071e3', fontSize: 32 }} />
              相关解决方案
            </h2>
          </div>

          {/* 解决方案列表 */}
          {solutions.length === 0 ? (
            <div className="apple-card" style={{ 
              textAlign: 'center', 
              padding: 80, 
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
            }}>
              <BulbOutlined style={{ fontSize: 64, color: '#86868b', marginBottom: 20, opacity: 0.5 }} />
              <div style={{ fontSize: 17, color: '#6e6e73', fontWeight: 500 }}>该用例暂无关联解决方案</div>
            </div>
          ) : (
            <div className="responsive-grid-auto">
              {solutions.map((solution) => (
                <div 
                  key={solution.id} 
                  onClick={() => navigate(`/public/solutions/${solution.id}`)} 
                  className="apple-card" 
                  style={{ 
                    padding: 28, 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)'
                    e.currentTarget.style.borderColor = '#0071e3'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  <div style={{ 
                    fontSize: 19, 
                    fontWeight: 600, 
                    marginBottom: 12,
                    color: '#1d1d1f'
                  }}>
                    {solution.name}
                  </div>
                  <div style={{ 
                    fontSize: 15, 
                    lineHeight: 1.6, 
                    color: '#6e6e73',
                    display: '-webkit-box', 
                    WebkitLineClamp: 4, 
                    WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden' 
                  }}>
                    {solution.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 相关博客部分 */}
          {blogs.length > 0 && (
            <>
              <div style={{ marginBottom: 24, marginTop: 48 }}>
                <h2 style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  fontSize: 28, 
                  fontWeight: 700, 
                  margin: 0,
                  color: '#1d1d1f'
                }}>
                  <ReadOutlined style={{ marginRight: 12, color: '#0071e3', fontSize: 32 }} />
                  相关博客
                </h2>
              </div>

              <div style={{ 
                overflowX: 'auto', 
                marginBottom: 32,
                paddingBottom: 16,
                scrollbarWidth: 'thin',
                scrollbarColor: '#d2d2d7 transparent'
              }}>
                <div style={{ 
                  display: 'flex', 
                  gap: 20,
                  minWidth: 'min-content'
                }}>
                  {blogs.map((blog) => (
                    <div
                      key={blog.id}
                      onClick={() => navigate(`/public/blogs/${blog.id}`)}
                      className="apple-card"
                      style={{
                        minWidth: 320,
                        maxWidth: 320,
                        padding: 0,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        flexShrink: 0,
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
                      }}
                    >
                      {blog.imageUrl && (
                        <div style={{
                          width: '100%',
                          height: 180,
                          overflow: 'hidden',
                          background: '#f5f5f7',
                        }}>
                          <img
                            src={blog.imageUrl}
                            alt={blog.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </div>
                      )}
                      <div style={{ padding: 20 }}>
                        <div style={{
                          fontSize: 17,
                          fontWeight: 600,
                          marginBottom: 8,
                          color: '#1d1d1f',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4,
                        }}>
                          {blog.title}
                        </div>
                        <div style={{
                          fontSize: 14,
                          color: '#6e6e73',
                          marginBottom: 12,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.6,
                        }}>
                          {blog.summary}
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: '#86868b',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <span>{blog.author}</span>
                          <span>{new Date(blog.publishedAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default UseCaseDetail