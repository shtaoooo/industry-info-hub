#!/usr/bin/env python3
"""
Migrate Customer Case fields to Markdown files in S3

This script reads all customer cases from DynamoDB, combines the three fields
(challenge, solution, benefit) into a single markdown file, uploads it to S3,
and updates the DynamoDB record with the S3 key and summary field.

Usage:
    python scripts/migrate-customercase-to-markdown.py --region us-east-2 --dry-run
    python scripts/migrate-customercase-to-markdown.py --region us-east-2
"""

import boto3
import argparse
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Configuration
TABLE_NAME = 'IndustryPortal-CustomerCases'
BUCKET_NAME = 'industry-portal-docs-v2-880755836258'
S3_PREFIX = 'docs/customerCase/'


def create_markdown_content(customer_case: Dict) -> str:
    """
    Create markdown content from customer case fields.
    
    Args:
        customer_case: DynamoDB customer case item
        
    Returns:
        Markdown formatted string
    """
    challenge = customer_case.get('challenge', '')
    solution = customer_case.get('solution', '')
    benefit = customer_case.get('benefit', '')
    
    # Build markdown content
    markdown_parts = []
    
    # Add challenge
    if challenge:
        markdown_parts.append("## 🎯 挑战与痛点\n")
        markdown_parts.append(f"{challenge}\n")
    
    # Add solution
    if solution:
        markdown_parts.append("## 💡 解决方案\n")
        markdown_parts.append(f"{solution}\n")
    
    # Add benefit
    if benefit:
        markdown_parts.append("## ✨ 业务价值\n")
        markdown_parts.append(f"{benefit}\n")
    
    return "\n".join(markdown_parts)


def create_summary(customer_case: Dict) -> str:
    """
    Create a summary from the challenge or first available field.
    
    Args:
        customer_case: DynamoDB customer case item
        
    Returns:
        Summary string (max 500 chars)
    """
    challenge = customer_case.get('challenge', '')
    solution = customer_case.get('solution', '')
    
    # Use challenge if available, otherwise use solution
    summary_text = challenge if challenge else solution
    
    # Truncate to 500 characters
    if len(summary_text) > 500:
        summary_text = summary_text[:497] + '...'
    
    return summary_text


def scan_customer_cases(dynamodb_client, table_name: str) -> List[Dict]:
    """
    Scan all customer cases from DynamoDB.
    
    Args:
        dynamodb_client: Boto3 DynamoDB client
        table_name: DynamoDB table name
        
    Returns:
        List of customer case items
    """
    print(f"Scanning customer cases from table: {table_name}")
    
    customer_cases = []
    scan_kwargs = {
        'TableName': table_name,
        'FilterExpression': 'SK = :sk',
        'ExpressionAttributeValues': {
            ':sk': {'S': 'METADATA'}
        }
    }
    
    while True:
        response = dynamodb_client.scan(**scan_kwargs)
        items = response.get('Items', [])
        
        for item in items:
            # Convert DynamoDB format to Python dict
            customer_case = {}
            for key, value in item.items():
                if 'S' in value:
                    customer_case[key] = value['S']
                elif 'N' in value:
                    customer_case[key] = int(value['N'])
                elif 'L' in value:
                    customer_case[key] = value['L']
                elif 'M' in value:
                    customer_case[key] = value['M']
            
            customer_cases.append(customer_case)
        
        # Check if there are more items to scan
        if 'LastEvaluatedKey' not in response:
            break
        
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    print(f"Found {len(customer_cases)} customer cases")
    return customer_cases


def upload_to_s3(s3_client, bucket_name: str, s3_key: str, content: str) -> bool:
    """
    Upload markdown content to S3.
    
    Args:
        s3_client: Boto3 S3 client
        bucket_name: S3 bucket name
        s3_key: S3 object key
        content: Markdown content
        
    Returns:
        True if successful, False otherwise
    """
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=content.encode('utf-8'),
            ContentType='text/markdown',
            ServerSideEncryption='AES256',
        )
        return True
    except Exception as e:
        print(f"  ❌ Error uploading to S3: {e}")
        return False


def update_dynamodb_record(dynamodb_client, table_name: str, case_id: str, 
                           summary: str, s3_key: str) -> bool:
    """
    Update DynamoDB record with summary and S3 key.
    
    Args:
        dynamodb_client: Boto3 DynamoDB client
        table_name: DynamoDB table name
        case_id: Customer case ID
        summary: Summary text
        s3_key: S3 object key
        
    Returns:
        True if successful, False otherwise
    """
    try:
        now = datetime.utcnow().isoformat() + 'Z'
        
        dynamodb_client.update_item(
            TableName=table_name,
            Key={
                'PK': {'S': case_id},
                'SK': {'S': 'METADATA'}
            },
            UpdateExpression='SET summary = :summary, detailMarkdownS3Key = :s3key, updatedAt = :updated',
            ExpressionAttributeValues={
                ':summary': {'S': summary},
                ':s3key': {'S': s3_key},
                ':updated': {'S': now}
            }
        )
        return True
    except Exception as e:
        print(f"  ❌ Error updating DynamoDB: {e}")
        return False


def migrate_customer_case(customer_case: Dict, s3_client, dynamodb_client, 
                         bucket_name: str, table_name: str, dry_run: bool) -> bool:
    """
    Migrate a single customer case.
    
    Args:
        customer_case: Customer case item
        s3_client: Boto3 S3 client
        dynamodb_client: Boto3 DynamoDB client
        bucket_name: S3 bucket name
        table_name: DynamoDB table name
        dry_run: If True, don't actually make changes
        
    Returns:
        True if successful, False otherwise
    """
    case_id = customer_case.get('id', customer_case.get('PK', ''))
    case_name = customer_case.get('name', 'Unknown')
    
    print(f"\n📝 Processing: {case_name} (ID: {case_id})")
    
    # Check if already has summary (indicating migration was done)
    if customer_case.get('summary'):
        print(f"  ⏭️  Already migrated (has summary field)")
        return True
    
    # Check if has any of the three fields
    has_content = any([
        customer_case.get('challenge'),
        customer_case.get('solution'),
        customer_case.get('benefit')
    ])
    
    if not has_content:
        print(f"  ⏭️  No content to migrate (all three fields are empty)")
        return True
    
    # Create markdown content
    markdown_content = create_markdown_content(customer_case)
    
    if not markdown_content.strip():
        print(f"  ⏭️  Generated markdown is empty")
        return True
    
    # Create summary
    summary = create_summary(customer_case)
    
    # S3 key
    s3_key = f"{S3_PREFIX}{case_id}.md"
    
    print(f"  📄 Markdown size: {len(markdown_content)} bytes")
    print(f"  📝 Summary: {summary[:100]}..." if len(summary) > 100 else f"  📝 Summary: {summary}")
    print(f"  📦 S3 key: {s3_key}")
    
    if dry_run:
        print(f"  🔍 DRY RUN - Would upload to S3 and update DynamoDB")
        return True
    
    # Upload to S3
    print(f"  ⬆️  Uploading to S3...")
    if not upload_to_s3(s3_client, bucket_name, s3_key, markdown_content):
        return False
    
    # Update DynamoDB
    print(f"  💾 Updating DynamoDB...")
    if not update_dynamodb_record(dynamodb_client, table_name, case_id, summary, s3_key):
        return False
    
    print(f"  ✅ Successfully migrated")
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Migrate Customer Case fields to Markdown files in S3'
    )
    parser.add_argument(
        '--region',
        default='us-east-2',
        help='AWS region (default: us-east-2)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Perform a dry run without making changes'
    )
    parser.add_argument(
        '--table',
        default=TABLE_NAME,
        help=f'DynamoDB table name (default: {TABLE_NAME})'
    )
    parser.add_argument(
        '--bucket',
        default=BUCKET_NAME,
        help=f'S3 bucket name (default: {BUCKET_NAME})'
    )
    
    args = parser.parse_args()
    
    print("=" * 80)
    print("Customer Case Migration to Markdown")
    print("=" * 80)
    print(f"Region: {args.region}")
    print(f"Table: {args.table}")
    print(f"Bucket: {args.bucket}")
    print(f"Dry Run: {args.dry_run}")
    print("=" * 80)
    
    if args.dry_run:
        print("\n⚠️  DRY RUN MODE - No changes will be made\n")
    else:
        print("\n⚠️  LIVE MODE - Changes will be made to DynamoDB and S3\n")
        response = input("Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            sys.exit(0)
    
    # Initialize AWS clients
    dynamodb_client = boto3.client('dynamodb', region_name=args.region)
    s3_client = boto3.client('s3', region_name=args.region)
    
    # Scan customer cases
    customer_cases = scan_customer_cases(dynamodb_client, args.table)
    
    if not customer_cases:
        print("\n❌ No customer cases found")
        sys.exit(1)
    
    # Migrate each customer case
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for customer_case in customer_cases:
        try:
            result = migrate_customer_case(
                customer_case,
                s3_client,
                dynamodb_client,
                args.bucket,
                args.table,
                args.dry_run
            )
            
            if result:
                if customer_case.get('summary'):
                    skip_count += 1
                else:
                    success_count += 1
            else:
                error_count += 1
        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")
            error_count += 1
    
    # Summary
    print("\n" + "=" * 80)
    print("Migration Summary")
    print("=" * 80)
    print(f"Total customer cases: {len(customer_cases)}")
    print(f"✅ Successfully migrated: {success_count}")
    print(f"⏭️  Skipped (already migrated): {skip_count}")
    print(f"❌ Errors: {error_count}")
    print("=" * 80)
    
    if args.dry_run:
        print("\n🔍 This was a DRY RUN - no changes were made")
        print("Run without --dry-run to perform the actual migration")
    
    sys.exit(0 if error_count == 0 else 1)


if __name__ == '__main__':
    main()
