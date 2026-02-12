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

// 行业图片映射 - 使用高质量的 Unsplash 图片
const getIndustryImage = (industryName: string): string => {
  const imageMap: { [key: string]: string } = {
    '金融': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
    '制造': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
    '零售': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    '医疗': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    '教育': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
    '物流': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
    '能源': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80',
    '电信': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    '房地产': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    '汽车': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
    '农业': 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80',
    '旅游': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
    '媒体': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
    '科技': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  }
  
  // 尝试匹配行业名称中的关键词
  for (const [key, value] of Object.entries(imageMap)) {
    if (industryName.includes(key)) {
      return value
    }
  }
  
  // 默认图片
  return 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'
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
        background: 'rgba(251, 251, 253, 0.8)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        padding: '0 max(22px, env(safe-area-inset-left))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 44,
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}>
        <div style={{
          fontSize: 21,
          fontWeight: 600,
          color: '#1d1d1f',
          letterSpacing: '0.011em',
        }}>
          行业信息门户
        </div>
        <Space size={24}>
          <Space size={12}>
            <UserOutlined style={{ color: '#6e6e73', fontSize: 16 }} />
            <Text style={{ color: '#1d1d1f', fontSize: 14 }}>{user?.email}</Text>
          </Space>
          <Tag style={{
            background: '#f5f5f7',
            color: '#1d1d1f',
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
              color: '#0071e3',
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
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 22px' }}>
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 24,
            }}>
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
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 24,
                }}>
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
                          src={getIndustryImage(industry.name)}
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
