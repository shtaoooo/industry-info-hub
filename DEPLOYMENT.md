# 部署指南 (Deployment Guide)

## 前提条件

1. **AWS账户**: 需要有效的AWS账户
2. **AWS CLI**: 安装并配置AWS CLI
   ```bash
   aws configure
   ```
3. **AWS SAM CLI**: 安装AWS SAM CLI
   ```bash
   # macOS
   brew install aws-sam-cli
   
   # Windows
   # 从 https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html 下载安装
   ```
4. **Node.js**: 版本 18 或更高

## 性能优化配置

在部署前，请查看 `PERFORMANCE_OPTIMIZATION.md` 了解详细的性能优化配置。主要优化包括：

- Lambda函数内存配置（1024 MB，CSV导入2048 MB）
- DynamoDB按需计费和数据保护
- CloudFront CDN加速
- API Gateway限流和日志
- 前端代码分割和压缩

所有性能优化已在 `backend/template.yaml` 和 `frontend/vite.config.ts` 中配置完成。

## 部署步骤

### 1. 部署后端基础设施

```bash
cd backend

# 安装依赖
npm install

# 构建TypeScript代码
npm run build

# 首次部署（交互式配置）
sam deploy --guided

# 后续部署
sam deploy
```

**首次部署配置选项:**
- Stack Name: `industry-portal-backend`
- AWS Region: `us-east-1` (或您选择的区域)
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Save arguments to configuration file: `Y`

**部署完成后，记录以下输出值:**
- ApiEndpoint
- UserPoolId
- UserPoolClientId
- IdentityPoolId
- DocumentsBucket
- CloudFrontDomain (新增)
- CloudFrontDistributionId (新增)

### 2. 配置前端环境变量

```bash
cd frontend

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入后端部署的输出值
```

更新 `.env` 文件内容:
```
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=<UserPoolId from SAM output>
VITE_USER_POOL_CLIENT_ID=<UserPoolClientId from SAM output>
VITE_IDENTITY_POOL_ID=<IdentityPoolId from SAM output>
VITE_API_ENDPOINT=<ApiEndpoint from SAM output>
VITE_S3_BUCKET=<DocumentsBucket from SAM output>
VITE_CLOUDFRONT_DOMAIN=<CloudFrontDomain from SAM output>
```

### 3. 本地测试前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 验证应用运行正常。

### 4. 构建和优化前端

```bash
cd frontend

# 构建生产版本（已启用代码分割和优化）
npm run build

# 预览构建结果
npm run preview
```

**构建优化说明:**
- 代码自动分割为多个chunk（react-vendor, aws-vendor, ui-vendor等）
- 自动移除console.log和debugger
- 启用Terser压缩
- 生成source maps便于调试

### 5. 部署前端到AWS Amplify

#### 方法A: 通过AWS控制台

1. 登录AWS Amplify控制台
2. 点击 "New app" > "Host web app"
3. 选择Git提供商（GitHub/GitLab/Bitbucket）
4. 授权并选择仓库
5. 配置构建设置:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd frontend
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: frontend/dist
       files:
         - '**/*'
     cache:
       paths:
         - frontend/node_modules/**/*
   ```
6. 添加环境变量（与 .env 文件相同）
7. 保存并部署

#### 方法B: 通过Amplify CLI

```bash
# 安装Amplify CLI
npm install -g @aws-amplify/cli

# 初始化Amplify项目
cd frontend
amplify init

# 添加托管
amplify add hosting

# 发布
amplify publish
```

### 6. 创建初始管理员用户

使用AWS CLI创建第一个管理员用户:

```bash
# 创建用户
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=email_verified,Value=true Name=custom:role,Value=admin \
  --temporary-password TempPassword123! \
  --region us-east-1

# 设置永久密码（首次登录后）
aws cognito-idp admin-set-user-password \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --password YourSecurePassword123! \
  --permanent \
  --region us-east-1
```

### 7. 配置CloudWatch监控和告警

#### 创建CloudWatch仪表板

```bash
# 使用AWS控制台创建仪表板
# 添加以下指标:
# - Lambda: Invocations, Errors, Duration, Throttles
# - API Gateway: Count, 4XXError, 5XXError, Latency
# - DynamoDB: ConsumedReadCapacityUnits, ConsumedWriteCapacityUnits, UserErrors
```

#### 配置告警规则

```bash
# Lambda错误率告警
aws cloudwatch put-metric-alarm \
  --alarm-name industry-portal-lambda-errors \
  --alarm-description "Lambda error rate > 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold

# API Gateway 5XX错误告警
aws cloudwatch put-metric-alarm \
  --alarm-name industry-portal-api-5xx \
  --alarm-description "API 5XX error rate > 1%" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold
```

### 8. 配置自定义域名（可选）

#### 前端域名（Amplify）
1. 在Amplify控制台选择应用
2. 进入 "Domain management"
3. 添加自定义域名
4. 按照指示配置DNS记录

#### API域名（API Gateway）
1. 在API Gateway控制台选择API
2. 进入 "Custom domain names"
3. 创建自定义域名
4. 配置DNS记录指向API Gateway域名

### 9. 配置SSL证书

AWS Amplify和API Gateway都会自动提供SSL证书（通过AWS Certificate Manager）。

对于自定义域名:
1. 在ACM中请求证书
2. 验证域名所有权
3. 将证书关联到Amplify或API Gateway

## 验证部署

### 1. 检查后端健康状态

```bash
# 测试API端点
curl https://<ApiEndpoint>/public/industries

# 检查CloudFront分发状态
aws cloudfront get-distribution --id <CloudFrontDistributionId>
```

### 2. 检查前端访问

访问Amplify提供的URL或自定义域名，确认页面正常加载。

### 3. 测试认证流程

1. 访问前端应用
2. 使用创建的管理员账户登录
3. 验证能够访问管理员功能

### 4. 性能测试

使用Lighthouse审计前端性能:
```bash
# 安装Lighthouse
npm install -g lighthouse

# 运行审计
lighthouse https://<your-domain> --view
```

**目标指标:**
- Performance: > 90
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.8s

## 监控和日志

### CloudWatch Logs
```bash
# 查看Lambda函数日志
aws logs tail /aws/lambda/<function-name> --follow

# 查看API Gateway日志
aws logs tail /aws/apigateway/industry-portal --follow
```

### CloudWatch Metrics
在AWS控制台查看:
- Lambda调用次数和错误率
- API Gateway请求数和延迟
- DynamoDB读写容量
- CloudFront请求数和缓存命中率

### X-Ray追踪
1. 在AWS X-Ray控制台查看服务地图
2. 分析请求追踪详情
3. 识别性能瓶颈

## 性能优化验证

### 1. Lambda性能

```bash
# 查看Lambda执行时间
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=<function-name> \
  --start-time 2026-02-11T00:00:00Z \
  --end-time 2026-02-11T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum
```

**目标:** P99延迟 < 3秒

### 2. API Gateway性能

```bash
# 查看API延迟
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiName,Value=industry-portal \
  --start-time 2026-02-11T00:00:00Z \
  --end-time 2026-02-11T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum
```

**目标:** P99延迟 < 3秒

### 3. CloudFront缓存命中率

```bash
# 查看缓存命中率
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=<distribution-id> \
  --start-time 2026-02-11T00:00:00Z \
  --end-time 2026-02-11T23:59:59Z \
  --period 3600 \
  --statistics Average
```

**目标:** 缓存命中率 > 80%

## 回滚

### 回滚后端
```bash
cd backend
sam deploy --parameter-overrides ParameterKey=Version,ParameterValue=<previous-version>
```

### 回滚前端
在Amplify控制台:
1. 进入应用详情
2. 选择 "Deployments"
3. 找到之前的版本
4. 点击 "Redeploy this version"

## 清理资源

如需删除所有资源:

```bash
# 删除后端堆栈（包括CloudFront分发）
aws cloudformation delete-stack --stack-name industry-portal-backend

# 删除Amplify应用
aws amplify delete-app --app-id <app-id>

# 手动删除S3存储桶（需要先清空）
aws s3 rm s3://<bucket-name> --recursive
aws s3 rb s3://<bucket-name>
```

## 故障排查

### Lambda函数超时
- 增加Lambda函数的超时时间（在template.yaml中）
- 检查DynamoDB查询是否优化
- 查看X-Ray追踪找出瓶颈

### CORS错误
- 确认API Gateway的CORS配置正确
- 检查Lambda函数响应头包含CORS头
- 验证CloudFront的CORS配置

### 认证失败
- 验证Cognito配置正确
- 检查前端的aws-exports.ts配置
- 确认用户池和客户端ID正确

### DynamoDB限流
- 当前使用按需计费，自动扩展
- 如果频繁限流，考虑切换到预置容量
- 优化查询模式，使用批量操作

### CloudFront缓存问题
- 检查缓存策略配置
- 使用CloudFront失效API清除缓存
  ```bash
  aws cloudfront create-invalidation \
    --distribution-id <distribution-id> \
    --paths "/*"
  ```

### 性能不达标
- 查看CloudWatch指标识别瓶颈
- 使用X-Ray追踪分析请求路径
- 检查Lambda内存配置是否合适
- 验证DynamoDB查询是否优化
- 确认CloudFront缓存正常工作

## 成本优化

1. **Lambda**: 
   - 使用合适的内存配置（已配置1024 MB）
   - 监控执行时间，优化代码
   - 考虑使用ARM架构（Graviton2）

2. **DynamoDB**: 
   - 当前使用按需计费
   - 如果流量稳定，评估切换到预置容量
   - 使用TTL自动删除过期数据

3. **S3**: 
   - 配置生命周期策略归档旧文件
   - 删除未完成的分段上传
   - 使用智能分层存储

4. **CloudFront**: 
   - 当前使用PriceClass_100（北美和欧洲）
   - 根据用户分布调整价格等级
   - 优化缓存策略减少源站请求

5. **CloudWatch**: 
   - 设置日志保留期限（已配置30天）
   - 删除不需要的指标
   - 使用日志过滤减少存储

## 安全最佳实践

1. 启用CloudTrail记录API调用
2. 定期轮换访问密钥
3. 使用IAM角色而非长期凭证
4. 启用MFA for管理员账户
5. 定期审查IAM权限
6. 启用AWS Config监控合规性
7. 配置WAF保护API Gateway（可选）
8. 启用GuardDuty威胁检测（可选）

## 性能优化清单

部署后验证以下优化已生效:

- [ ] Lambda函数内存配置为1024 MB（CSV导入2048 MB）
- [ ] Lambda函数启用X-Ray追踪
- [ ] DynamoDB使用按需计费模式
- [ ] DynamoDB启用Point-in-Time Recovery
- [ ] DynamoDB启用服务端加密
- [ ] CloudFront分发已创建并正常工作
- [ ] CloudFront缓存命中率 > 80%
- [ ] API Gateway配置限流（5000突发，2000/秒）
- [ ] API Gateway访问日志已启用
- [ ] 前端代码已分割为多个chunk
- [ ] 前端构建已移除console.log
- [ ] CloudWatch告警已配置
- [ ] 响应时间 < 3秒（P99）

## 支持

如有问题，请查看:
- 性能优化文档: `PERFORMANCE_OPTIMIZATION.md`
- AWS文档: https://docs.aws.amazon.com/
- SAM文档: https://docs.aws.amazon.com/serverless-application-model/
- Amplify文档: https://docs.amplify.aws/
- CloudFront文档: https://docs.aws.amazon.com/cloudfront/
