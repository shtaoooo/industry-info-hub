import React from 'react'
import { Result, Button } from 'antd'
import { useNavigate } from 'react-router-dom'

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'transparent',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        padding: '48px',
      }}>
        <Result
          status="403"
          title={<span style={{ color: '#fff' }}>403</span>}
          subTitle={<span style={{ color: 'rgba(255,255,255,0.55)' }}>抱歉，您没有权限访问此页面。</span>}
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
