import React from 'react'
import { Layout, Menu, Button, Typography, Space, Tag } from 'antd'
import {
  BankOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  ApartmentOutlined,
  BulbOutlined,
  FileTextOutlined,
  LinkOutlined,
  SolutionOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface AdminLayoutProps {
  children: React.ReactNode
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/admin/industries', icon: <BankOutlined />, label: '行业管理' },
    { key: '/admin/sub-industries', icon: <ApartmentOutlined />, label: '子行业管理' },
    { key: '/admin/solutions', icon: <BulbOutlined />, label: '解决方案管理' },
    { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
    { key: '/specialist/use-cases', icon: <FileTextOutlined />, label: '用例管理' },
    { key: '/specialist/mappings', icon: <LinkOutlined />, label: '关联管理' },
    { key: '/specialist/customer-cases', icon: <SolutionOutlined />, label: '客户案例管理' },
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sider
        className="glass-sidebar"
        width={220}
        style={{
          background: 'rgba(15, 12, 41, 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{
          padding: '20px 16px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 2,
          }}>
            管理后台
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', border: 'none', marginTop: 8 }}
        />
      </Sider>
      <Layout style={{ background: 'transparent' }}>
        <Header style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          height: 56,
        }}>
          <Space>
            <UserOutlined style={{ color: 'rgba(255,255,255,0.65)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{user?.email}</Text>
            <Tag
              style={{
                background: 'rgba(102, 126, 234, 0.2)',
                color: '#a8b4f8',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: 6,
              }}
            >
              管理员
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
        <Content style={{ margin: 24 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout
