import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import IndustryManagement from './pages/admin/IndustryManagement'
import SubIndustryManagement from './pages/admin/SubIndustryManagement'
import SolutionManagement from './pages/admin/SolutionManagement'
import UserManagement from './pages/admin/UserManagement'
import UseCaseManagement from './pages/specialist/UseCaseManagement'
import Tier3SubIndustryManagement from './pages/specialist/Tier3SubIndustryManagement'
import MappingManagement from './pages/specialist/MappingManagement'
import CustomerCaseManagement from './pages/specialist/CustomerCaseManagement'
import NewsManagement from './pages/specialist/NewsManagement'
import BlogsManagement from './pages/specialist/BlogsManagement'
import SolutionDetail from './pages/public/SolutionDetail'
import IndustryDetail from './pages/public/IndustryDetail'
import SubIndustryDetail from './pages/public/SubIndustryDetail'
import UseCaseDetail from './pages/public/UseCaseDetail'
import CustomerCaseDetail from './pages/public/CustomerCaseDetail'
import NewsDetail from './pages/public/NewsDetail'
import BlogDetail from './pages/public/BlogDetail'
import NewsListPage from './pages/public/NewsListPage'
import BlogsListPage from './pages/public/BlogsListPage'
import AdminLayout from './components/AdminLayout'

// 去掉URL末尾的trailing slash，Amplify会在URL末尾加/导致React Router匹配失败
function TrailingSlashRedirect() {
  const location = useLocation()
  if (location.pathname !== '/' && location.pathname.endsWith('/')) {
    return <Navigate to={location.pathname.slice(0, -1) + location.search + location.hash} replace />
  }
  return null
}

function App() {
  useEffect(() => {
    // 禁止右键菜单
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // 禁止复制快捷键 (Ctrl+C / Cmd+C)
    const handleCopy = (e: ClipboardEvent) => {
      // 允许在输入框中复制
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return
      }
      e.preventDefault()
      return false
    }

    // 禁止选择快捷键 (Ctrl+A / Cmd+A)
    const handleSelectAll = (e: KeyboardEvent) => {
      // 允许在输入框中全选
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        return false
      }
    }

    // 禁止打印快捷键 (Ctrl+P / Cmd+P)
    const handlePrint = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        return false
      }
    }

    // 禁止保存快捷键 (Ctrl+S / Cmd+S)
    const handleSave = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        return false
      }
    }

    // 禁止查看源代码快捷键 (Ctrl+U / Cmd+U)
    const handleViewSource = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault()
        return false
      }
    }

    // 禁止开发者工具快捷键 (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
    const handleDevTools = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c'))
      ) {
        e.preventDefault()
        return false
      }
    }

    // 添加事件监听
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('keydown', handleSelectAll)
    document.addEventListener('keydown', handlePrint)
    document.addEventListener('keydown', handleSave)
    document.addEventListener('keydown', handleViewSource)
    document.addEventListener('keydown', handleDevTools)

    // 清理函数
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('keydown', handleSelectAll)
      document.removeEventListener('keydown', handlePrint)
      document.removeEventListener('keydown', handleSave)
      document.removeEventListener('keydown', handleViewSource)
      document.removeEventListener('keydown', handleDevTools)
    }
  }, [])

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorText: '#1d1d1f',
          colorTextSecondary: '#6e6e73',
          colorTextTertiary: '#86868b',
          colorTextQuaternary: '#aeaeb2',
          colorBgLayout: '#fbfbfd',
          colorBgContainer: '#ffffff',
          colorPrimary: '#0071e3',
          colorBorder: '#d2d2d7',
          colorBorderSecondary: '#e5e5ea',
        },
      }}
    >
      <Router>
        <AuthProvider>
          <TrailingSlashRedirect />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/admin/industries"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout>
                    <IndustryManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sub-industries"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout>
                    <SubIndustryManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/solutions"
              element={
                <ProtectedRoute requiredRole={['admin', 'specialist']}>
                  <AdminLayout>
                    <SolutionManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout>
                    <UserManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/specialist/use-cases"
              element={
                <ProtectedRoute requiredRole={['admin', 'specialist']}>
                  <AdminLayout>
                    <UseCaseManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/specialist/tier3-sub-industries"
              element={
                <ProtectedRoute requiredRole={['admin', 'specialist']}>
                  <AdminLayout>
                    <Tier3SubIndustryManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/specialist/mappings"
              element={
                <ProtectedRoute requiredRole={['admin', 'specialist']}>
                  <AdminLayout>
                    <MappingManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/specialist/customer-cases"
              element={
                <ProtectedRoute requiredRole={['admin', 'specialist']}>
                  <AdminLayout>
                    <CustomerCaseManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/specialist/news"
              element={
                <ProtectedRoute requiredRole={['admin', 'specialist']}>
                  <AdminLayout>
                    <NewsManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/specialist/blogs"
              element={
                <ProtectedRoute requiredRole={['admin', 'specialist']}>
                  <AdminLayout>
                    <BlogsManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/public/solutions/:id" element={<SolutionDetail />} />
            <Route path="/public/industries/:id" element={<IndustryDetail />} />
            <Route path="/public/sub-industries/:id" element={<SubIndustryDetail />} />
            <Route path="/public/use-cases/:id" element={<UseCaseDetail />} />
            <Route path="/public/customer-cases/:id" element={<CustomerCaseDetail />} />
            <Route path="/public/news/:id" element={<NewsDetail />} />
            <Route path="/public/blogs/:id" element={<BlogDetail />} />
            <Route path="/public/industries/:id/news" element={<NewsListPage />} />
            <Route path="/public/industries/:id/blogs" element={<BlogsListPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ConfigProvider>
  )
}

export default App
