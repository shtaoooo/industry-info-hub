#!/usr/bin/env python3
"""
Migrate Use Case fields to Markdown files in S3

This script reads all use cases from DynamoDB, combines the four fields
(businessScenario, customerPainPoints, targetAudience, communicationScript)
into a single markdown file, uploads it to S3, and updates the DynamoDB record
with the S3 key and summary field.

Usage:
    python scripts/migrate-usecase-to-markdown.py --region us-east-2 --dry-run
    python scripts/migrate-usecase-to-markdown.py --region us-east-2
"""

import boto3
import argparse
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Configuration
TABLE_NAME = 'IndustryPortal-UseCases'
BUCKET_NAME = 'industry-portal-docs-v2-880755836258'
S3_PREFIX = 'docs/usecase/'


def create_markdown_content(use_case: Dict) -> str:
    """
    Create markdown content from use case fields.
    
    Args:
        use_case: DynamoDB use case item
        
    Returns:
        Markdown formatted string
    """
    business_scenario = use_case.get('businessScenario', '')
    customer_pain_points = use_case.get('customerPainPoints', '')
    target_audience = use_case.get('targetAudience', '')
    communication_script = use_case.get('communicationScript', '')
    
    # Build markdown content
    markdown_parts = []
    
    # Add business scenario
    if business_scenario:
        markdown_parts.append("## 📋 业务场景\n")
        markdown_parts.append(f"{business_scenario}\n")
    
    # Add customer pain points
    if customer_pain_points:
        markdown_parts.append("## 🎯 客户痛点\n")
        markdown_parts.append(f"{customer_pain_points}\n")
    
    # Add target audience
    if target_audience:
        markdown_parts.append("## 👥 切入人群\n")
        markdown_parts.append(f"{target_audience}\n")
    
    # Add communication script
    if communication_script:
        markdown_parts.append("## 💬 沟通话术\n")
        markdown_parts.append(f"> {communication_script}\n")
    
    return "\n".join(markdown_parts)


def create_summary(use_case: Dict) -> str:
    """
    Create a summary from the business scenario or description.
    
    Args:
        use_case: DynamoDB use case item
        
    Returns:
        Summary string (max 500 chars)
    """
    business_scenario = use_case.get('businessScenario', '')
    description = use_case.get('description', '')
    
    # Use business scenario if available, otherwise use description
    summary_text = business_scenario if business_scenario else description
    
    # Truncate to 500 characters
    if len(summary_text) > 500:
        summary_text = summary_text[:497] + '...'
    
    return summary_text


def scan_use_cases(dynamodb_client, table_name: str) -> List[Dict]:
    """
    Scan all use cases from DynamoDB.
    
    Args:
        dynamodb_client: Boto3 DynamoDB client
        table_name: DynamoDB table name
        
    Returns:
        List of use case items
    """
    print(f"Scanning use cases from table: {table_name}")
    
    use_cases = []
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
            use_case = {}
            for key, value in item.items():
                if 'S' in value:
                    use_case[key] = value['S']
                elif 'N' in value:
                    use_case[key] = int(value['N'])
                elif 'L' in value:
                    use_case[key] = value['L']
                elif 'M' in value:
                    use_case[key] = value['M']
            
            use_cases.append(use_case)
        
        # Check if there are more items to scan
        if 'LastEvaluatedKey' not in response:
            break
        
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    print(f"Found {len(use_cases)} use cases")
    return use_cases


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
            ServerSideEncryption='AES256'
        )
        return True
    except Exception as e:
        print(f"  ❌ Error uploading to S3: {e}")
        return False


def update_dynamodb_record(dynamodb_client, table_name: str, use_case_id: str, 
                           summary: str) -> bool:
    """
    Update DynamoDB record with summary only.
    S3 key is derived from ID, so no need to store it.
    
    Args:
        dynamodb_client: Boto3 DynamoDB client
        table_name: DynamoDB table name
        use_case_id: Use case ID
        summary: Summary text
        
    Returns:
        True if successful, False otherwise
    """
    try:
        now = datetime.utcnow().isoformat() + 'Z'
        
        dynamodb_client.update_item(
            TableName=table_name,
            Key={
                'PK': {'S': use_case_id},
                'SK': {'S': 'METADATA'}
            },
            UpdateExpression='SET summary = :summary, updatedAt = :updated',
            ExpressionAttributeValues={
                ':summary': {'S': summary},
                ':updated': {'S': now}
            }
        )
        return True
    except Exception as e:
        print(f"  ❌ Error updating DynamoDB: {e}")
        return False


def migrate_use_case(use_case: Dict, s3_client, dynamodb_client, 
                     bucket_name: str, table_name: str, dry_run: bool) -> bool:
    """
    Migrate a single use case.
    
    Args:
        use_case: Use case item
        s3_client: Boto3 S3 client
        dynamodb_client: Boto3 DynamoDB client
        bucket_name: S3 bucket name
        table_name: DynamoDB table name
        dry_run: If True, don't actually make changes
        
    Returns:
        True if successful, False otherwise
    """
    use_case_id = use_case.get('id', use_case.get('PK', ''))
    use_case_name = use_case.get('name', 'Unknown')
    
    print(f"\n📝 Processing: {use_case_name} (ID: {use_case_id})")
    
    # Check if already has summary (indicating migration was done)
    if use_case.get('summary'):
        print(f"  ⏭️  Already migrated (has summary field)")
        return True
    
    # Check if has any of the four fields
    has_content = any([
        use_case.get('businessScenario'),
        use_case.get('customerPainPoints'),
        use_case.get('targetAudience'),
        use_case.get('communicationScript')
    ])
    
    if not has_content:
        print(f"  ⏭️  No content to migrate (all four fields are empty)")
        return True
    
    # Create markdown content
    markdown_content = create_markdown_content(use_case)
    
    if not markdown_content.strip():
        print(f"  ⏭️  Generated markdown is empty")
        return True
    
    # Create summary
    summary = create_summary(use_case)
    
    # S3 key
    s3_key = f"{S3_PREFIX}{use_case_id}.md"
    
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
    
    # Update DynamoDB (only summary, S3 key is derived from ID)
    print(f"  💾 Updating DynamoDB...")
    if not update_dynamodb_record(dynamodb_client, table_name, use_case_id, summary):
        return False
    
    print(f"  ✅ Successfully migrated")
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Migrate Use Case fields to Markdown files in S3'
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
    print("Use Case Migration to Markdown")
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
    
    # Scan use cases
    use_cases = scan_use_cases(dynamodb_client, args.table)
    
    if not use_cases:
        print("\n❌ No use cases found")
        sys.exit(1)
    
    # Migrate each use case
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for use_case in use_cases:
        try:
            result = migrate_use_case(
                use_case,
                s3_client,
                dynamodb_client,
                args.bucket,
                args.table,
                args.dry_run
            )
            
            if result:
                if use_case.get('summary'):
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
    print(f"Total use cases: {len(use_cases)}")
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
