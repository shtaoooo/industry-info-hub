# 项目结构说明 (Project Structure)

## 目录结构

```
industry-portal/
│
├── .kiro/                          # Kiro 规范文档
│   └── specs/
│       └── industry-portal/
│           ├── requirements.md     # 需求文档
│           ├── design.md          # 设计文档
│           └── tasks.md           # 任务列表
│
├── frontend/                       # React 前端应用
│   ├── src/
│   │   ├── components/            # 可复用组件
│   │   │   ├── auth/             # 认证相关组件
│   │   │   ├── admin/            # 管理员组件
│   │   │   ├── specialist/       # 行业专员组件
│   │   │   ├── public/           # 公共浏览组件
│   │   │   └── common/           # 通用组件
│   │   │
│   │   ├── pages/                # 页面组件
│   │   │   ├── LoginPage.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── SpecialistDashboard.tsx
│   │   │   └── PublicBrowser.tsx
│   │   │
│   │   ├── contexts/             # React Context
│   │   │   ├── AuthContext.tsx
│   │   │   └── AppContext.tsx
│   │   │
│   │   ├── services/             # API 服务层
│   │   │   ├── api.ts           # API 客户端配置
│   │   │   ├── authService.ts
│   │   │   ├── industryService.ts
│   │   │   ├── useCaseService.ts
│   │   │   └── documentService.ts
│   │   │
│   │   ├── types/                # TypeScript 类型定义
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                # 工具函数
│   │   │   ├── validation.ts
│   │   │   ├── formatting.ts
│   │   │   └── helpers.ts
│   │   │
│   │   ├── test/                 # 测试配置
│   │   │   └── setup.ts
│   │   │
│   │   ├── App.tsx               # 根组件
│   │   ├── main.tsx              # 入口文件
│   │   ├── index.css             # 全局样式
│   │   └── aws-exports.ts        # AWS 配置
│   │
│   ├── public/                   # 静态资源
│   ├── .env.example              # 环境变量模板
│   ├── index.html                # HTML 模板
│   ├── package.json              # 依赖配置
│   ├── tsconfig.json             # TypeScript 配置
│   ├── vite.config.ts            # Vite 配置
│   └── vitest.config.ts          # Vitest 配置
│
├── backend/                       # Lambda 后端
│   ├── src/
│   │   ├── functions/            # Lambda 函数
│   │   │   ├── industries/      # 行业管理函数
│   │   │   │   ├── create.ts
│   │   │   │   ├── update.ts
│   │   │   │   ├── delete.ts
│   │   │   │   ├── list.ts
│   │   │   │   └── importCSV.ts
│   │   │   │
│   │   │   ├── subIndustries/   # 子行业管理函数
│   │   │   ├── useCases/        # 用例管理函数
│   │   │   ├── solutions/       # 解决方案管理函数
│   │   │   ├── customerCases/   # 客户案例管理函数
│   │   │   ├── documents/       # 文档管理函数
│   │   │   └── users/           # 用户管理函数
│   │   │
│   │   ├── types/               # TypeScript 类型
│   │   │   └── index.ts
│   │   │
│   │   └── utils/               # 工具函数
│   │       ├── dynamodb.ts      # DynamoDB 客户端
│   │       ├── s3.ts            # S3 客户端
│   │       ├── response.ts      # 响应格式化
│   │       ├── validation.ts    # 输入验证
│   │       └── auth.ts          # 认证工具
│   │
│   ├── template.yaml             # AWS SAM 模板
│   ├── samconfig.toml            # SAM 配置
│   ├── package.json              # 依赖配置
│   ├── tsconfig.json             # TypeScript 配置
│   └── vitest.config.ts          # Vitest 配置
│
├── .gitignore                    # Git 忽略文件
├── README.md                     # 项目说明
├── DEPLOYMENT.md                 # 部署指南
├── PROJECT_STRUCTURE.md          # 本文件
├── setup.sh                      # Linux/Mac 初始化脚本
└── setup.bat                     # Windows 初始化脚本
```

## 核心文件说明

### 前端核心文件

#### `frontend/src/main.tsx`
应用入口文件，负责渲染根组件。

#### `frontend/src/App.tsx`
根组件，配置路由和全局状态。

#### `frontend/src/aws-exports.ts`
AWS Amplify 配置文件，包含 Cognito、API Gateway 和 S3 的配置。

#### `frontend/vite.config.ts`
Vite 构建工具配置，包括插件和测试配置。

### 后端核心文件

#### `backend/template.yaml`
AWS SAM 模板，定义所有 AWS 资源：
- DynamoDB 表
- S3 存储桶
- Cognito 用户池
- API Gateway
- Lambda 函数

#### `backend/src/utils/dynamodb.ts`
DynamoDB 客户端配置和表名常量。

#### `backend/src/utils/s3.ts`
S3 客户端配置和存储路径常量。

#### `backend/src/utils/response.ts`
统一的 API 响应格式化函数。

## AWS 资源

### DynamoDB 表

1. **IndustryPortal-Industries**
   - 存储行业信息
   - PK: `INDUSTRY#{industryId}`
   - SK: `METADATA`

2. **IndustryPortal-SubIndustries**
   - 存储子行业信息
   - PK: `INDUSTRY#{industryId}`
   - SK: `SUBINDUSTRY#{subIndustryId}`

3. **IndustryPortal-UseCases**
   - 存储用例信息
   - PK: `SUBINDUSTRY#{subIndustryId}`
   - SK: `USECASE#{useCaseId}`

4. **IndustryPortal-Solutions**
   - 存储解决方案信息
   - PK: `SOLUTION#{solutionId}`
   - SK: `METADATA`

5. **IndustryPortal-UseCaseSolutionMapping**
   - 存储用例-解决方案关联
   - PK: `USECASE#{useCaseId}`
   - SK: `SOLUTION#{solutionId}`
   - GSI: 反向索引支持双向查询

6. **IndustryPortal-CustomerCases**
   - 存储客户案例信息
   - PK: `SOLUTION#{solutionId}`
   - SK: `CUSTOMERCASE#{customerCaseId}`

7. **IndustryPortal-Users**
   - 存储用户扩展信息
   - PK: `USER#{userId}`
   - SK: `METADATA`

### S3 存储结构

```
industry-portal-documents-{AccountId}/
├── use-cases/
│   └── {useCaseId}/
│       └── {documentId}-{filename}
├── solutions/
│   └── {solutionId}/
│       ├── detail.md
│       └── {documentId}-{filename}
└── customer-cases/
    └── {customerCaseId}/
        └── {documentId}-{filename}
```

### Cognito 配置

- **User Pool**: 管理用户身份
- **User Pool Client**: Web 应用客户端
- **Identity Pool**: 提供 AWS 资源访问凭证

用户属性：
- `email`: 邮箱（必需）
- `custom:role`: 用户角色（admin/specialist/user）
- `custom:assignedIndustries`: 行业专员的授权行业列表

## 开发工作流

### 1. 本地开发

```bash
# 前端开发
cd frontend
npm run dev

# 后端测试
cd backend
npm test
```

### 2. 添加新功能

1. 更新 `backend/template.yaml` 添加新的 Lambda 函数
2. 在 `backend/src/functions/` 创建函数代码
3. 在 `frontend/src/services/` 添加 API 调用
4. 在 `frontend/src/components/` 创建 UI 组件
5. 编写测试

### 3. 部署

```bash
# 部署后端
cd backend
sam build
sam deploy

# 部署前端
cd frontend
npm run build
# 通过 Amplify 自动部署或手动上传到 S3
```

## 测试策略

### 单元测试
- 使用 Vitest
- 测试独立函数和组件
- 位置：`*.test.ts` 或 `*.test.tsx`

### 属性测试
- 使用 fast-check
- 验证正确性属性
- 每个属性至少 100 次迭代

### 集成测试
- 测试 API 端到端流程
- 使用 LocalStack 模拟 AWS 服务

## 环境变量

### 前端环境变量 (`.env`)

```
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_IDENTITY_POOL_ID=us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
VITE_API_ENDPOINT=https://api.example.com
VITE_S3_BUCKET=industry-portal-documents
```

### 后端环境变量

由 SAM 模板自动注入到 Lambda 函数：
- `INDUSTRIES_TABLE`
- `SUB_INDUSTRIES_TABLE`
- `USE_CASES_TABLE`
- `SOLUTIONS_TABLE`
- `MAPPING_TABLE`
- `CUSTOMER_CASES_TABLE`
- `USERS_TABLE`
- `DOCUMENTS_BUCKET`

## 代码规范

### TypeScript
- 使用严格模式
- 所有函数必须有类型注解
- 避免使用 `any`

### React
- 使用函数组件和 Hooks
- Props 必须定义接口
- 使用 Context 管理全局状态

### Lambda
- 每个函数单一职责
- 使用统一的错误处理
- 记录结构化日志

## 安全考虑

1. **认证**: 所有 API 使用 Cognito JWT 验证
2. **授权**: 基于角色的访问控制（RBAC）
3. **加密**: DynamoDB 和 S3 启用静态加密
4. **HTTPS**: 所有通信使用 TLS 1.2+
5. **输入验证**: 客户端和服务端双重验证

## 性能优化

1. **前端**:
   - 代码分割（React.lazy）
   - 图片懒加载
   - API 响应缓存

2. **后端**:
   - Lambda 预留并发
   - DynamoDB Auto Scaling
   - CloudFront CDN

## 监控和日志

- **CloudWatch Logs**: Lambda 函数日志
- **CloudWatch Metrics**: 性能指标
- **X-Ray**: 分布式追踪（可选）

## 下一步

1. 完成任务 2: 实现认证和授权系统
2. 完成任务 3: 实现行业管理功能
3. 依次完成其他任务

详见 `.kiro/specs/industry-portal/tasks.md`
