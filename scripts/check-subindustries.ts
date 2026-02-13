/**
 * Script to check sub-industries data in DynamoDB
 * 
 * Usage:
 * npx ts-node scripts/check-subindustries.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-2' })
const docClient = DynamoDBDocumentClient.from(client)

const SUB_INDUSTRIES_TABLE = 'IndustryPortal-SubIndustries'

async function checkSubIndustries() {
  console.log('🔍 Checking sub-industries in DynamoDB...\n')

  try {
    const command = new ScanCommand({
      TableName: SUB_INDUSTRIES_TABLE,
      Limit: 10, // Only get first 10 for inspection
    })

    const response = await docClient.send(command)
    const items = response.Items || []

    console.log(`Found ${items.length} sub-industries (showing first 10)\n`)

    if (items.length === 0) {
      console.log('❌ No sub-industries found in the database!')
      console.log('You need to import sub-industries data first.')
      return
    }

    // Display first few items
    items.slice(0, 3).forEach((item, index) => {
      console.log(`\n--- Sub-Industry ${index + 1} ---`)
      console.log('ID:', item.id)
      console.log('Name:', item.name)
      console.log('Industry ID:', item.industryId)
      console.log('Definition:', item.definition ? item.definition.substring(0, 100) + '...' : 'MISSING')
      console.log('Global Companies:', item.typicalGlobalCompanies || 'MISSING')
      console.log('Chinese Companies:', item.typicalChineseCompanies || 'MISSING')
      console.log('PK:', item.PK)
      console.log('SK:', item.SK)
    })

    console.log('\n✅ Sub-industries data exists in the database')
  } catch (error) {
    console.error('❌ Error checking sub-industries:', error)
    process.exit(1)
  }
}

checkSubIndustries()
