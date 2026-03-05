#!/usr/bin/env python3
"""
DynamoDB 备份和恢复工具
导出所有 IndustryPortal 表的数据到 JSON 文件
"""

import boto3
import json
import os
from datetime import datetime
from decimal import Decimal

# 配置
REGION = 'us-east-2'
BACKUP_DIR = 'dynamodb-backup'
TABLE_PREFIX = 'IndustryPortal-'

# 自定义 JSON 编码器处理 Decimal 类型
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def export_table(dynamodb, table_name, backup_dir):
    """导出单个表的所有数据"""
    print(f"正在导出表: {table_name}")
    
    table = dynamodb.Table(table_name)
    
    # 扫描表获取所有数据
    items = []
    response = table.scan()
    items.extend(response.get('Items', []))
    
    # 处理分页
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response.get('Items', []))
    
    # 保存到文件
    filename = os.path.join(backup_dir, f"{table_name}.json")
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(items, f, cls=DecimalEncoder, ensure_ascii=False, indent=2)
    
    print(f"  ✓ 导出 {len(items)} 条记录到 {filename}")
    return len(items)

def export_all_tables():
    """导出所有 IndustryPortal 表"""
    # 创建备份目录
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = f"{BACKUP_DIR}_{timestamp}"
    os.makedirs(backup_dir, exist_ok=True)
    
    # 初始化 DynamoDB 客户端
    dynamodb_client = boto3.client('dynamodb', region_name=REGION)
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    
    # 获取所有表
    response = dynamodb_client.list_tables()
    all_tables = response['TableNames']
    
    # 过滤 IndustryPortal 表
    portal_tables = [t for t in all_tables if t.startswith(TABLE_PREFIX)]
    
    print(f"\n找到 {len(portal_tables)} 个 IndustryPortal 表")
    print("=" * 60)
    
    total_items = 0
    for table_name in portal_tables:
        try:
            count = export_table(dynamodb, table_name, backup_dir)
            total_items += count
        except Exception as e:
            print(f"  ✗ 导出失败: {e}")
    
    # 保存元数据
    metadata = {
        'backup_time': timestamp,
        'region': REGION,
        'tables': portal_tables,
        'total_items': total_items
    }
    
    metadata_file = os.path.join(backup_dir, '_metadata.json')
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    print("=" * 60)
    print(f"✓ 备份完成！共导出 {total_items} 条记录")
    print(f"✓ 备份目录: {backup_dir}")
    
    return backup_dir

if __name__ == '__main__':
    try:
        backup_dir = export_all_tables()
        print(f"\n使用以下命令恢复数据:")
        print(f"  python scripts/restore-dynamodb.py {backup_dir}")
    except Exception as e:
        print(f"\n✗ 备份失败: {e}")
        import traceback
        traceback.print_exc()
