# Use Case Migration to Markdown

这个脚本用于将DynamoDB中use case表的四个字段（业务场景、客户痛点、切入人群、沟通话术）合并为markdown文件并上传到S3。

## 功能说明

脚本会：
1. 扫描DynamoDB中的所有use case记录
2. 将四个字段内容合并为格式化的markdown文件：
   - 📋 业务场景 (businessScenario)
   - 🎯 客户痛点 (customerPainPoints)
   - 👥 切入人群 (targetAudience)
   - 💬 沟通话术 (communicationScript)
3. 上传markdown文件到S3的 `docs/usecase/{useCaseId}.md`
4. 更新DynamoDB记录，添加：
   - `summary`: 简要描述（从业务场景或描述字段提取，最多500字符）
   - `updatedAt`: 更新时间

**注意**：S3文件路径直接根据use case ID拼接（`docs/usecase/{id}.md`），不需要在DynamoDB中存储路径。

## 使用方法

### 1. 先执行干运行（Dry Run）查看效果

```bash
# 在本地执行
python scripts/migrate-usecase-to-markdown.py --region us-east-2 --dry-run

# 或在EC2上执行
ssh -i C:/Users/Administrator/.ssh/Global-001.pem ec2-user@54.166.76.117
cd industry-info-hub
python3 scripts/migrate-usecase-to-markdown.py --region us-east-2 --dry-run
```

干运行模式会：
- ✅ 扫描所有use case
- ✅ 显示将要创建的markdown内容
- ✅ 显示将要更新的字段
- ❌ 不会实际上传到S3
- ❌ 不会实际更新DynamoDB

### 2. 确认无误后执行实际迁移

```bash
# 在EC2上执行实际迁移
python3 scripts/migrate-usecase-to-markdown.py --region us-east-2
```

执行时会要求确认：
```
⚠️  LIVE MODE - Changes will be made to DynamoDB and S3

Continue? (yes/no):
```

输入 `yes` 后开始迁移。

## 命令行参数

```bash
python scripts/migrate-usecase-to-markdown.py [OPTIONS]

Options:
  --region REGION       AWS region (default: us-east-2)
  --dry-run            执行干运行，不实际修改数据
  --table TABLE        DynamoDB表名 (default: IndustryPortal-UseCases)
  --bucket BUCKET      S3桶名 (default: industry-portal-docs-v2-880755836258)
  -h, --help           显示帮助信息
```

## 输出示例

```
================================================================================
Use Case Migration to Markdown
================================================================================
Region: us-east-2
Table: IndustryPortal-UseCases
Bucket: industry-portal-docs-v2-880755836258
Dry Run: True
================================================================================

⚠️  DRY RUN MODE - No changes will be made

Scanning use cases from table: IndustryPortal-UseCases
Found 15 use cases

📝 Processing: 智能客服系统 (ID: abc-123-def)
  📄 Markdown size: 856 bytes
  📝 Summary: 在客户服务场景中，企业需要处理大量的客户咨询...
  📦 S3 key: docs/usecase/abc-123-def.md
  🔍 DRY RUN - Would upload to S3 and update DynamoDB
  ✅ Successfully migrated

📝 Processing: 供应链优化 (ID: xyz-456-uvw)
  ⏭️  Already migrated (has summary field)

...

================================================================================
Migration Summary
================================================================================
Total use cases: 15
✅ Successfully migrated: 12
⏭️  Skipped (already migrated): 2
❌ Errors: 1
================================================================================

🔍 This was a DRY RUN - no changes were made
Run without --dry-run to perform the actual migration
```

## 生成的Markdown格式

```markdown
## 📋 业务场景

在客户服务场景中，企业需要处理大量的客户咨询和投诉...

## 🎯 客户痛点

- 人工客服成本高
- 响应速度慢
- 服务质量不稳定

## 👥 切入人群

客户服务部门负责人、IT部门负责人、运营总监

## 💬 沟通话术

> 我们的智能客服系统可以帮助您降低70%的人工客服成本，同时将响应速度提升5倍...
```

## 注意事项

1. **备份数据**：虽然脚本只添加新字段不删除旧字段，但建议先备份DynamoDB数据
2. **权限要求**：执行脚本需要以下AWS权限：
   - DynamoDB: `Scan`, `UpdateItem`
   - S3: `PutObject`
3. **幂等性**：脚本可以安全地多次运行，已迁移的记录会被跳过
4. **向后兼容**：旧的四个字段不会被删除，确保向后兼容

## 故障排查

### 问题：权限不足
```
Error: AccessDeniedException
```
**解决方案**：确保AWS凭证有足够的权限访问DynamoDB和S3

### 问题：S3上传失败
```
Error uploading to S3: ...
```
**解决方案**：
1. 检查S3桶名是否正确
2. 检查网络连接
3. 检查S3桶权限

### 问题：DynamoDB更新失败
```
Error updating DynamoDB: ...
```
**解决方案**：
1. 检查表名是否正确
2. 检查记录是否存在
3. 检查DynamoDB权限

## 迁移后验证

迁移完成后，可以通过以下方式验证：

1. **检查S3文件**：
```bash
aws s3 ls s3://industry-portal-docs-v2-880755836258/docs/usecase/ --region us-east-2
```

2. **检查DynamoDB记录**：
```bash
aws dynamodb get-item \
  --table-name IndustryPortal-UseCases \
  --key '{"PK":{"S":"<use-case-id>"},"SK":{"S":"METADATA"}}' \
  --region us-east-2 \
  --query 'Item.summary.S'
```

3. **在前端测试**：访问use case详情页面，查看markdown内容是否正确显示
