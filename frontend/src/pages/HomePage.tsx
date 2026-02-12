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

// 行业图片映射 - 作为 fallback 使用
const getFallbackImage = (industryName: string): string => {
  const imageMap: { [key: string]: string } = {
    // 金融服务 - 股票交易大厅/金融数据
    '金融': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=85',
    
    // 制造业 - 现代化工厂生产线
    '制造': 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1200&q=85',
    
    // 零售 - 现代购物中心
    '零售': 'https://images.unsplash.com/photo-1555529902-5261145633bf?w=1200&q=85',
    
    // 医疗健康 - 医疗科技/医生
    '医疗': 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&q=85',
    
    // 教育 - 现代教室/学习
    '教育': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=85',
    
    // 物流运输 - 集装箱港口/物流中心
    '物流': 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=1200&q=85',
    
    // 能源 - 太阳能板/风力发电
    '能源': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=85',
    
    // 电信 - 通信塔/5G网络
    '电信': 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=1200&q=85',
    
    // 房地产 - 现代建筑/摩天大楼
    '房地产': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=85',
    
    // 汽车 - 现代汽车生产线
    '汽车': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&q=85',
    
    // 农业 - 现代农业科技
    '农业': 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&q=85',
    
    // 旅游酒店 - 豪华酒店/度假村
    '旅游': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85',
    
    // 媒体娱乐 - 影视制作/媒体中心
    '媒体': 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1200&q=85',
    
    // 科技 - 数据中心/科技办公室
    '科技': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=85',
    
    // 政府公共服务 - 政府建筑
    '政府': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=85',
    
    // 保险 - 保护伞/安全概念
    '保险': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=85',
    
    // 航空航天 - 飞机/航空
    '航空': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=85',
    
    // 化工 - 化工厂/实验室
    '化工': 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1200&q=85',
    
    // 建筑工程 - 建筑工地/施工
    '建筑': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=85',
    
    // 专业服务 - 商务会议/咨询
    '专业': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=85',
    
    // 食品饮料 - 食品生产
    '食品': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=85',
    
    // 纺织服装 - 服装设计/时尚
    '服装': 'https://images.unsplash.com/photo-1558769132-cb1aea1f1f57?w=1200&q=85',
  }
  
  // 尝试匹配行业名称中的关键词
  for (const [key, value] of Object.entries(imageMap)) {
    if (industryName.includes(key)) {
      return value
    }
  }
  
  // 默认图片
  return 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85'
}

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
          fontSize: 21,
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
                        padding: 0,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        height: 360,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* 图片区域 - 占 2/3 */}
                      <div style={{
                        height: '66.67%',
                        width: '100%',
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        <img
                          src={industry.imageUrl || getFallbackImage(industry.name)}
                          alt={industry.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                        />
                        {/* 渐变遮罩 */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '40%',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
                        }} />
                      </div>
                      
                      {/* 文字区域 - 占 1/3 */}
                      <div style={{
                        height: '33.33%',
                        padding: '20px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}>
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
                          fontSize: 15,
                          color: '#6e6e73',
                          lineHeight: 1.47059,
                          letterSpacing: '-0.022em',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {industry.definition}
                        </div>
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
