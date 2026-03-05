#!/usr/bin/env python3
"""
DynamoDB 恢复工具
从备份的 JSON 文件恢复数据到 DynamoDB 表
"""

import boto3
import json
import os
import sys
from decimal import Decimal

# 配置
REGION = 'us-east-2'

def convert_floats_to_decimal(obj):
    """递归转换 float 为 Decimal（DynamoDB 要求）"""
    if isinstance(obj, list):
        return [convert_floats_to_decimal(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_floats_to_decimal(value) for key, value in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj

def import_table(dynamodb, table_name, backup_file):
    """导入数据到单个表"""
    print(f"正在导入表: {table_name}")
    
    # 读取备份文件
    with open(backup_file, 'r', encoding='utf-8') as f:
        items = json.load(f)
    
    if not items:
        print(f"  ⚠ 表为空，跳过")
        return 0
    
    table = dynamodb.Table(table_name)
    
    # 批量写入（每批最多 25 条）
    imported_count = 0
    batch_size = 25
    
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        
        with table.batch_writer() as writer:
            for item in batch:
                # 转换 float 为 Decimal
                item = convert_floats_to_decimal(item)
                writer.put_item(Item=item)
                imported_count += 1
        
        if imported_count % 100 == 0:
            print(f"  已导入 {imported_count}/{len(items)} 条记录...")
    
    print(f"  ✓ 成功导入 {imported_count} 条记录")
    return imported_count

def restore_all_tables(backup_dir):
    """从备份目录恢复所有表"""
    if not os.path.exists(backup_dir):
        print(f"✗ 备份目录不存在: {backup_dir}")
        return
    
    # 读取元数据
    metadata_file = os.path.join(backup_dir, '_metadata.json')
    if not os.path.exists(metadata_file):
        print(f"✗ 找不到元数据文件: {metadata_file}")
        return
    
    with open(metadata_file, 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    
    print(f"\n备份信息:")
    print(f"  时间: {metadata['backup_time']}")
    print(f"  区域: {metadata['region']}")
    print(f"  表数量: {len(metadata['tables'])}")
    print(f"  总记录数: {metadata['total_items']}")
    print("=" * 60)
    
    # 初始化 DynamoDB
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    
    total_imported = 0
    for table_name in metadata['tables']:
        backup_file = os.path.join(backup_dir, f"{table_name}.json")
        
        if not os.path.exists(backup_file):
            print(f"⚠ 跳过 {table_name}: 备份文件不存在")
            continue
        
        try:
            count = import_table(dynamodb, table_name, backup_file)
            total_imported += count
        except Exception as e:
            print(f"  ✗ 导入失败: {e}")
            import traceback
            traceback.print_exc()
    
    print("=" * 60)
    print(f"✓ 恢复完成！共导入 {total_imported} 条记录")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python scripts/restore-dynamodb.py <backup_directory>")
        print("示例: python scripts/restore-dynamodb.py dynamodb-backup_20250305_123456")
        sys.exit(1)
    
    backup_dir = sys.argv[1]
    
    try:
        restore_all_tables(backup_dir)
    except Exception as e:
        print(f"\n✗ 恢复失败: {e}")
        import traceback
        traceback.print_exc()
