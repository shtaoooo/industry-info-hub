# 认证和授权系统文档

## 概述

行业信息门户的认证和授权系统基于AWS Cognito实现，支持三种用户角色：
- **管理员 (admin)**: 具有最高权限，可以管理所有数据和用户
- **行业专员 (specialist)**: 可以管理分配给他们的特定行业的内容
- **普通用户 (user)**: 只能浏览和下载公开信息

## 架构组件

### 前端组件

#### 1. AuthContext (`frontend/src/contexts/AuthContext.tsx`)
认证上下文提供者，管理用户登录状态和权限检查。

**主要功能:**
- `login(email, password)`: 用户登录
- `logout()`: 用户登出
- `hasRole(role)`: 检查用户是否具有指定角色
- `hasIndustryAccess(industryId)`: 检查用户是否有权访问特定行业
- `refreshUser()`: 刷新用户信息

**使用示例:**
```typescript
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, hasRole, logout } = useAuth()
  
  if (!isAuthenticated) {
    return <div>请登录</div>
  }
  
  if (hasRole('admin')) {
    return <div>管理员界面</div>
  }
  
  return <div>普通用户界面</div>
}
```

#### 2. ProtectedRoute (`frontend/src/components/ProtectedRoute.tsx`)
路由守卫组件，保护需要认证的页面。

**使用示例:**
```typescript
<Route 
  path="/admin" 
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminPage />
    </ProtectedRoute>
  } 
/>

<Route 
  path="/specialist" 
  element={
    <ProtectedRoute requiredRole={['admin', 'specialist']}>
      <SpecialistPage />
    </ProtectedRoute>
  } 
/>
```

#### 3. LoginPage (`frontend/src/pages/LoginPage.tsx`)
用户登录页面，提供邮箱和密码登录表单。

### 后端组件

#### 1. 认证工具 (`backend/src/utils/auth.ts`)
提供认证和授权相关的工具函数。

**主要函数:**
- `getUserFromEvent(event)`: 从API Gateway事件中提取用户信息
- `hasRole(user, role)`: 检查用户角色
- `hasIndustryAccess(user, industryId)`: 检查行业访问权限
- `requireRole(user, role)`: 要求特定角色，否则抛出错误
- `requireIndustryAccess(user, industryId)`: 要求行业访问权限，否则抛出错误
- `createCognitoUser()`: 创建Cognito用户
- `updateCognitoUser()`: 更新Cognito用户
- `deleteCognitoUser()`: 删除Cognito用户

**使用示例:**
```typescript
import { getUserFromEvent, requireRole } from '../utils/auth'

export async function handler(event: APIGatewayProxyEvent) {
  const user = getUserFromEvent(event)
  requireRole(user, 'admin') // 仅管理员可访问
  
  // 处理请求...
}
```

#### 2. 用户管理函数 (`backend/src/functions/userManagement.ts`)
Lambda函数，用于管理用户账户。

**API端点:**
- `POST /admin/users` - 创建用户
- `GET /admin/users` - 列出所有用户
- `GET /admin/users/{userId}` - 获取用户详情
- `PUT /admin/users/{userId}` - 更新用户
- `DELETE /admin/users/{userId}` - 删除用户

## 用户角色和权限

### 管理员 (admin)
- 管理所有行业和子行业
- 管理解决方案
- 管理用户账户和权限
- 访问所有数据

### 行业专员 (specialist)
- 管理分配给他们的行业的用例
- 管理客户案例
- 关联解决方案和用例
- 上传文档
- **限制**: 只能访问分配的行业

### 普通用户 (user)
- 浏览可见的行业信息
- 查看用例和解决方案
- 下载文档
- **限制**: 无法修改任何数据

## Cognito配置

### 用户属性
- `email`: 用户邮箱（必需）
- `custom:role`: 用户角色（admin/specialist/user）
- `custom:assignedIndustries`: 行业专员分配的行业列表（JSON数组）

### 密码策略
- 最少8个字符
- 包含大写字母
- 包含小写字母
- 包含数字
- 包含特殊字符

### Token配置
- Access Token: 1小时
- Refresh Token: 30天

## 环境变量

### 前端 (`.env`)
```
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_IDENTITY_POOL_ID=us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
VITE_API_ENDPOINT=https://api.example.com
VITE_AWS_REGION=us-east-1
```

### 后端 (Lambda环境变量)
```
USER_POOL_ID=us-east-1_XXXXXXXXX
AWS_REGION=us-east-1
USERS_TABLE=IndustryPortal-Users
```

## 安全考虑

1. **传输加密**: 所有API调用使用HTTPS
2. **Token验证**: API Gateway使用Cognito授权器验证JWT token
3. **角色检查**: Lambda函数在处理请求前验证用户角色
4. **行业权限**: 行业专员只能访问分配的行业
5. **密码安全**: Cognito强制执行密码策略
6. **MFA支持**: 可选启用多因素认证

## 测试

### 后端测试
```bash
cd backend
npm test
```

测试覆盖:
- 角色检查逻辑
- 行业访问权限检查
- 权限验证函数

### 前端测试
```bash
cd frontend
npm test
```

测试覆盖:
- 角色匹配逻辑
- 行业访问逻辑

## 部署后配置

1. **创建Cognito用户池**
   - 在AWS控制台创建用户池
   - 配置自定义属性: `custom:role`, `custom:assignedIndustries`
   - 创建应用客户端

2. **更新环境变量**
   - 更新前端`.env`文件
   - 更新Lambda函数环境变量

3. **创建初始管理员用户**
   ```bash
   aws cognito-idp admin-create-user \
     --user-pool-id <USER_POOL_ID> \
     --username admin@example.com \
     --user-attributes Name=email,Value=admin@example.com \
                       Name=email_verified,Value=true \
                       Name=custom:role,Value=admin \
     --temporary-password <TEMP_PASSWORD>
   ```

4. **配置API Gateway授权器**
   - 创建Cognito授权器
   - 将授权器应用到所有需要认证的API端点

## 故障排除

### 登录失败
- 检查Cognito用户池ID和客户端ID是否正确
- 确认用户账户已创建且邮箱已验证
- 检查密码是否符合策略要求

### 权限错误
- 确认用户的`custom:role`属性已正确设置
- 对于行业专员，检查`custom:assignedIndustries`是否包含目标行业ID
- 检查Lambda函数是否正确提取用户信息

### Token过期
- 前端会自动使用refresh token刷新access token
- 如果refresh token过期，用户需要重新登录

## 相关需求

本实现满足以下需求:
- **需求 9.1**: 创建用户并指定角色
- **需求 9.2**: 为行业专员分配行业权限
- **需求 9.3**: 验证用户身份和角色权限
- **需求 9.4**: 权限不足时拒绝访问
- **需求 9.5**: 修改用户角色并立即生效
