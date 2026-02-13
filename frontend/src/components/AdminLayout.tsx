import React from 'react'
import { Layout, Menu, Button, Space, Tag } from 'antd'
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
    <Layout style={{ minHeight: '100vh', background: '#fbfbfd' }}>
      <Sider
        width={220}
        style={{
          background: '#ffffff',
          borderRight: '1px solid #d2d2d7',
        }}
      >
        <div style={{
          padding: '20px 16px',
          textAlign: 'center',
          borderBottom: '1px solid #d2d2d7',
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#1d1d1f',
            letterSpacing: 0.5,
          }}>
            管理后台
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            marginTop: 8,
          }}
        />
      </Sider>
      <Layout style={{ background: '#fbfbfd' }}>
        <Header style={{
          background: '#ffffff',
          borderBottom: '1px solid #d2d2d7',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          height: 56,
        }}>
          <Space>
            <UserOutlined style={{ color: '#86868b', fontSize: 16 }} />
            <span style={{ color: '#1d1d1f', fontSize: 14 }}>{user?.email}</span>
            <Tag
              style={{
                background: '#f5f5f7',
                color: '#1d1d1f',
                border: '1px solid #d2d2d7',
                borderRadius: 12,
                padding: '4px 12px',
                fontSize: 12,
              }}
            >
              管理员
            </Tag>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ color: '#0071e3', fontSize: 14 }}
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
