import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button, Empty, Modal } from 'antd'
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import { publicService, PublicCustomerCase } from '../../services/publicService'
import { documentService } from '../../services/documentService'
import MarkdownText from '../../components/MarkdownText'

const { Content } = Layout

const CustomerCaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customerCase, setCustomerCase] = useState<PublicCustomerCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfModalVisible, setPdfModalVisible] = useState(false)
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null)
  const [markdownContent, setMarkdownContent] = useState<string>('')
  const [loadingMarkdown, setLoadingMarkdown] = useState(false)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await publicService.getCustomerCase(id)
      setCustomerCase(data)
      
      // Fetch markdown content if URL exists
      if (data.detailMarkdownUrl) {
        setLoadingMarkdown(true)
        try {
          const response = await fetch(data.detailMarkdownUrl)
          if (response.ok) {
            const text = await response.text()
            setMarkdownContent(text)
          }
        } catch (error) {
          console.error('Failed to fetch markdown:', error)
        } finally {
          setLoadingMarkdown(false)
        }
      }
    } catch (error: any) {
      console.error('Failed to load customer case:', error)
      message.error('加载客户案例失败')
    } finally {
      setLoading(false)
    }
  }

  const openPdf = async (doc: any) => {
    setLoadingDocId(doc.id)
    try {
      const response = await documentService.getDownloadUrl(doc.id, doc.s3Key)
      setPdfUrl(response.url)
      setPdfModalVisible(true)
    } catch (error: any) {
      message.error('获取文档链接失败')
    } finally {
      setLoadingDocId(null)
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

  if (!customerCase) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
        <Content style={{ padding: '60px 0' }}>
          <div className="responsive-container">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>返回</Button>
            <Empty description="客户案例不存在" />
          </div>
        </Content>
      </Layout>
    )
  }

  const account = customerCase.account
  const docs = (customerCase.documents || []).filter((d: any) => d.s3Key || d.id)

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

          {/* 标题行：案例名称 + account logo */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40, gap: 24 }}>
            <h1 style={{ margin: 0, fontSize: 40, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.2, flex: 1 }}>
              {customerCase.name}
            </h1>
            {account?.logoUrl && (
              <img
                src={account.logoUrl}
                alt={account.name}
                style={{ height: 64, maxWidth: 180, objectFit: 'contain', flexShrink: 0, borderRadius: 8 }}
              />
            )}
          </div>

          {/* Account 信息卡片 */}
          {account && (
            <div className="apple-card" style={{ padding: 32, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                {account.logoUrl && (
                  <img
                    src={account.logoUrl}
                    alt={account.name}
                    style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 12, border: '1px solid #e5e5ea', padding: 8, background: '#fff' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: 4 }}>
                    {account.name}
                  </div>
                  <div style={{ fontSize: 13, color: '#86868b', marginBottom: account.description ? 12 : 0 }}>
                    {account.type === 'customer' ? '客户' : account.type === 'partner' ? '合作伙伴' : '供应商'}
                    {account.website && (
                      <a
                        href={account.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: 12, color: '#0071e3' }}
                      >
                        <GlobalOutlined style={{ marginRight: 4 }} />
                        官网
                      </a>
                    )}
                  </div>
                  {account.description && (
                    <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.7, margin: 0 }}>
                      {account.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 合作伙伴 */}
          {customerCase.partner && (
            <div style={{ marginBottom: 24, padding: '12px 20px', background: '#f0f7ff', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#86868b' }}>合作伙伴</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#0071e3' }}>{customerCase.partner}</span>
            </div>
          )}

          {/* 简要描述 */}
          {customerCase.summary && (
            <div className="apple-card" style={{ padding: 32, marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 22, fontWeight: 600 }}>简要描述</h3>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: '#1d1d1f', margin: 0 }}>
                {customerCase.summary}
              </p>
            </div>
          )}

          {/* 详细内容 (Markdown) */}
          {markdownContent && (
            <div className="apple-card" style={{ padding: 32, marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: 22, fontWeight: 600 }}>详细内容</h3>
              {loadingMarkdown ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin />
                </div>
              ) : (
                <MarkdownText style={{ fontSize: 16, lineHeight: 1.8, color: '#1d1d1f' }}>
                  {markdownContent}
                </MarkdownText>
              )}
            </div>
          )}

          {/* 相关文档 */}
          {docs.length > 0 && (
            <div className="apple-card" style={{ padding: 32, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12
                }}>
                  <FilePdfOutlined style={{ fontSize: 20, color: '#fff' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>相关文档</h3>
              </div>
              <div style={{ paddingLeft: 52, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                {docs.map((doc: any) => (
                  <div
                    key={doc.id}
                    onClick={() => openPdf(doc)}
                    style={{
                      width: 140,
                      cursor: loadingDocId === doc.id ? 'wait' : 'pointer',
                      opacity: loadingDocId === doc.id ? 0.6 : 1,
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    {/* PDF 封面缩略图 */}
                    <div style={{
                      width: 140, height: 100, borderRadius: 10,
                      background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 8, boxShadow: '0 4px 12px rgba(238, 90, 36, 0.3)',
                    }}>
                      <FilePdfOutlined style={{ fontSize: 36, color: '#fff', marginBottom: 4 }} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>PDF</span>
                    </div>
                    <div style={{
                      fontSize: 13, color: '#1d1d1f', fontWeight: 500, lineHeight: 1.4,
                      textAlign: 'center',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {doc.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Content>

      {/* PDF 在线预览 Modal */}
      <Modal
        open={pdfModalVisible}
        onCancel={() => { setPdfModalVisible(false); setPdfUrl(null) }}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        styles={{ body: { padding: 0, height: '85vh' } }}
        title="文档预览"
      >
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '0 0 8px 8px' }}
            title="PDF预览"
          />
        )}
      </Modal>
    </Layout>
  )
}

export default CustomerCaseDetail
