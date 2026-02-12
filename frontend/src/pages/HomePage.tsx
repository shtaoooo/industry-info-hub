import React from 'react'
import { Layout, Button, Typography, Card, Space, Tag } from 'antd'
import { LogoutOutlined, UserOutlined, BankOutlined } from '@ant-design/icons'
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
      case 'admin':
        return '管理员'
      case 'specialist':
        return '行业专员'
      case 'user':
        return '普通用户'
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'red'
      case 'specialist':
        return 'blue'
      case 'user':
        return 'green'
      default:
        return 'default'
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Title level={3} style={{ margin: 0 }}>行业信息门户</Title>
        <Space>
          <UserOutlined />
          <Text>{user?.email}</Text>
          <Tag color={getRoleColor(user?.role || '')}>{getRoleLabel(user?.role || '')}</Tag>
          <Button 
            type="primary" 
            danger 
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            登出
          </Button>
        </Space>
      </Header>
      
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={2}>欢迎使用行业信息门户</Title>
              <Text type="secondary">您已成功登录系统</Text>
            </div>
            
            <div>
              <Title level={4}>用户信息</Title>
              <Space direction="vertical">
                <Text><strong>用户ID:</strong> {user?.userId}</Text>
                <Text><strong>邮箱:</strong> {user?.email}</Text>
                <Text><strong>角色:</strong> <Tag color={getRoleColor(user?.role || '')}>{getRoleLabel(user?.role || '')}</Tag></Text>
                {user?.role === 'specialist' && user?.assignedIndustries && (
                  <Text><strong>负责行业:</strong> {user.assignedIndustries.join(', ')}</Text>
                )}
              </Space>
            </div>

            {hasRole('admin') && (
              <div>
                <Title level={4}>管理功能</Title>
                <Space>
                  <Button
                    type="primary"
                    icon={<BankOutlined />}
                    onClick={() => navigate('/admin/industries')}
                  >
                    行业管理
                  </Button>
                </Space>
              </div>
            )}

            <div>
              <Title level={4}>权限说明</Title>
              {user?.role === 'admin' && (
                <Text>作为管理员，您可以管理所有行业数据、用户和系统配置。</Text>
              )}
              {user?.role === 'specialist' && (
                <Text>作为行业专员，您可以管理您负责行业的用例、解决方案和客户案例。</Text>
              )}
              {user?.role === 'user' && (
                <Text>作为普通用户，您可以浏览行业信息并下载相关文档。</Text>
              )}
            </div>
          </Space>
        </Card>
      </Content>
    </Layout>
  )
}

export default HomePage
