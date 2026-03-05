#!/usr/bin/env python3
"""
DynamoDB 表重建与数据迁移工具（含 PK/SK 优化）

优化内容：
- Industries: PK: INDUSTRY#{id} → id, 新增 VisibilityIndex GSI
- SubIndustries: PK: INDUSTRY#{industryId}, SK: SUBINDUSTRY#{id} → PK: id, SK: METADATA, 新增 IndustryIndex GSI
- UseCases: PK: SUBINDUSTRY#{subIndustryId}, SK: USECASE#{id} → PK: id, SK: METADATA, 新增 SubIndustryIndex/IndustryIndex GSI
- Solutions: PK: SOLUTION#{id} → id
- CustomerCases: PK: CUSTOMERCASE#{id} → id
- News/Blogs/Users/Accounts/Companies/Mapping/NewsFeeds: 保持不变
"""

import boto3
import json
import os
import sys
import time
from decimal import Decimal

REGION = 'us-east-2'

# ============================================================
# 新表结构定义
# ============================================================
TABLE_DEFINITIONS = {
    'IndustryPortal-Industries': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [
            {
                'IndexName': 'VisibilityIndex',
                'KeySchema': [
                    {'AttributeName': 'isVisibleStr', 'KeyType': 'HASH'},
                    {'AttributeName': 'createdAt', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'extra_attrs': [
                    {'AttributeName': 'isVisibleStr', 'AttributeType': 'S'},
                    {'AttributeName': 'createdAt', 'AttributeType': 'S'},
                ],
            }
        ],
        'stream': 'NEW_AND_OLD_IMAGES',
    },
    'IndustryPortal-SubIndustries': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [
            {
                'IndexName': 'IndustryIndex',
                'KeySchema': [
                    {'AttributeName': 'industryId', 'KeyType': 'HASH'},
                    {'AttributeName': 'priority', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'extra_attrs': [
                    {'AttributeName': 'industryId', 'AttributeType': 'S'},
                    {'AttributeName': 'priority', 'AttributeType': 'N'},
                ],
            }
        ],
        'stream': 'NEW_AND_OLD_IMAGES',
    },
    'IndustryPortal-UseCases': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [
            {
                'IndexName': 'SubIndustryIndex',
                'KeySchema': [
                    {'AttributeName': 'subIndustryId', 'KeyType': 'HASH'},
                    {'AttributeName': 'recommendationScore', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'extra_attrs': [
                    {'AttributeName': 'subIndustryId', 'AttributeType': 'S'},
                    {'AttributeName': 'recommendationScore', 'AttributeType': 'N'},
                ],
            },
            {
                'IndexName': 'IndustryIndex',
                'KeySchema': [
                    {'AttributeName': 'industryId', 'KeyType': 'HASH'},
                    {'AttributeName': 'createdAt', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'extra_attrs': [
                    {'AttributeName': 'industryId', 'AttributeType': 'S'},
                    {'AttributeName': 'createdAt', 'AttributeType': 'S'},
                ],
            },
        ],
    },
    'IndustryPortal-Solutions': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [],
    },
    'IndustryPortal-UseCaseSolutionMapping': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [
            {
                'IndexName': 'ReverseIndex',
                'KeySchema': [
                    {'AttributeName': 'GSI_PK', 'KeyType': 'HASH'},
                    {'AttributeName': 'GSI_SK', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'extra_attrs': [
                    {'AttributeName': 'GSI_PK', 'AttributeType': 'S'},
                    {'AttributeName': 'GSI_SK', 'AttributeType': 'S'},
                ],
            }
        ],
    },
    'IndustryPortal-CustomerCases': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [],
    },
    'IndustryPortal-Users': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [],
    },
    'IndustryPortal-News': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [
            {
                'IndexName': 'IndustryIndex',
                'KeySchema': [
                    {'AttributeName': 'industryId', 'KeyType': 'HASH'},
                    {'AttributeName': 'publishedAt', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'extra_attrs': [
                    {'AttributeName': 'industryId', 'AttributeType': 'S'},
                    {'AttributeName': 'publishedAt', 'AttributeType': 'S'},
                ],
            }
        ],
    },
    'IndustryPortal-NewsFeeds': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [
            {
                'IndexName': 'IndustryIndex',
                'KeySchema': [
                    {'AttributeName': 'industryId', 'KeyType': 'HASH'},
                    {'AttributeName': 'createdAt', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'extra_attrs': [
                    {'AttributeName': 'industryId', 'AttributeType': 'S'},
                    {'AttributeName': 'createdAt', 'AttributeType': 'S'},
                ],
            }
        ],
    },
    'IndustryPortal-Blogs': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [
            {
                'IndexName': 'IndustryIndex',
                'KeySchema': [
                    {'AttributeName': 'industryId', 'KeyType': 'HASH'},
                    {'AttributeName': 'publishedAt', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'extra_attrs': [
                    {'AttributeName': 'industryId', 'AttributeType': 'S'},
                    {'AttributeName': 'publishedAt', 'AttributeType': 'S'},
                ],
            }
        ],
    },
    'IndustryPortal-Accounts': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [],
    },
    'IndustryPortal-Companies': {
        'keys': {'PK': 'S', 'SK': 'S'},
        'gsi': [
            {
                'IndexName': 'NameIndex',
                'KeySchema': [{'AttributeName': 'normalizedName', 'KeyType': 'HASH'}],
                'Projection': {'ProjectionType': 'ALL'},
                'extra_attrs': [{'AttributeName': 'normalizedName', 'AttributeType': 'S'}],
            }
        ],
    },
}


# ============================================================
# 数据转换规则：旧 PK/SK → 新 PK/SK
# ============================================================
def transform_item(table_name, item):
    """根据表名转换 PK/SK 到新结构"""

    if table_name == 'IndustryPortal-Industries':
        # 旧: PK=INDUSTRY#{id}, SK=METADATA → 新: PK=id, SK=METADATA
        old_pk = item.get('PK', '')
        if old_pk.startswith('INDUSTRY#'):
            item['PK'] = item['id']
        # 添加 isVisibleStr 用于 VisibilityIndex GSI
        item['isVisibleStr'] = 'true' if item.get('isVisible', False) else 'false'

    elif table_name == 'IndustryPortal-SubIndustries':
        # 旧: PK=INDUSTRY#{industryId}, SK=SUBINDUSTRY#{subIndustryId}
        # 新: PK=id, SK=METADATA
        item['PK'] = item['id']
        item['SK'] = 'METADATA'
        if 'priority' not in item or item['priority'] is None:
            item['priority'] = 0

    elif table_name == 'IndustryPortal-UseCases':
        # 旧: PK=SUBINDUSTRY#{subIndustryId}, SK=USECASE#{useCaseId}
        # 新: PK=id, SK=METADATA
        item['PK'] = item['id']
        item['SK'] = 'METADATA'
        if 'recommendationScore' not in item or item['recommendationScore'] is None:
            item['recommendationScore'] = 3

    elif table_name == 'IndustryPortal-Solutions':
        # 旧: PK=SOLUTION#{id} → 新: PK=id
        old_pk = item.get('PK', '')
        if old_pk.startswith('SOLUTION#'):
            item['PK'] = item['id']

    elif table_name == 'IndustryPortal-CustomerCases':
        # 旧: PK=CUSTOMERCASE#{id} → 新: PK=id
        old_pk = item.get('PK', '')
        if old_pk.startswith('CUSTOMERCASE#'):
            item['PK'] = item['id']

    return item


# ============================================================
# 工具函数
# ============================================================
def convert_floats_to_decimal(obj):
    if isinstance(obj, list):
        return [convert_floats_to_decimal(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    return obj


def wait_for_table_delete(client, table_name, timeout=120):
    start = time.time()
    while time.time() - start < timeout:
        try:
            client.describe_table(TableName=table_name)
            print(f"  等待 {table_name} 删除中...")
            time.sleep(3)
        except client.exceptions.ResourceNotFoundException:
            return True
    raise TimeoutError(f"等待 {table_name} 删除超时")


def wait_for_table_active(client, table_name, timeout=180):
    start = time.time()
    while time.time() - start < timeout:
        resp = client.describe_table(TableName=table_name)
        status = resp['Table']['TableStatus']
        if status == 'ACTIVE':
            gsis = resp['Table'].get('GlobalSecondaryIndexes', [])
            all_active = all(g['IndexStatus'] == 'ACTIVE' for g in gsis)
            if all_active:
                return True
        print(f"  等待 {table_name} 就绪... (状态: {status})")
        time.sleep(3)
    raise TimeoutError(f"等待 {table_name} 就绪超时")


def delete_table(client, table_name):
    try:
        client.delete_table(TableName=table_name)
        print(f"  正在删除 {table_name}...")
        wait_for_table_delete(client, table_name)
        print(f"  ✓ {table_name} 已删除")
    except client.exceptions.ResourceNotFoundException:
        print(f"  ⚠ {table_name} 不存在，跳过删除")


def create_table(client, table_name, definition):
    keys = definition['keys']
    gsi_list = definition.get('gsi', [])
    stream_spec = definition.get('stream')

    attr_defs = [
        {'AttributeName': 'PK', 'AttributeType': keys['PK']},
        {'AttributeName': 'SK', 'AttributeType': keys['SK']},
    ]
    seen = {'PK', 'SK'}
    for gsi in gsi_list:
        for attr in gsi.get('extra_attrs', []):
            if attr['AttributeName'] not in seen:
                attr_defs.append(attr)
                seen.add(attr['AttributeName'])

    params = {
        'TableName': table_name,
        'KeySchema': [
            {'AttributeName': 'PK', 'KeyType': 'HASH'},
            {'AttributeName': 'SK', 'KeyType': 'RANGE'},
        ],
        'AttributeDefinitions': attr_defs,
        'BillingMode': 'PAY_PER_REQUEST',
    }
    if gsi_list:
        params['GlobalSecondaryIndexes'] = [
            {'IndexName': g['IndexName'], 'KeySchema': g['KeySchema'], 'Projection': g['Projection']}
            for g in gsi_list
        ]
    if stream_spec:
        params['StreamSpecification'] = {'StreamEnabled': True, 'StreamViewType': stream_spec}

    client.create_table(**params)
    print(f"  正在创建 {table_name}...")
    wait_for_table_active(client, table_name)
    print(f"  ✓ {table_name} 已创建 (含 {len(gsi_list)} 个 GSI)")


def import_data(dynamodb_resource, table_name, backup_file):
    if not os.path.exists(backup_file):
        print(f"  ⚠ 备份文件不存在: {backup_file}，跳过导入")
        return 0

    with open(backup_file, 'r', encoding='utf-8') as f:
        items = json.load(f)

    if not items:
        print(f"  ⚠ {table_name} 备份为空")
        return 0

    table = dynamodb_resource.Table(table_name)
    count = 0

    for i in range(0, len(items), 25):
        batch = items[i:i + 25]
        with table.batch_writer() as writer:
            for item in batch:
                item = transform_item(table_name, item)
                item = convert_floats_to_decimal(item)
                writer.put_item(Item=item)
                count += 1
        if count % 100 == 0 and count > 0:
            print(f"  已导入 {count}/{len(items)}...")

    print(f"  ✓ 导入 {count} 条记录")
    return count


# ============================================================
# 主流程
# ============================================================
def main():
    if len(sys.argv) < 2:
        print("用法: python scripts/recreate-tables.py <backup_directory> [table_name ...]")
        print("示例:")
        print("  全部重建: python scripts/recreate-tables.py dynamodb-backup_20260305_163458")
        print("  指定表:   python scripts/recreate-tables.py dynamodb-backup_20260305_163458 IndustryPortal-SubIndustries IndustryPortal-UseCases")
        sys.exit(1)

    backup_dir = sys.argv[1]
    specified = sys.argv[2:] if len(sys.argv) > 2 else None

    if not os.path.exists(backup_dir):
        print(f"✗ 备份目录不存在: {backup_dir}")
        sys.exit(1)

    client = boto3.client('dynamodb', region_name=REGION)
    dynamodb = boto3.resource('dynamodb', region_name=REGION)

    if specified:
        tables = {t: TABLE_DEFINITIONS[t] for t in specified if t in TABLE_DEFINITIONS}
        unknown = [t for t in specified if t not in TABLE_DEFINITIONS]
        if unknown:
            print(f"⚠ 未知表名: {', '.join(unknown)}")
    else:
        tables = TABLE_DEFINITIONS

    print(f"\n即将重建 {len(tables)} 个表（含 PK/SK 优化）:")
    for t in tables:
        gsi_count = len(tables[t].get('gsi', []))
        print(f"  - {t} ({gsi_count} 个 GSI)")

    print("\nPK/SK 变更:")
    print("  Industries:    PK: INDUSTRY#{id} → id")
    print("  SubIndustries: PK: INDUSTRY#{industryId}, SK: SUBINDUSTRY#{id} → PK: id, SK: METADATA")
    print("  UseCases:      PK: SUBINDUSTRY#{subIndustryId}, SK: USECASE#{id} → PK: id, SK: METADATA")
    print("  Solutions:     PK: SOLUTION#{id} → id")
    print("  CustomerCases: PK: CUSTOMERCASE#{id} → id")

    print(f"\n备份目录: {backup_dir}")
    confirm = input("\n⚠ 此操作将删除并重建以上表，数据将从备份恢复（含 PK/SK 转换）。确认继续？(yes/no): ")
    if confirm.lower() != 'yes':
        print("已取消")
        sys.exit(0)

    total = 0
    for table_name, definition in tables.items():
        print(f"\n{'='*60}")
        print(f"处理表: {table_name}")
        print(f"{'='*60}")
        delete_table(client, table_name)
        create_table(client, table_name, definition)
        backup_file = os.path.join(backup_dir, f"{table_name}.json")
        count = import_data(dynamodb, table_name, backup_file)
        total += count

    print(f"\n{'='*60}")
    print(f"✓ 全部完成！共导入 {total} 条记录")
    print(f"{'='*60}")
    print(f"\n⚠ 注意：PK/SK 已变更，需要同步更新后端 Lambda 代码！")


if __name__ == '__main__':
    main()


# ============================================================
# 数据转换规则：旧 PK/SK → 新 PK/SK
# ============================================================
def transform_item(table_name, item):
    """根据表名转换 PK/SK 到新结构"""
    if table_name == 'IndustryPortal-Industries':
        # PK: INDUSTRY#{id} → id
        old_pk = item.get('PK', '')
        if old_pk.startswith('INDUSTRY#'):
            item['PK'] = item['id']
        # 添加 isVisibleStr（DynamoDB GSI key 不支持 Boolean）
        item['isVisibleStr'] = 'true' if item.get('isVisible', False) else 'false'

    elif table_name == 'IndustryPortal-SubIndustries':
        # PK: INDUSTRY#{industryId}, SK: SUBINDUSTRY#{id} → PK: id, SK: METADATA
        item['PK'] = item['id']
        item['SK'] = 'METADATA'
        if 'priority' not in item or item['priority'] is None:
            item['priority'] = 0

    elif table_name == 'IndustryPortal-UseCases':
        # PK: SUBINDUSTRY#{subIndustryId}, SK: USECASE#{id} → PK: id, SK: METADATA
        item['PK'] = item['id']
        item['SK'] = 'METADATA'
        if 'recommendationScore' not in item or item['recommendationScore'] is None:
            item['recommendationScore'] = 3

    elif table_name == 'IndustryPortal-Solutions':
        # PK: SOLUTION#{id} → id
        old_pk = item.get('PK', '')
        if old_pk.startswith('SOLUTION#'):
            item['PK'] = item['id']

    elif table_name == 'IndustryPortal-CustomerCases':
        # PK: CUSTOMERCASE#{id} → id
        old_pk = item.get('PK', '')
        if old_pk.startswith('CUSTOMERCASE#'):
            item['PK'] = item['id']

    return item


# ============================================================
# 工具函数
# ============================================================
def convert_floats_to_decimal(obj):
    if isinstance(obj, list):
        return [convert_floats_to_decimal(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    return obj


def wait_for_table_delete(client, table_name, timeout=120):
    start = time.time()
    while time.time() - start < timeout:
        try:
            client.describe_table(TableName=table_name)
            print(f"  等待 {table_name} 删除中...")
            time.sleep(3)
        except client.exceptions.ResourceNotFoundException:
            return True
    raise TimeoutError(f"等待 {table_name} 删除超时")


def wait_for_table_active(client, table_name, timeout=180):
    start = time.time()
    while time.time() - start < timeout:
        resp = client.describe_table(TableName=table_name)
        status = resp['Table']['TableStatus']
        if status == 'ACTIVE':
            gsis = resp['Table'].get('GlobalSecondaryIndexes', [])
            if all(g['IndexStatus'] == 'ACTIVE' for g in gsis):
                return True
        print(f"  等待 {table_name} 就绪... (状态: {status})")
        time.sleep(3)
    raise TimeoutError(f"等待 {table_name} 就绪超时")


def delete_table(client, table_name):
    try:
        client.delete_table(TableName=table_name)
        print(f"  正在删除 {table_name}...")
        wait_for_table_delete(client, table_name)
        print(f"  ✓ {table_name} 已删除")
    except client.exceptions.ResourceNotFoundException:
        print(f"  ⚠ {table_name} 不存在，跳过删除")


def create_table(client, table_name, definition):
    keys = definition['keys']
    gsi_list = definition.get('gsi', [])
    stream_spec = definition.get('stream')

    attr_defs = [
        {'AttributeName': 'PK', 'AttributeType': keys['PK']},
        {'AttributeName': 'SK', 'AttributeType': keys['SK']},
    ]
    seen = {'PK', 'SK'}
    for gsi in gsi_list:
        for attr in gsi.get('extra_attrs', []):
            if attr['AttributeName'] not in seen:
                attr_defs.append(attr)
                seen.add(attr['AttributeName'])

    params = {
        'TableName': table_name,
        'KeySchema': [
            {'AttributeName': 'PK', 'KeyType': 'HASH'},
            {'AttributeName': 'SK', 'KeyType': 'RANGE'},
        ],
        'AttributeDefinitions': attr_defs,
        'BillingMode': 'PAY_PER_REQUEST',
    }
    if gsi_list:
        params['GlobalSecondaryIndexes'] = [
            {'IndexName': g['IndexName'], 'KeySchema': g['KeySchema'], 'Projection': g['Projection']}
            for g in gsi_list
        ]
    if stream_spec:
        params['StreamSpecification'] = {'StreamEnabled': True, 'StreamViewType': stream_spec}

    client.create_table(**params)
    print(f"  正在创建 {table_name}...")
    wait_for_table_active(client, table_name)
    print(f"  ✓ {table_name} 已创建 (含 {len(gsi_list)} 个 GSI)")


def import_data(dynamodb_resource, table_name, backup_file):
    if not os.path.exists(backup_file):
        print(f"  ⚠ 备份文件不存在: {backup_file}，跳过导入")
        return 0

    with open(backup_file, 'r', encoding='utf-8') as f:
        items = json.load(f)

    if not items:
        print(f"  ⚠ {table_name} 备份为空")
        return 0

    table = dynamodb_resource.Table(table_name)
    count = 0

    for i in range(0, len(items), 25):
        batch = items[i:i + 25]
        with table.batch_writer() as writer:
            for item in batch:
                item = transform_item(table_name, item)
                item = convert_floats_to_decimal(item)
                writer.put_item(Item=item)
                count += 1
        if count % 100 == 0 and count > 0:
            print(f"  已导入 {count}/{len(items)}...")

    print(f"  ✓ 导入 {count} 条记录")
    return count


# ============================================================
# 主流程
# ============================================================
def main():
    if len(sys.argv) < 2:
        print("用法: python scripts/recreate-tables.py <backup_directory> [table_name ...]")
        print("示例:")
        print("  全部重建: python scripts/recreate-tables.py dynamodb-backup_20260305_163458")
        print("  指定表:   python scripts/recreate-tables.py dynamodb-backup_20260305_163458 IndustryPortal-SubIndustries IndustryPortal-UseCases")
        sys.exit(1)

    backup_dir = sys.argv[1]
    specified = sys.argv[2:] if len(sys.argv) > 2 else None

    if not os.path.exists(backup_dir):
        print(f"✗ 备份目录不存在: {backup_dir}")
        sys.exit(1)

    client = boto3.client('dynamodb', region_name=REGION)
    dynamodb = boto3.resource('dynamodb', region_name=REGION)

    if specified:
        tables = {t: TABLE_DEFINITIONS[t] for t in specified if t in TABLE_DEFINITIONS}
        unknown = [t for t in specified if t not in TABLE_DEFINITIONS]
        if unknown:
            print(f"⚠ 未知表名: {', '.join(unknown)}")
    else:
        tables = TABLE_DEFINITIONS

    print(f"\n即将重建 {len(tables)} 个表（含 PK/SK 优化）:")
    for t in tables:
        gsi_count = len(tables[t].get('gsi', []))
        print(f"  - {t} ({gsi_count} 个 GSI)")

    print("\nPK/SK 变更:")
    print("  Industries:    PK: INDUSTRY#{id} → id")
    print("  SubIndustries: PK: INDUSTRY#{industryId}, SK: SUBINDUSTRY#{id} → PK: id, SK: METADATA")
    print("  UseCases:      PK: SUBINDUSTRY#{subIndustryId}, SK: USECASE#{id} → PK: id, SK: METADATA")
    print("  Solutions:     PK: SOLUTION#{id} → id")
    print("  CustomerCases: PK: CUSTOMERCASE#{id} → id")

    print(f"\n备份目录: {backup_dir}")
    confirm = input("\n⚠ 此操作将删除并重建以上表，数据将从备份恢复（含 PK/SK 转换）。确认继续？(yes/no): ")
    if confirm.lower() != 'yes':
        print("已取消")
        sys.exit(0)

    total = 0
    for table_name, definition in tables.items():
        print(f"\n{'='*60}")
        print(f"处理表: {table_name}")
        print(f"{'='*60}")
        delete_table(client, table_name)
        create_table(client, table_name, definition)
        backup_file = os.path.join(backup_dir, f"{table_name}.json")
        count = import_data(dynamodb, table_name, backup_file)
        total += count

    print(f"\n{'='*60}")
    print(f"✓ 全部完成！共导入 {total} 条记录")
    print(f"{'='*60}")
    print(f"\n⚠ 注意：PK/SK 已变更，需要同步更新后端 Lambda 代码！")


if __name__ == '__main__':
    main()
