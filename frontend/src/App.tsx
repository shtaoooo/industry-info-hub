import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
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
import MappingManagement from './pages/specialist/MappingManagement'
import CustomerCaseManagement from './pages/specialist/CustomerCaseManagement'
import NewsManagement from './pages/specialist/NewsManagement'
import BlogsManagement from './pages/specialist/BlogsManagement'
import SolutionDetail from './pages/public/SolutionDetail'
import IndustryDetail from './pages/public/IndustryDetail'
import SubIndustryDetail from './pages/public/SubIndustryDetail'
import UseCaseDetail from './pages/public/UseCaseDetail'
import NewsDetail from './pages/public/NewsDetail'
import BlogDetail from './pages/public/BlogDetail'
import AdminLayout from './components/AdminLayout'

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <AuthProvider>
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
            <Route path="/public/news/:id" element={<NewsDetail />} />
            <Route path="/public/blogs/:id" element={<BlogDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ConfigProvider>
  )
}

export default App
