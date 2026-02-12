import React from 'react'
import { Layout, Button, Typography, Space, Tag } from 'antd'
import {
  LogoutOutlined, UserOutlined, BankOutlined,
  ApartmentOutlined, BulbOutlined, FileTextOutlined,
  LinkOutlined, SolutionOutlined, TeamOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const { Header, Content } = Layout
const { Title, Text } = Typography

const HomePage: React.FC = () => {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

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
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 60,
      }}>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          background: 'linear-gradient(135deg, #667eea, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          行业信息门户
        </div>
        <Space>
          <UserOutlined style={{ color: 'rgba(255,255,255,0.65)' }} />
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{user?.email}</Text>
          <Tag style={{
            background: 'rgba(102, 126, 234, 0.2)',
            color: '#a8b4f8',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: 6,
          }}>
            {getRoleLabel(user?.role || '')}
          </Tag>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            登出
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 40 }}>
            <Title level={2} style={{ marginBottom: 8 }}>
              欢迎回来，{user?.email}
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>
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
                    background: 'rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 16,
                    padding: 24,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.4)'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ color: '#8b9cf7', marginBottom: 12 }}>{card.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default HomePage
