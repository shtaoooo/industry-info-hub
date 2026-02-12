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

const HomePage: React.FC = () => {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const [industries, setIndustries] = useState<PublicIndustry[]>([])
  const [loadingIndustries, setLoadingIndustries] = useState(false)

  useEffect(() => {
    // Load industries for regular users
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
    { title: '行业管理', icon: <BankOutlined style={{ fontSize: 28 }} />, path: '/admin/industries', desc: '管理行业分类和定义' },
    { title: '子行业管理', icon: <ApartmentOutlined style={{ fontSize: 28 }} />, path: '/admin/sub-industries', desc: '管理子行业数据' },
    { title: '解决方案', icon: <BulbOutlined style={{ fontSize: 28 }} />, path: '/admin/solutions', desc: '管理解决方案库' },
    { title: '用户管理', icon: <TeamOutlined style={{ fontSize: 28 }} />, path: '/admin/users', desc: '管理系统用户' },
    { title: '用例管理', icon: <FileTextOutlined style={{ fontSize: 28 }} />, path: '/specialist/use-cases', desc: '管理行业用例' },
    { title: '关联管理', icon: <LinkOutlined style={{ fontSize: 28 }} />, path: '/specialist/mappings', desc: '管理用例与方案关联' },
    { title: '客户案例', icon: <SolutionOutlined style={{ fontSize: 28 }} />, path: '/specialist/customer-cases', desc: '管理客户成功案例' },
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Header style={{
        background: '#fff',
        borderBottom: '1px solid #f0e6dc',
        padding: '0 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 60,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          行业信息门户
        </div>
        <Space>
          <UserOutlined style={{ color: '#92400e' }} />
          <Text style={{ color: '#78350f' }}>{user?.email}</Text>
          <Tag style={{
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fde68a',
            borderRadius: 6,
          }}>
            {getRoleLabel(user?.role || '')}
          </Tag>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ color: '#92400e' }}
          >
            登出
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 40 }}>
            <Title level={2} style={{ marginBottom: 8, color: '#78350f' }}>
              欢迎回来，{user?.email}
            </Title>
            <Text style={{ color: '#92400e', fontSize: 16 }}>
              {user?.role === 'admin' && '您拥有系统管理员权限，可以管理所有功能模块。'}
              {user?.role === 'specialist' && '您可以管理负责行业的用例、解决方案和客户案例。'}
              {user?.role === 'user' && '您可以浏览行业信息并下载相关文档。'}
            </Text>
          </div>

          {hasRole(['admin', 'specialist']) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}>
              {adminCards.map((card) => (
                <div
                  key={card.path}
                  onClick={() => navigate(card.path)}
                  style={{
                    background: '#fff',
                    border: '1px solid #fed7aa',
                    borderRadius: 16,
                    padding: 24,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(251, 146, 60, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fffbeb'
                    e.currentTarget.style.borderColor = '#fb923c'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(251, 146, 60, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                    e.currentTarget.style.borderColor = '#fed7aa'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(251, 146, 60, 0.1)'
                  }}
                >
                  <div style={{ color: '#f59e0b', marginBottom: 12 }}>{card.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#78350f', marginBottom: 6 }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#92400e' }}>
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>
          )}

          {user?.role === 'user' && (
            <div>
              {loadingIndustries ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <Spin size="large" />
                </div>
              ) : industries.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: 60,
                  background: '#fef3c7',
                  borderRadius: 16,
                  border: '1px solid #fde68a',
                }}>
                  <BankOutlined style={{ fontSize: 48, color: '#d97706', marginBottom: 16 }} />
                  <div style={{ color: '#92400e', fontSize: 16 }}>
                    暂无可浏览的行业信息
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 20,
                }}>
                  {industries.map((industry) => (
                    <div
                      key={industry.id}
                      onClick={() => navigate(`/public/industries/${industry.id}`)}
                      style={{
                        background: '#fff',
                        border: '1px solid #fed7aa',
                        borderRadius: 16,
                        padding: 24,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(251, 146, 60, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fffbeb'
                        e.currentTarget.style.borderColor = '#fb923c'
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(251, 146, 60, 0.2)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff'
                        e.currentTarget.style.borderColor = '#fed7aa'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(251, 146, 60, 0.1)'
                      }}
                    >
                      <div style={{ color: '#f59e0b', marginBottom: 12 }}>
                        <BankOutlined style={{ fontSize: 28 }} />
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#78350f', marginBottom: 8 }}>
                        {industry.name}
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: '#92400e',
                        lineHeight: '1.6',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {industry.definition}
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
