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
          fontSize: 21px,
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
                        padding: 32,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ color: '#0071e3', marginBottom: 16 }}>
                        <BankOutlined style={{ fontSize: 32 }} />
                      </div>
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
                        fontSize: 17,
                        color: '#6e6e73',
                        lineHeight: 1.47059,
                        letterSpacing: '-0.022em',
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
