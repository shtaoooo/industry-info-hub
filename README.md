# 行业信息门户 (Industry Portal)

基于AWS Serverless架构的行业信息管理系统。

## 项目结构

```
.
├── frontend/              # React前端应用
│   ├── src/
│   │   ├── components/   # React组件
│   │   ├── pages/        # 页面组件
│   │   ├── contexts/     # React Context
│   │   ├── services/     # API服务
│   │   ├── types/        # TypeScript类型
│   │   └── utils/        # 工具函数
│   ├── public/           # 静态资源
│   └── package.json
│
├── backend/              # Lambda后端函数
│   ├── src/
│   │   ├── functions/    # Lambda函数
│   │   ├── types/        # TypeScript类型
│   │   └── utils/        # 工具函数
│   ├── template.yaml     # AWS SAM模板
│   └── package.json
│
└── .kiro/
    └── specs/
        └── industry-portal/
            ├── requirements.md
            ├── design.md
            └── tasks.md
```

## 技术栈

### 前端
- React 18 + TypeScript
- Vite (构建工具)
- Ant Design (UI组件库)
- AWS Amplify (认证和API)
- React Router (路由)

### 后端
- AWS Lambda (Node.js 18)
- AWS API Gateway (HTTP API)
- AWS DynamoDB (数据库)
- AWS S3 (文件存储)
- AWS Cognito (用户认证)

### 测试
- Vitest (单元测试)
- fast-check (属性测试)
- React Testing Library (组件测试)

## 快速开始

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

### 后端部署

前提条件：
- 安装 AWS CLI
- 安装 AWS SAM CLI
- 配置 AWS 凭证

```bash
cd backend
npm install
npm run build
sam deploy --guided
```

首次部署使用 `--guided` 参数进行交互式配置。

### 环境变量配置

1. 复制 `frontend/.env.example` 到 `frontend/.env`
2. 更新环境变量为实际的AWS资源值（从SAM部署输出获取）

```bash
cp frontend/.env.example frontend/.env
```

## 数据库表结构

系统使用7个DynamoDB表：

1. **IndustryPortal-Industries** - 行业信息
2. **IndustryPortal-SubIndustries** - 子行业信息
3. **IndustryPortal-UseCases** - 用例信息
4. **IndustryPortal-Solutions** - 解决方案信息
5. **IndustryPortal-UseCaseSolutionMapping** - 用例-解决方案关联
6. **IndustryPortal-CustomerCases** - 客户案例信息
7. **IndustryPortal-Users** - 用户扩展信息

## 用户角色

- **管理员 (admin)**: 管理所有基础数据
- **行业专员 (specialist)**: 管理指定行业的内容
- **普通用户 (user)**: 浏览和下载信息

## 开发指南

### 运行测试

```bash
# 前端测试
cd frontend
npm test

# 后端测试
cd backend
npm test
```

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用函数式组件和 Hooks
- API 响应使用统一的错误处理格式

## 部署

### 前端部署到 AWS Amplify

1. 在 AWS Amplify 控制台创建新应用
2. 连接 Git 仓库
3. 配置构建设置：
   - 构建命令: `npm run build`
   - 输出目录: `dist`
4. 添加环境变量
5. 部署

### 后端部署

```bash
cd backend
sam build
sam deploy
```

## 监控和日志

- CloudWatch Logs: Lambda函数日志
- CloudWatch Metrics: API和Lambda指标
- X-Ray: 分布式追踪（可选）

## 安全

- 所有API使用Cognito JWT认证
- DynamoDB和S3启用静态加密
- 使用HTTPS传输
- 实施最小权限原则

## 许可证

MIT
