import React, { useState, useEffect } from 'react'
import { Form, Input, Button, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const { Title } = Typography

interface LoginFormValues {
  email: string
  password: string
}

interface NewPasswordFormValues {
  newPassword: string
  confirmPassword: string
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const { login, confirmNewPassword, isAuthenticated, needsNewPassword } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const onLoginFinish = async (values: LoginFormValues) => {
    setLoading(true)
    try {
      await login(values.email, values.password)
      if (!needsNewPassword) {
        message.success('登录成功')
      }
    } catch (error: any) {
      console.error('Login failed:', error)
      message.error(error.message || '登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  const onNewPasswordFinish = async (values: NewPasswordFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      await confirmNewPassword(values.newPassword)
      message.success('密码设置成功，已登录')
    } catch (error: any) {
      console.error('Set new password failed:', error)
      message.error(error.message || '密码设置失败')
    } finally {
      setLoading(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    width: 420,
    background: 'rgba(255, 255, 255, 0.07)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: '48px 36px 36px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'transparent',
    }}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56,
            height: 56,
            margin: '0 auto 16px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
          }}>
            <LockOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <Title level={2} style={{ margin: 0, color: '#fff' }}>
            行业信息门户
          </Title>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: 8 }}>
            {needsNewPassword ? '首次登录，请设置新密码' : '请登录您的账户'}
          </p>
        </div>

        {needsNewPassword ? (
          <Form name="newPassword" onFinish={onNewPasswordFinish} autoComplete="off" size="large">
            <Form.Item
              name="newPassword"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 8, message: '密码至少8位' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
                  message: '需包含大小写字母、数字和特殊字符'
                }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              rules={[{ required: true, message: '请确认新密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="确认新密码" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} block
                style={{ height: 44, fontSize: 15, fontWeight: 600 }}>
                设置新密码
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form name="login" onFinish={onLoginFinish} autoComplete="off" size="large">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="邮箱地址" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} block
                style={{ height: 44, fontSize: 15, fontWeight: 600 }}>
                登录
              </Button>
            </Form.Item>
          </Form>
        )}
      </div>
    </div>
  )
}

export default LoginPage
