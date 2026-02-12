# 性能优化指南

本文档描述了行业信息门户系统的性能优化配置和最佳实践。

## 概述

系统性能优化涵盖以下几个方面：
- Lambda函数配置优化
- DynamoDB性能优化
- CloudFront CDN加速
- 前端代码分割和优化
- API Gateway缓存和限流
- CloudWatch监控和告警

## 后端性能优化

### 1. Lambda函数配置

#### 内存和超时设置

根据设计文档建议，Lambda函数配置如下：

**全局默认配置:**
- 内存: 1024 MB
- 超时: 30秒
- 运行时: Node.js 18.x
- X-Ray追踪: 已启用

**特殊配置:**
- CSV导入函数: 2048 MB内存，300秒超时（处理大文件）

**配置位置:** `backend/template.yaml` - Globals.Function

#### 性能优化建议

1. **预留并发（可选）**
   - 对于高频API（如公开浏览接口），可配置预留并发
   - 避免冷启动延迟
   - 成本较高，按需配置

2. **Lambda层**
   - 将共享依赖（如AWS SDK）提取到Lambda层
   - 减少部署包大小
   - 加快部署速度

3. **环境变量优化**
   - 使用环境变量存储配置
   - 避免硬编码
   - 支持不同环境配置

### 2. DynamoDB优化

#### 计费模式

当前配置: **按需计费（PAY_PER_REQUEST）**

**优点:**
- 无需预估容量
- 自动扩展
- 适合流量不可预测的应用

**何时切换到预置容量:**
- 流量稳定且可预测
- 每月请求量超过一定阈值
- 需要更低的单位成本

#### 表设计优化

1. **分区键设计**
   - 使用复合键（PK + SK）
   - 避免热分区
   - 均匀分布数据

2. **全局二级索引（GSI）**
   - UseCaseSolutionMapping表使用ReverseIndex
   - 支持双向查询
   - 投影类型: ALL（包含所有属性）

3. **流式处理**
   - 已启用DynamoDB Streams
   - StreamViewType: NEW_AND_OLD_IMAGES
   - 可用于审计日志、数据同步等

4. **数据保护**
   - Point-in-Time Recovery: 已启用
   - 服务端加密（SSE）: 已启用
   - 支持35天内任意时间点恢复

#### 查询优化

1. **使用批量操作**
   - BatchGetItem: 一次获取多个项目
   - BatchWriteItem: 一次写入多个项目
   - TransactWriteItems: 事务性写入

2. **投影表达式**
   - 只查询需要的属性
   - 减少数据传输量
   - 降低成本

3. **分页查询**
   - 使用Limit参数
   - 处理LastEvaluatedKey
   - 避免一次性加载大量数据

### 3. S3和CloudFront优化

#### CloudFront配置

**分发配置:**
- 价格等级: PriceClass_100（北美和欧洲）
- 默认TTL: 24小时（86400秒）
- 最大TTL: 1年（31536000秒）
- 压缩: 已启用

**缓存行为:**
- 允许的方法: GET, HEAD, OPTIONS
- 缓存的方法: GET, HEAD
- 查询字符串转发: 禁用
- Cookie转发: 禁用

**安全配置:**
- 查看器协议策略: 重定向到HTTPS
- Origin Access Identity: 已配置
- S3桶策略: 仅允许CloudFront访问

#### S3优化

1. **存储类别**
   - 标准存储: 用于频繁访问的文档
   - 智能分层: 自动优化成本（可选）

2. **生命周期策略（可选）**
   ```yaml
   # 示例：30天后转移到IA，90天后转移到Glacier
   LifecycleConfiguration:
     Rules:
       - Id: ArchiveOldDocuments
         Status: Enabled
         Transitions:
           - Days: 30
             StorageClass: STANDARD_IA
           - Days: 90
             StorageClass: GLACIER
   ```

3. **传输加速（可选）**
   - 对于大文件上传
   - 跨地域上传
   - 额外成本

### 4. API Gateway优化

#### 限流配置

**默认路由设置:**
- 突发限制: 5000请求
- 速率限制: 2000请求/秒

**说明:**
- 防止DDoS攻击
- 保护后端资源
- 可根据实际需求调整

#### 访问日志

**配置:**
- 日志组: /aws/apigateway/industry-portal
- 保留期: 30天
- 格式: 包含requestId、错误信息

**用途:**
- 故障排查
- 性能分析
- 安全审计

#### 缓存策略（可选）

对于只读API，可启用API Gateway缓存：

```yaml
# 示例配置（需要手动添加）
CacheClusterEnabled: true
CacheClusterSize: '0.5'  # GB
CacheTtlInSeconds: 300   # 5分钟
```

**适用场景:**
- 公开浏览接口（/public/*）
- 数据变化不频繁
- 可接受短暂的数据延迟

**注意:**
- 增加成本
- 需要缓存失效策略
- 不适用于需要实时数据的场景

## 前端性能优化

### 1. 代码分割

#### Vite配置

**手动分块策略:**
```javascript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'aws-vendor': ['aws-amplify', '@aws-sdk/client-cognito-identity-provider'],
  'ui-vendor': ['antd', '@ant-design/icons'],
  'markdown-vendor': ['react-markdown', 'remark-gfm'],
}
```

**优点:**
- 减少初始加载时间
- 提高缓存命中率
- 并行加载资源

#### 路由级代码分割

使用React.lazy进行路由级分割：

```typescript
// 示例
const IndustryManagement = lazy(() => import('./pages/admin/IndustryManagement'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
```

**建议:**
- 按角色分割（admin、specialist、public）
- 按功能模块分割
- 使用Suspense组件显示加载状态

### 2. 构建优化

#### Terser压缩

**配置:**
- 移除console.log
- 移除debugger
- 代码压缩和混淆

**生产环境:**
- 启用source maps（便于调试）
- 块大小警告限制: 1000 KB

#### 依赖优化

**预构建依赖:**
- react, react-dom
- react-router-dom
- antd

**优点:**
- 加快开发服务器启动
- 减少模块解析时间

### 3. 资源优化

#### 图片优化

1. **格式选择**
   - 使用WebP格式
   - 提供fallback（PNG/JPG）

2. **懒加载**
   ```typescript
   <img loading="lazy" src="..." alt="..." />
   ```

3. **响应式图片**
   ```typescript
   <img srcset="..." sizes="..." />
   ```

#### 字体优化

1. **字体子集化**
   - 只包含使用的字符
   - 减少字体文件大小

2. **字体加载策略**
   ```css
   font-display: swap;
   ```

### 4. 缓存策略

#### 静态资源缓存

**Amplify默认配置:**
- HTML: 无缓存或短期缓存
- JS/CSS: 长期缓存（带hash）
- 图片: 长期缓存

#### API响应缓存

使用React Query或SWR：

```typescript
// 示例
const { data } = useQuery('industries', fetchIndustries, {
  staleTime: 5 * 60 * 1000, // 5分钟
  cacheTime: 10 * 60 * 1000, // 10分钟
});
```

## 监控和告警

### 1. CloudWatch指标

#### Lambda指标

**关键指标:**
- Invocations: 调用次数
- Errors: 错误次数
- Duration: 执行时间
- Throttles: 限流次数
- ConcurrentExecutions: 并发执行数

**告警阈值建议:**
- 错误率 > 5%
- P99延迟 > 3秒
- 限流次数 > 0

#### DynamoDB指标

**关键指标:**
- ConsumedReadCapacityUnits
- ConsumedWriteCapacityUnits
- UserErrors
- SystemErrors
- SuccessfulRequestLatency

**告警阈值建议:**
- 用户错误率 > 1%
- 系统错误率 > 0.1%
- P99延迟 > 100ms

#### API Gateway指标

**关键指标:**
- Count: 请求总数
- 4XXError: 客户端错误
- 5XXError: 服务端错误
- Latency: 延迟
- IntegrationLatency: 集成延迟

**告警阈值建议:**
- 4XX错误率 > 10%
- 5XX错误率 > 1%
- P99延迟 > 3秒

### 2. X-Ray追踪

**已启用功能:**
- Lambda函数追踪
- 服务地图
- 追踪详情

**用途:**
- 识别性能瓶颈
- 分析请求路径
- 故障排查

### 3. 日志管理

#### 日志级别

- ERROR: 错误和异常
- WARN: 警告信息
- INFO: 重要操作
- DEBUG: 详细调试（仅开发环境）

#### 日志保留

- API Gateway日志: 30天
- Lambda日志: 默认永久（建议设置保留期）

#### 结构化日志

```json
{
  "timestamp": "2026-02-11T10:30:00Z",
  "level": "INFO",
  "userId": "user-123",
  "action": "CREATE_INDUSTRY",
  "industryId": "ind-456",
  "duration": 150,
  "requestId": "abc-123"
}
```

### 4. 成本监控

#### 预算告警

建议设置AWS预算告警：
- 月度预算: $200
- 告警阈值: 80%, 100%, 120%

#### 成本优化建议

1. **Lambda**
   - 优化内存配置
   - 减少执行时间
   - 使用ARM架构（Graviton2）

2. **DynamoDB**
   - 评估按需vs预置容量
   - 删除未使用的GSI
   - 使用TTL自动删除过期数据

3. **S3**
   - 使用生命周期策略
   - 删除未完成的分段上传
   - 使用智能分层存储

4. **CloudFront**
   - 调整价格等级
   - 优化缓存策略
   - 压缩内容

## 性能测试

### 1. 负载测试

**工具:**
- Apache JMeter
- Artillery
- k6

**测试场景:**
- 并发用户: 100, 500, 1000
- 持续时间: 5分钟, 15分钟
- 请求类型: 读取、写入、混合

**目标:**
- 响应时间 < 3秒（P99）
- 错误率 < 1%
- 吞吐量 > 1000 req/s

### 2. 压力测试

**目的:**
- 找到系统极限
- 验证自动扩展
- 测试故障恢复

**方法:**
- 逐步增加负载
- 监控系统指标
- 记录失败点

### 3. 前端性能测试

**工具:**
- Lighthouse
- WebPageTest
- Chrome DevTools

**指标:**
- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3.8s
- Cumulative Layout Shift (CLS) < 0.1

## 部署清单

### 后端部署

- [ ] 构建Lambda函数
  ```bash
  cd backend
  npm run build
  ```

- [ ] 部署SAM模板
  ```bash
  sam deploy --guided
  ```

- [ ] 验证CloudFormation堆栈
- [ ] 记录输出值（API端点、CloudFront域名等）
- [ ] 配置CloudWatch告警
- [ ] 测试API端点

### 前端部署

- [ ] 更新环境变量
  ```bash
  cd frontend
  # 更新 .env.production
  ```

- [ ] 构建生产版本
  ```bash
  npm run build
  ```

- [ ] 分析构建产物
  ```bash
  npm run build -- --report
  ```

- [ ] 部署到Amplify
  ```bash
  amplify publish
  ```

- [ ] 验证部署
- [ ] 测试关键功能
- [ ] 运行Lighthouse审计

### 监控配置

- [ ] 创建CloudWatch仪表板
- [ ] 配置告警规则
- [ ] 设置SNS通知
- [ ] 启用X-Ray追踪
- [ ] 配置成本预算告警

## 性能优化检查清单

### Lambda优化
- [x] 配置合适的内存大小（1024 MB）
- [x] 设置合理的超时时间（30秒）
- [x] 启用X-Ray追踪
- [ ] 配置预留并发（可选）
- [ ] 使用Lambda层共享依赖（可选）

### DynamoDB优化
- [x] 使用按需计费模式
- [x] 启用Point-in-Time Recovery
- [x] 启用服务端加密
- [x] 配置DynamoDB Streams
- [ ] 评估预置容量（生产环境）
- [ ] 配置Auto Scaling（如使用预置容量）

### CloudFront优化
- [x] 配置CloudFront分发
- [x] 启用压缩
- [x] 配置Origin Access Identity
- [x] 设置合理的TTL
- [ ] 配置自定义域名（可选）
- [ ] 配置SSL证书（可选）

### API Gateway优化
- [x] 配置限流
- [x] 启用访问日志
- [ ] 启用缓存（可选）
- [ ] 配置自定义域名（可选）

### 前端优化
- [x] 配置代码分割
- [x] 启用Terser压缩
- [x] 移除console.log
- [x] 生成source maps
- [ ] 实现路由级懒加载
- [ ] 优化图片资源
- [ ] 配置CDN缓存

### 监控和告警
- [ ] 创建CloudWatch仪表板
- [ ] 配置Lambda告警
- [ ] 配置DynamoDB告警
- [ ] 配置API Gateway告警
- [ ] 配置成本告警
- [ ] 测试告警通知

## 故障排查

### 常见性能问题

#### 1. Lambda冷启动慢

**症状:** 首次请求延迟高

**解决方案:**
- 配置预留并发
- 减少依赖包大小
- 使用Lambda层
- 考虑使用Provisioned Concurrency

#### 2. DynamoDB限流

**症状:** ThrottlingException错误

**解决方案:**
- 切换到按需计费
- 增加预置容量
- 优化查询模式
- 使用批量操作

#### 3. API Gateway超时

**症状:** 504 Gateway Timeout

**解决方案:**
- 增加Lambda超时时间
- 优化Lambda函数逻辑
- 使用异步处理
- 实现重试机制

#### 4. 前端加载慢

**症状:** 首屏加载时间长

**解决方案:**
- 实现代码分割
- 启用CDN缓存
- 优化图片资源
- 使用懒加载

## 总结

本文档提供了行业信息门户系统的全面性能优化指南。主要优化包括：

1. **后端优化**
   - Lambda函数内存和超时配置
   - DynamoDB按需计费和数据保护
   - CloudFront CDN加速
   - API Gateway限流和日志

2. **前端优化**
   - Vite代码分割配置
   - Terser压缩和优化
   - 资源缓存策略

3. **监控和告警**
   - CloudWatch指标监控
   - X-Ray追踪
   - 结构化日志
   - 成本监控

所有配置已在`backend/template.yaml`和`frontend/vite.config.ts`中实现，可直接部署使用。

根据设计文档要求，系统应在3秒内提供响应反馈（需求12.1）。通过以上优化配置，系统可以满足性能要求。
