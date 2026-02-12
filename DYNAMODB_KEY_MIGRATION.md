# DynamoDB 键结构迁移计划

## 变更概述

### 当前设计
- **Industries 表**
  - PK: `INDUSTRY#${id}`
  - SK: `METADATA`
  
- **SubIndustries 表**
  - PK: `INDUSTRY#${industryId}`
  - SK: `SUBINDUSTRY#${subIndustryId}`

### 新设计
- **Industries 表**
  - PK: `${id}` (直接使用 industry_id)
  - SK: `${name}` (使用行业名称)
  
- **SubIndustries 表**
  - PK: `${id}` (直接使用 subindustry_id)
  - SK: `${industryId}` (所属的行业 ID)
  - 需要 GSI: GSI_PK = `${industryId}`, GSI_SK = `${id}` (用于查询某行业下的所有子行业)

## 优势
1. 简化键结构，去掉不必要的前缀
2. 支持按名称查询行业（Industry SK 可以用于查询）
3. 支持按 ID 直接查询子行业
4. 通过 GSI 支持查询某行业下的所有子行业
5. 更直观的数据模型，减少冗余

## 影响的文件

### 后端函数
1. `backend/src/functions/industryManagement.ts` - 行业 CRUD 操作
2. `backend/src/functions/publicBrowsing.ts` - 公开浏览 API
3. `backend/src/functions/csvImport.ts` - CSV 导入
4. `backend/src/functions/subIndustryManagement.ts` - 子行业管理（引用 Industry）
5. `backend/src/functions/useCaseManagement.ts` - 用例管理（引用 Industry）
6. `backend/src/functions/mappingManagement.ts` - 映射管理（引用 Industry）
7. `backend/src/functions/customerCaseManagement.ts` - 客户案例管理（引用 Industry）

### 工具函数
8. `backend/src/utils/consistency.ts` - 一致性检查

### 脚本
9. `scripts/add-industry-images.ts` - 图片更新脚本

## 迁移步骤

### 阶段 1: 修改后端代码
1. ✅ 修改 `industryManagement.ts` - 所有 Industry 操作
2. ✅ 修改 `publicBrowsing.ts` - 公开 API
3. ✅ 修改 `consistency.ts` - 一致性检查
4. ✅ 修改 `csvImport.ts` - CSV 导入
5. ✅ 修改其他引用 Industry 的函数

### 阶段 2: 修改脚本
6. ✅ 修改 `add-industry-images.ts`

### 阶段 3: 部署和数据迁移
7. 编译后端代码
8. 删除现有 DynamoDB 数据（通过 AWS Console）
9. 部署更新后的代码
10. 重新导入行业数据（使用 CSV 导入功能）
11. 运行图片更新脚本

## 注意事项

1. **SubIndustries 表不需要修改**
   - SubIndustries 的 PK 仍然是 `INDUSTRY#${industryId}` 吗？
   - 需要确认 SubIndustries 的键结构

2. **查询模式变化**
   - 按 ID 查询：`GetItem(PK=id, SK=name)` - 需要知道 name
   - 按 ID 查询所有：`Query(PK=id)` - 返回该 ID 的所有记录（应该只有一个）
   - 列出所有：`Scan` - 保持不变

3. **数据一致性**
   - 行业名称不可修改（作为 SK）
   - 如果需要修改名称，必须删除旧记录并创建新记录

## 回滚计划

如果迁移失败：
1. 恢复代码到之前的版本
2. 重新部署
3. 从备份恢复数据（如果有）
