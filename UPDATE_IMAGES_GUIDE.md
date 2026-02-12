# 更新行业图片指南

## 问题描述
HomePage 显示的所有行业卡片都是同一张图片，因为 DynamoDB 中的行业记录还没有 `imageUrl` 字段。

## 解决方案

### 步骤 1: 确认图片已下载
所有行业图片已经下载到 `frontend/public/images/industries/` 目录，共 23 张图片。

### 步骤 2: 更新后端 API
✅ 已完成 - 后端 `publicBrowsing.ts` 已更新，现在会返回 `imageUrl` 字段。

### 步骤 3: 运行脚本更新 DynamoDB

需要运行 `scripts/add-industry-images.ts` 脚本来更新 DynamoDB 中的所有行业记录。

#### 前置条件
1. 安装依赖：
```bash
cd scripts
npm install
```

2. 配置 AWS 凭证（选择以下方式之一）：

**方式 A: 使用环境变量（Windows PowerShell）**
```powershell
$env:AWS_ACCESS_KEY_ID="your_access_key"
$env:AWS_SECRET_ACCESS_KEY="your_secret_key"
$env:AWS_REGION="us-east-2"
```

**方式 B: 使用 AWS CLI 配置**
```bash
aws configure
# 输入 Access Key ID
# 输入 Secret Access Key
# 输入 Region: us-east-2
```

#### 运行脚本
```bash
cd scripts
npm run add-images
```

#### 预期输出
```
🚀 Starting industry image update...

Found X industries

✓ Updated 金融服务 with image: /images/industries/finance.jpg
✓ Updated 制造业 with image: /images/industries/manufacturing.jpg
✓ Updated 零售 with image: /images/industries/retail.jpg
...

✅ Successfully updated X industries with images!
```

### 步骤 4: 验证
1. 等待 Amplify 部署完成（约 5-10 分钟）
2. 访问 https://main.dvlzz7r606v3p.amplifyapp.com
3. 使用普通用户账号登录
4. 查看 HomePage，每个行业应该显示不同的图片

## 技术细节

### 图片映射
脚本会根据行业名称匹配对应的图片：
- 金融服务/金融 → `/images/industries/finance.jpg`
- 制造业/制造 → `/images/industries/manufacturing.jpg`
- 零售 → `/images/industries/retail.jpg`
- 等等...

### DynamoDB 更新
脚本会：
1. 扫描 `IndustryPortal-Industries` 表中的所有行业
2. 根据行业名称匹配对应的本地图片路径
3. 更新每个行业记录的 `imageUrl` 字段
4. 更新 `updatedAt` 时间戳

### 前端显示逻辑
HomePage 组件会：
1. 从 API 获取行业列表（包含 `imageUrl` 字段）
2. 优先使用 `industry.imageUrl`
3. 如果没有 `imageUrl`，使用 `getFallbackImage(industry.name)` 作为后备

## 故障排除

### 问题：脚本运行失败
- 检查 AWS 凭证是否正确配置
- 确认有权限访问 DynamoDB 表
- 确认 Region 设置为 `us-east-2`

### 问题：图片仍然相同
- 确认脚本成功运行并更新了所有行业
- 清除浏览器缓存
- 检查浏览器控制台是否有错误
- 确认 Amplify 部署已完成

### 问题：某些图片显示不出来
- 检查 `frontend/public/images/industries/` 目录中是否有对应的图片文件
- 确认图片文件名与脚本中的映射一致
