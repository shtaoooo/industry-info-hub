import React from 'react'
import { Result, Button } from 'antd'
import { useNavigate } from 'react-router-dom'

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#fbfbfd',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #d2d2d7',
          borderRadius: 18,
          padding: '48px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        }}
      >
        <Result
          status="403"
          title={<span style={{ color: '#1d1d1f' }}>403</span>}
          subTitle={
            <span style={{ color: '#6e6e73' }}>抱歉，您没有权限访问此页面。</span>
          }
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </div>
    </div>
  )
}

export default UnauthorizedPage
