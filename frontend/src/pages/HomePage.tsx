import React, { useState, useEffect } from 'react'
import { Layout, Button, Typography, Space, Tag, Spin, message } from 'antd'
import {
  LogoutOutlined, UserOutlined, BankOutlined,
  ApartmentOutlined, BulbOutlined, FileTextOutlined,
  LinkOutlined, SolutionOutlined, TeamOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { publicService, PublicIndustry } from '../services/publicService'

const { Header, Content } = Layout
const { Title, Text } = Typography

// 行业图片映射 - 使用本地图片
const getFallbackImage = (industryName: string): string => {
  const imageMap: { [key: string]: string } = {
    // English names (from DynamoDB)
    'Healthcare': '/images/industries/healthcare.jpg',
    'Financial Services': '/images/industries/finance.jpg',
    'Manufacturing': '/images/industries/manufacturing.jpg',
    'Retail & Wholesale': '/images/industries/retail.jpg',
    'Retail': '/images/industries/retail.jpg',
    'Education': '/images/industries/education.jpg',
    'Transportation & Logistics': '/images/industries/logistics.jpg',
    'Transportation': '/images/industries/logistics.jpg',
    'Logistics': '/images/industries/logistics.jpg',
    'Energy - Power & Utilities': '/images/industries/energy.jpg',
    'Energy - Oil & Gas': '/images/industries/energy.jpg',
    'Energy': '/images/industries/energy.jpg',
    'Telecommunications': '/images/industries/telecom.jpg',
    'Engineering, Construction & Real Estate': '/images/industries/construction.jpg',
    'Construction': '/images/industries/construction.jpg',
    'Real Estate': '/images/industries/realestate.jpg',
    'Automotive': '/images/industries/automotive.jpg',
    'Agriculture': '/images/industries/agriculture.jpg',
    'Travel': '/images/industries/tourism.jpg',
    'Hospitality': '/images/industries/tourism.jpg',
    'Media & Entertainment': '/images/industries/media.jpg',
    'Media': '/images/industries/media.jpg',
    'Software & Internet': '/images/industries/technology.jpg',
    'Hi Tech, Electronics & Semiconductor': '/images/industries/technology.jpg',
    'Technology': '/images/industries/technology.jpg',
    'General Public Services': '/images/industries/government.jpg',
    'Justice & Public Safety': '/images/industries/government.jpg',
    'Social Services': '/images/industries/government.jpg',
    'Government': '/images/industries/government.jpg',
    'Aerospace & Satellite': '/images/industries/aerospace.jpg',
    'Defense & Intelligence': '/images/industries/aerospace.jpg',
    'Aerospace': '/images/industries/aerospace.jpg',
    'Professional Services': '/images/industries/professional.jpg',
    'Advertising & Marketing': '/images/industries/media.jpg',
    'Consumer Packaged Goods': '/images/industries/food.jpg',
    'Life Sciences': '/images/industries/healthcare.jpg',
    'Games': '/images/industries/media.jpg',
    'Mining & Minerals': '/images/industries/chemical.jpg',
    'Environmental Protection': '/images/industries/energy.jpg',
    
    // Chinese names (for compatibility)
    '金融': '/images/industries/finance.jpg',
    '制造': '/images/industries/manufacturing.jpg',
    '零售': '/images/industries/retail.jpg',
    '医疗': '/images/industries/healthcare.jpg',
    '教育': '/images/industries/education.jpg',
    '物流': '/images/industries/logistics.jpg',
    '能源': '/images/industries/energy.jpg',
    '电信': '/images/industries/telecom.jpg',
    '房地产': '/images/industries/realestate.jpg',
    '汽车': '/images/industries/automotive.jpg',
    '农业': '/images/industries/agriculture.jpg',
    '旅游': '/images/industries/tourism.jpg',
    '媒体': '/images/industries/media.jpg',
    '科技': '/images/industries/technology.jpg',
    '政府': '/images/industries/government.jpg',
    '保险': '/images/industries/insurance.jpg',
    '航空': '/images/industries/aerospace.jpg',
    '化工': '/images/industries/chemical.jpg',
    '建筑': '/images/industries/construction.jpg',
    '专业': '/images/industries/professional.jpg',
    '食品': '/images/industries/food.jpg',
    '服装': '/images/industries/textile.jpg',
  }
  
  // Try exact match first
  if (imageMap[industryName]) {
    return imageMap[industryName]
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(imageMap)) {
    if (industryName.includes(key) || key.includes(industryName)) {
      return value
    }
  }
  
  // Default image
  return '/images/industries/default.jpg'
}

const HomePage: React.FC = () => {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const [industries, setIndustries] = useState<PublicIndustry[]>([])
  const [loadingIndustries, setLoadingIndustries] = useState(false)

  useEffect(() => {
    if (user?.role === 'user') {
      loadIndustries()
    }
  }, [user])

  const loadIndustries = async () => {
    setLoadingIndustries(true)
    try {
      const data = await publicService.listIndustries()
      setIndustries(data)
    } catch (error: any) {
      console.error('Failed to load industries:', error)
      message.error('加载行业列表失败')
    } finally {
      setLoadingIndustries(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理员'
      case 'specialist': return '行业专员'
      case 'user': return '普通用户'
      default: return role
    }
  }

  const adminCards = [
    { title: '行业管理', icon: <BankOutlined style={{ fontSize: 32 }} />, path: '/admin/industries', desc: '管理行业分类和定义' },
    { title: '子行业管理', icon: <ApartmentOutlined style={{ fontSize: 32 }} />, path: '/admin/sub-industries', desc: '管理子行业数据' },
    { title: '解决方案', icon: <BulbOutlined style={{ fontSize: 32 }} />, path: '/admin/solutions', desc: '管理解决方案库' },
    { title: '用户管理', icon: <TeamOutlined style={{ fontSize: 32 }} />, path: '/admin/users', desc: '管理系统用户' },
    { title: '用例管理', icon: <FileTextOutlined style={{ fontSize: 32 }} />, path: '/specialist/use-cases', desc: '管理行业用例' },
    { title: '关联管理', icon: <LinkOutlined style={{ fontSize: 32 }} />, path: '/specialist/mappings', desc: '管理用例与方案关联' },
    { title: '客户案例', icon: <SolutionOutlined style={{ fontSize: 32 }} />, path: '/specialist/customer-cases', desc: '管理客户成功案例' },
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
      <Header style={{
        background: 'rgba(29, 29, 31, 0.95)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0 max(22px, env(safe-area-inset-left))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 66,
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}>
        <div style={{
          fontSize: 21,
          fontWeight: 600,
          color: '#f5f5f7',
          letterSpacing: '0.011em',
        }}>
          行业信息门户
        </div>
        <Space size={24}>
          <Space size={12}>
            <UserOutlined style={{ color: '#a1a1a6', fontSize: 16 }} />
            <span style={{ color: '#ffffff', fontSize: 14 }}>{user?.email}</span>
          </Space>
          <Tag style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#f5f5f7',
            border: 'none',
            borderRadius: 12,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 400,
          }}>
            {getRoleLabel(user?.role || '')}
          </Tag>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ 
              color: '#2997ff',
              fontSize: 14,
              padding: '4px 8px',
              height: 'auto',
            }}
          >
            登出
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '60px 0' }}>
        <div className="responsive-container">
          <div style={{ marginBottom: 60, textAlign: 'center' }}>
            <Title level={1} style={{ 
              marginBottom: 12, 
              color: '#1d1d1f',
              fontSize: 48,
              fontWeight: 600,
              lineHeight: 1.08349,
              letterSpacing: '-0.003em',
            }}>
              欢迎回来
            </Title>
            <Text style={{ 
              color: '#6e6e73', 
              fontSize: 21,
              lineHeight: 1.381,
              fontWeight: 400,
              letterSpacing: '0.011em',
            }}>
              {user?.role === 'admin' && '您拥有系统管理员权限，可以管理所有功能模块'}
              {user?.role === 'specialist' && '您可以管理负责行业的用例、解决方案和客户案例'}
              {user?.role === 'user' && '您可以浏览行业信息并下载相关文档'}
            </Text>
          </div>

          {hasRole(['admin', 'specialist']) && (
            <div className="responsive-grid-3">
              {adminCards.map((card) => (
                <div
                  key={card.path}
                  onClick={() => navigate(card.path)}
                  className="apple-card"
                  style={{
                    padding: 32,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ color: '#0071e3', marginBottom: 16 }}>{card.icon}</div>
                  <div style={{ 
                    fontSize: 21, 
                    fontWeight: 600, 
                    color: '#1d1d1f', 
                    marginBottom: 8,
                    letterSpacing: '0.011em',
                  }}>
                    {card.title}
                  </div>
                  <div style={{ 
                    fontSize: 17, 
                    color: '#6e6e73',
                    lineHeight: 1.47059,
                    letterSpacing: '-0.022em',
                  }}>
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>
          )}

          {user?.role === 'user' && (
            <div>
              {loadingIndustries ? (
                <div style={{ textAlign: 'center', padding: 80 }}>
                  <Spin size="large" />
                </div>
              ) : industries.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: 80,
                  background: '#f5f5f7',
                  borderRadius: 18,
                }}>
                  <BankOutlined style={{ fontSize: 56, color: '#86868b', marginBottom: 20 }} />
                  <div style={{ color: '#6e6e73', fontSize: 21 }}>
                    暂无可浏览的行业信息
                  </div>
                </div>
              ) : (
                <div className="responsive-grid-3">
                  {industries.map((industry) => (
                    <div
                      key={industry.id}
                      onClick={() => navigate(`/public/industries/${industry.id}`)}
                      className="apple-card"
                      style={{
                        padding: 0,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        height: 360,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* 图片区域 - 占 2/3 */}
                      <div style={{
                        height: '66.67%',
                        width: '100%',
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        <img
                          src={industry.imageUrl || getFallbackImage(industry.name)}
                          alt={industry.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                        />
                        {/* 渐变遮罩 */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '40%',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
                        }} />
                      </div>
                      
                      {/* 文字区域 - 占 1/3 */}
                      <div style={{
                        height: '33.33%',
                        padding: '20px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}>
                        <div style={{ 
                          fontSize: 21, 
                          fontWeight: 600, 
                          color: '#1d1d1f', 
                          marginBottom: 8,
                          letterSpacing: '0.011em',
                        }}>
                          {industry.name}
                        </div>
                        <div style={{
                          fontSize: 15,
                          color: '#6e6e73',
                          lineHeight: 1.47059,
                          letterSpacing: '-0.022em',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {industry.definition}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default HomePage
