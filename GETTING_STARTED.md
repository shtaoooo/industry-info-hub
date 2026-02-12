# 快速开始指南 (Getting Started Guide)

## 项目已完成初始化 ✅

恭喜！行业信息门户项目的基础架构已经搭建完成。

## 已完成的工作

### ✅ 前端项目 (Frontend)
- React 18 + TypeScript + Vite 项目结构
- AWS Amplify SDK 集成
- Ant Design UI 组件库配置
- 路由和状态管理基础
- 测试框架配置（Vitest + fast-check）

### ✅ 后端项目 (Backend)
- AWS SAM 项目结构
- Lambda 函数框架
- DynamoDB 表定义（7个表）
- S3 存储桶配置
- Cognito 用户池配置
- API Gateway 配置

### ✅ 文档
- README.md - 项目概述
- DEPLOYMENT.md - 详细部署指南
- PROJECT_STRUCTURE.md - 项目结构说明
- 本文件 - 快速开始指南

### ✅ 工具脚本
- setup.sh - Linux/Mac 初始化脚本
- setup.bat - Windows 初始化脚本

## 立即开始

### 选项 1: 本地开发（推荐用于开发）

```bash
# 1. 运行初始化脚本
# Linux/Mac:
bash setup.sh

# Windows:
setup.bat

# 2. 启动前端开发服务器
cd frontend
npm run dev

# 访问 http://localhost:5173
```

### 选项 2: 完整部署到 AWS

```bash
# 1. 确保已安装 AWS CLI 和 SAM CLI
aws --version
sam --version

# 2. 配置 AWS 凭证
aws configure

# 3. 部署后端
cd backend
sam deploy --guided

# 4. 记录输出的资源 ID（UserPoolId, ApiEndpoint 等）

# 5. 更新前端环境变量
cd ../frontend
cp .env.example .env
# 编辑 .env 文件，填入实际的 AWS 资源 ID

# 6. 部署前端到 Amplify
# 参考 DEPLOYMENT.md 中的详细步骤
```

## 项目结构概览

```
industry-portal/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── pages/        # 页面
│   │   ├── services/     # API 调用
│   │   └── contexts/     # 状态管理
│   └── package.json
│
├── backend/           # Lambda 后端
│   ├── src/
│   │   ├── functions/    # Lambda 函数
│   │   ├── types/        # 类型定义
│   │   └── utils/        # 工具函数
│   └── template.yaml     # AWS 资源定义
│
└── .kiro/specs/industry-portal/
    ├── requirements.md   # 需求文档
    ├── design.md        # 设计文档
    └── tasks.md         # 任务列表
```

## 下一步任务

根据 `.kiro/specs/industry-portal/tasks.md`，接下来的任务是：

### 任务 2: 实现认证和授权系统
- 集成 AWS Cognito SDK
- 实现登录/登出功能
- 创建认证上下文和路由守卫
- 实现基于角色的访问控制（RBAC）

### 任务 3: 实现行业管理功能（管理员）
- 创建行业 CRUD 的 Lambda 函数
- 实现行业列表查询 API
- 实现行业创建/编辑/删除 API
- 创建行业管理前端界面

## 开发工作流

### 1. 开发新功能
```bash
# 1. 查看任务列表
cat .kiro/specs/industry-portal/tasks.md

# 2. 开发后端 Lambda 函数
cd backend/src/functions
# 创建新的函数文件

# 3. 更新 SAM 模板
# 编辑 backend/template.yaml

# 4. 本地测试
cd backend
npm test

# 5. 开发前端组件
cd frontend/src/components
# 创建新的组件

# 6. 测试前端
cd frontend
npm test
```

### 2. 运行测试
```bash
# 前端测试
cd frontend
npm test              # 运行一次
npm run test:watch    # 监听模式

# 后端测试
cd backend
npm test              # 运行一次
npm run test:watch    # 监听模式
```

### 3. 部署更新
```bash
# 部署后端更新
cd backend
sam build
sam deploy

# 前端会通过 Amplify 自动部署（如果配置了 CI/CD）
# 或手动构建并上传
cd frontend
npm run build
```

## 重要文件说明

### 前端配置
- `frontend/package.json` - 依赖和脚本
- `frontend/vite.config.ts` - Vite 构建配置
- `frontend/src/aws-exports.ts` - AWS 服务配置
- `frontend/.env` - 环境变量（需要手动创建）

### 后端配置
- `backend/template.yaml` - AWS 资源定义
- `backend/samconfig.toml` - SAM 部署配置
- `backend/package.json` - 依赖和脚本

## 常见问题

### Q: 如何创建第一个管理员用户？
A: 部署后端后，使用 AWS CLI：
```bash
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com \
    Name=email_verified,Value=true \
    Name=custom:role,Value=admin \
  --temporary-password TempPassword123!
```

### Q: 前端无法连接到后端？
A: 检查以下几点：
1. `frontend/.env` 文件是否正确配置
2. API Gateway 的 CORS 是否正确配置
3. Cognito 用户池 ID 是否正确

### Q: Lambda 函数部署失败？
A: 常见原因：
1. IAM 权限不足
2. 依赖包未正确安装
3. TypeScript 编译错误

运行 `npm run build` 检查编译错误。

### Q: 如何查看 Lambda 日志？
A: 使用 AWS CLI：
```bash
aws logs tail /aws/lambda/<function-name> --follow
```

## 资源链接

- [AWS SAM 文档](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Amplify 文档](https://docs.amplify.aws/)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [Ant Design 文档](https://ant.design/)

## 获取帮助

1. 查看详细文档：
   - `README.md` - 项目概述
   - `DEPLOYMENT.md` - 部署指南
   - `PROJECT_STRUCTURE.md` - 项目结构

2. 查看规范文档：
   - `.kiro/specs/industry-portal/requirements.md` - 需求
   - `.kiro/specs/industry-portal/design.md` - 设计
   - `.kiro/specs/industry-portal/tasks.md` - 任务

3. 检查 AWS 控制台：
   - CloudWatch Logs - 查看日志
   - CloudWatch Metrics - 查看性能指标
   - DynamoDB - 查看数据

## 开始编码！

现在你可以开始实现下一个任务了。建议按照 `tasks.md` 中的顺序逐个完成任务。

祝编码愉快！🚀
