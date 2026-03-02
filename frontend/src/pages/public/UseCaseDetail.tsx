import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, message, Button, Empty } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined, BulbOutlined } from '@ant-design/icons'
import { publicService, PublicUseCase, PublicSolution } from '../../services/publicService'
import { DocumentDownloadList } from '../../components/DocumentDownloadList'

const { Content } = Layout

const UseCaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [useCase, setUseCase] = useState<PublicUseCase | null>(null)
  const [solutions, setSolutions] = useState<PublicSolution[]>([])
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
      const [useCaseData, solutionsData] = await Promise.all([
        publicService.getUseCase(id),
        publicService.getSolutionsForUseCase(id),
      ])
      setUseCase(useCaseData)
      setSolutions(solutionsData)
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
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>返回</Button>
          <div className="apple-card" style={{ padding: 32, marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <FileTextOutlined style={{ fontSize: 32, color: '#0071e3', marginRight: 16 }} />
              <h2 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>{useCase.name}</h2>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>场景介绍</h4>
              <p className="public-detail-secondary" style={{ fontSize: 16, lineHeight: 1.8, margin: 0 }}>{useCase.businessScenario || useCase.description}</p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>客户痛点</h4>
              <p className="public-detail-secondary" style={{ fontSize: 16, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{useCase.customerPainPoints || '暂无数据'}</p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>切入人群</h4>
              <p className="public-detail-secondary" style={{ fontSize: 16, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{useCase.targetAudience || '暂无数据'}</p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>沟通话术</h4>
              <p className="public-detail-secondary" style={{ fontSize: 16, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{useCase.communicationScript || '暂无数据'}</p>
            </div>
            {useCase.documents && useCase.documents.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>相关文档</h4>
                <DocumentDownloadList documents={useCase.documents} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 600, margin: 0 }}>
              <BulbOutlined style={{ marginRight: 12, color: '#0071e3' }} />相关解决方案
            </h3>
          </div>
          {solutions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#f5f5f7', borderRadius: 18 }}>
              <BulbOutlined style={{ fontSize: 48, color: '#86868b', marginBottom: 16 }} />
              <div className="public-detail-secondary" style={{ fontSize: 16 }}>该用例暂无关联解决方案</div>
            </div>
          ) : (
            <div className="responsive-grid-auto">
              {solutions.map((solution) => (
                <div key={solution.id} onClick={() => navigate(`/public/solutions/${solution.id}`)} className="apple-card" style={{ padding: 24, cursor: 'pointer' }}>
                  <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{solution.name}</div>
                  <div className="public-detail-secondary" style={{ fontSize: 15, lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{solution.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default UseCaseDetail