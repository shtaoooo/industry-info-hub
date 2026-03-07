import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button, Empty, Modal, Form, Input } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined, BulbOutlined, EditOutlined, LeftOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons'
import { publicService, PublicUseCase, PublicSolution, PublicBlog, PublicCustomerCase } from '../../services/publicService'
import { useCaseService } from '../../services/useCaseService'
import { DocumentDownloadList } from '../../components/DocumentDownloadList'
import MarkdownText from '../../components/MarkdownText'
import { useAuth } from '../../contexts/AuthContext'

const { Content } = Layout
const { TextArea } = Input

const UseCaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [useCase, setUseCase] = useState<PublicUseCase | null>(null)
  const [solutions, setSolutions] = useState<PublicSolution[]>([])
  const [blogs, setBlogs] = useState<PublicBlog[]>([])
  const [customerCases, setCustomerCases] = useState<PublicCustomerCase[]>([])
  const [loading, setLoading] = useState(true)
  const [detailMarkdown, setDetailMarkdown] = useState<string>('')
  const [markdownLoading, setMarkdownLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const casesScrollRef = useRef<HTMLDivElement>(null)

  const canEdit = user && (user.roles?.includes('admin') || user.roles?.includes('specialist'))

  useEffect(() => {
    if (id) {
      loadUseCaseData()
    }
  }, [id])

  const loadUseCaseData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [useCaseData, solutionsData, blogsData, customerCasesData] = await Promise.all([
        publicService.getUseCase(id),
        publicService.getSolutionsForUseCase(id),
        publicService.getUseCaseBlogs(id).catch(() => []),
        publicService.getUseCaseCustomerCases(id).catch(() => []),
      ])
      setUseCase(useCaseData)
      setSolutions(solutionsData)
      setBlogs(blogsData)
      setCustomerCases(customerCasesData)
      
      // Load markdown content if available
      if (useCaseData.detailMarkdownUrl) {
        loadMarkdownContent(useCaseData.detailMarkdownUrl)
      }
    } catch (error: any) {
      console.error('Failed to load use case data:', error)
      message.error('加载用例信息失败')
    } finally {
      setLoading(false)
    }
  }

  const loadMarkdownContent = async (url: string) => {
    setMarkdownLoading(true)
    try {
      const response = await fetch(url)
      if (response.ok) {
        const text = await response.text()
        setDetailMarkdown(text)
      }
    } catch (error) {
      console.error('Failed to load markdown:', error)
    } finally {
      setMarkdownLoading(false)
    }
  }

  const handleDoubleClick = () => {
    if (!canEdit || !useCase) return
    editForm.setFieldsValue({
      summary: useCase.summary || '',
      detailMarkdown: detailMarkdown,
    })
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!id) return
    try {
      const values = await editForm.validateFields()
      setSubmitting(true)
      await useCaseService.update(id, {
        summary: values.summary,
        detailMarkdown: values.detailMarkdown,
      })
      message.success('更新成功')
      setIsEditing(false)
      await loadUseCaseData()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || '更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  const scrollCases = (direction: 'left' | 'right') => {
    if (casesScrollRef.current) {
      const containerWidth = casesScrollRef.current.clientWidth
      const cardWidth = (containerWidth - 48) / 3 + 24
      casesScrollRef.current.scrollBy({
        left: direction === 'left' ? -cardWidth : cardWidth,
        behavior: 'smooth',
      })
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

          {/* 简要描述 */}
          {useCase.summary && (
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
                  <FileTextOutlined style={{ fontSize: 20, color: '#ffffff' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>简要描述</h3>
              </div>
              <p style={{ 
                fontSize: 16, 
                lineHeight: 1.8, 
                margin: 0, 
                color: '#1d1d1f',
                paddingLeft: 52
              }}>
                {useCase.summary}
              </p>
            </div>
          )}

          {/* 具体内容 */}
          <div 
            className="apple-card" 
            style={{ padding: 32, marginBottom: 24, cursor: canEdit ? 'pointer' : 'default' }}
            onDoubleClick={handleDoubleClick}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
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
                  <BulbOutlined style={{ fontSize: 20, color: '#ffffff' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>具体内容</h3>
              </div>
              {canEdit && (
                <Button 
                  type="link" 
                  icon={<EditOutlined />} 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDoubleClick()
                  }}
                >
                  编辑
                </Button>
              )}
            </div>
            {markdownLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : detailMarkdown ? (
              <MarkdownText style={{ 
                paddingLeft: 52,
                fontSize: 16, 
                lineHeight: 1.8, 
                color: '#1d1d1f',
              }}>
                {detailMarkdown}
              </MarkdownText>
            ) : (
              <span style={{ color: '#86868b', fontStyle: 'italic', paddingLeft: 52, display: 'block' }}>
                暂无详细内容
              </span>
            )}
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

          {/* 客户案例部分 */}
          {customerCases.length > 0 && (
            <>
              <div style={{ marginBottom: 24, marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', fontSize: 28, fontWeight: 700, margin: 0, color: '#1d1d1f' }}>
                  <TeamOutlined style={{ marginRight: 12, color: '#0071e3', fontSize: 32 }} />
                  相关客户案例
                </h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button shape="circle" icon={<LeftOutlined />} onClick={() => scrollCases('left')} style={{ border: '1px solid #d2d2d7' }} />
                  <Button shape="circle" icon={<RightOutlined />} onClick={() => scrollCases('right')} style={{ border: '1px solid #d2d2d7' }} />
                </div>
              </div>

              <div
                ref={casesScrollRef}
                style={{
                  display: 'flex',
                  gap: 24,
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  paddingBottom: 8,
                }}
              >
                {customerCases.map((item) => (
                  <div
                    key={item.id}
                    className="apple-card"
                    onClick={() => navigate(`/public/customer-cases/${item.id}`)}
                    style={{
                      padding: 0,
                      overflow: 'hidden',
                      transition: 'transform 0.3s ease',
                      minWidth: 'calc((100% - 48px) / 3)',
                      maxWidth: 'calc((100% - 48px) / 3)',
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    {/* 顶部色条 */}
                    <div style={{ height: 6, background: 'linear-gradient(90deg, #0071e3 0%, #34aadc 100%)' }} />
                    <div style={{ padding: 24 }}>
                      <div style={{ fontSize: 12, color: '#86868b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        客户案例
                      </div>
                      <h4 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', margin: '0 0 12px 0', lineHeight: 1.3 }}>
                        {item.name}
                      </h4>
                      {item.partner && (
                        <div style={{ fontSize: 13, color: '#0071e3', marginBottom: 8, fontWeight: 500 }}>
                          合作伙伴：{item.partner}
                        </div>
                      )}
                      {item.summary && (
                        <div>
                          <div style={{ fontSize: 12, color: '#86868b', marginBottom: 4, fontWeight: 600 }}>简要描述</div>
                          <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {blogs.map((blog, index) => (
                  <div
                    key={blog.id}
                    onClick={() => {
                      if (blog.externalUrl) {
                        window.open(blog.externalUrl, '_blank', 'noopener,noreferrer')
                      } else {
                        navigate(`/public/blogs/${blog.id}`)
                      }
                    }}
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
                    {blog.imageUrl && (
                      <div style={{ 
                        width: 240, 
                        height: 120, 
                        borderRadius: 12, 
                        background: `url(${blog.imageUrl}) center/cover`, 
                        marginRight: 24, 
                        flexShrink: 0 
                      }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 12, 
                        color: '#86868b', 
                        marginBottom: 8, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px' 
                      }}>
                        {new Date(blog.publishedAt).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <h4 style={{ 
                        fontSize: 21, 
                        fontWeight: 600, 
                        color: '#1d1d1f', 
                        margin: '0 0 8px 0', 
                        lineHeight: 1.3 
                      }}>
                        {blog.title}
                      </h4>
                      <p style={{ 
                        fontSize: 14, 
                        color: '#6e6e73', 
                        lineHeight: 1.6, 
                        margin: 0, 
                        display: '-webkit-box', 
                        WebkitLineClamp: 5, 
                        WebkitBoxOrient: 'vertical', 
                        overflow: 'hidden' 
                      }}>
                        {blog.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Content>

      {/* Edit Modal */}
      <Modal
        title="编辑用例内容"
        open={isEditing}
        onOk={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={800}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="summary"
            label="简要描述"
            rules={[
              { required: true, message: '请输入简要描述' },
              { max: 500, message: '简要描述不能超过500个字符' },
            ]}
          >
            <TextArea rows={3} placeholder="请输入简要描述" />
          </Form.Item>
          <Form.Item
            name="detailMarkdown"
            label="具体内容"
            rules={[{ max: 50000, message: '具体内容不能超过50000个字符' }]}
          >
            <TextArea 
              rows={12} 
              placeholder={`## 📋 业务场景

[业务场景具体内容]

## 🎯 客户痛点

痛点1：[痛点1描述]
[痛点1具体内容]

痛点2：[痛点2描述]
[痛点2具体内容]

## 👥 切入人群

- 非常规事业部负责人
- 压裂工程经理
- 技术研发团队

## 💬 沟通话术

> 压裂服务的效果直接影响单井产量...`}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

export default UseCaseDetail