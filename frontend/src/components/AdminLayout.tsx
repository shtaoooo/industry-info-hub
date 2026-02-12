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
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/admin/industries',
      icon: <BankOutlined />,
      label: '行业管理',
    },
    {
      key: '/admin/sub-industries',
      icon: <ApartmentOutlined />,
      label: '子行业管理',
    },
    {
      key: '/admin/solutions',
      icon: <BulbOutlined />,
      label: '解决方案管理',
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: '用户管理',
    },
    {
      key: '/specialist/use-cases',
      icon: <FileTextOutlined />,
      label: '用例管理',
    },
    {
      key: '/specialist/mappings',
      icon: <LinkOutlined />,
      label: '关联管理',
    },
    {
      key: '/specialist/customer-cases',
      icon: <SolutionOutlined />,
      label: '客户案例管理',
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={200}>
        <div style={{ padding: '16px', textAlign: 'center', color: '#fff' }}>
          <Typography.Title level={5} style={{ color: '#fff', margin: 0 }}>
            管理后台
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <Space>
            <UserOutlined />
            <Text>{user?.email}</Text>
            <Tag color="red">管理员</Tag>
            <Button type="text" danger icon={<LogoutOutlined />} onClick={handleLogout}>
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
