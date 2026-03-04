#!/usr/bin/env python3
"""
Initialize level field for all existing sub-industries to 'Tier2-individual'
"""

import boto3
import sys

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
table = dynamodb.Table('IndustryPortal-SubIndustries')

def update_subindustry_levels():
    """Scan all sub-industries and set level to 'Tier2-individual'"""
    
    print("Scanning SubIndustries table...")
    
    # Scan all items
    response = table.scan()
    items = response.get('Items', [])
    
    # Handle pagination
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response.get('Items', []))
    
    print(f"Found {len(items)} sub-industry records")
    
    updated_count = 0
    skipped_count = 0
    
    for item in items:
        pk = item.get('PK')
        sk = item.get('SK')
        current_level = item.get('level')
        
        # Skip if already has a level
        if current_level:
            print(f"Skipping {item.get('name', 'Unknown')} - already has level: {current_level}")
            skipped_count += 1
            continue
        
        # Update the item
        try:
            table.update_item(
                Key={
                    'PK': pk,
                    'SK': sk
                },
                UpdateExpression='SET #level = :level',
                ExpressionAttributeNames={
                    '#level': 'level'
                },
                ExpressionAttributeValues={
                    ':level': 'Tier2-individual'
                }
            )
            print(f"Updated {item.get('name', 'Unknown')} to Tier2-individual")
            updated_count += 1
        except Exception as e:
            print(f"Error updating {item.get('name', 'Unknown')}: {str(e)}")
    
    print(f"\nCompleted!")
    print(f"Updated: {updated_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Total: {len(items)}")

if __name__ == '__main__':
    try:
        update_subindustry_levels()
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
