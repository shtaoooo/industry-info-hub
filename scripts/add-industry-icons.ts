/**
 * Script to add icon URLs to existing industries in DynamoDB
 * 
 * This script updates each tier1 industry with an icon path
 * Icons should be placed in frontend/public/images/icons/
 * 
 * Usage:
 * 1. Set AWS credentials and region
 * 2. Run: npx ts-node scripts/add-industry-icons.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-2' })
const docClient = DynamoDBDocumentClient.from(client)

const INDUSTRIES_TABLE = 'IndustryPortal-Industries'

// Industry icon paths
// These icons are stored in frontend/public/images/icons/
const industryIcons: { [key: string]: string } = {
  'Healthcare': '/images/icons/healthcare.svg',
  'Financial Services': '/images/icons/finance.svg',
  'Manufacturing': '/images/icons/manufacturing.svg',
  'Retail & Wholesale': '/images/icons/retail.svg',
  'Education': '/images/icons/education.svg',
  'Transportation & Logistics': '/images/icons/logistics.svg',
  'Energy - Power & Utilities': '/images/icons/energy.svg',
  'Energy - Oil & Gas': '/images/icons/energy.svg',
  'Telecommunications': '/images/icons/telecom.svg',
  'Engineering, Construction & Real Estate': '/images/icons/construction.svg',
  'Automotive': '/images/icons/automotive.svg',
  'Agriculture': '/images/icons/agriculture.svg',
  'Travel': '/images/icons/tourism.svg',
  'Hospitality': '/images/icons/tourism.svg',
  'Media & Entertainment': '/images/icons/media.svg',
  'Software & Internet': '/images/icons/technology.svg',
  'Hi Tech, Electronics & Semiconductor': '/images/icons/technology.svg',
  'General Public Services': '/images/icons/government.svg',
  'Justice & Public Safety': '/images/icons/government.svg',
  'Social Services': '/images/icons/government.svg',
  'Aerospace & Satellite': '/images/icons/aerospace.svg',
  'Defense & Intelligence': '/images/icons/aerospace.svg',
  'Professional Services': '/images/icons/professional.svg',
  'Advertising & Marketing': '/images/icons/media.svg',
  'Consumer Packaged Goods': '/images/icons/food.svg',
  'Life Sciences': '/images/icons/healthcare.svg',
  'Games': '/images/icons/media.svg',
  'Mining & Minerals': '/images/icons/chemical.svg',
  'Environmental Protection': '/images/icons/energy.svg',
}

async function addIndustryIcons() {
  try {
    console.log('Fetching all industries...')
    
    // Scan for all industries
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: INDUSTRIES_TABLE,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    const industries = scanResult.Items || []
    console.log(`Found ${industries.length} industries`)

    let updated = 0
    let skipped = 0

    for (const industry of industries) {
      const iconUrl = industryIcons[industry.name]

      if (iconUrl) {
        console.log(`Updating ${industry.name} with icon: ${iconUrl}`)
        
        await docClient.send(
          new UpdateCommand({
            TableName: INDUSTRIES_TABLE,
            Key: {
              PK: industry.PK,
              SK: industry.SK,
            },
            UpdateExpression: 'SET icon = :icon',
            ExpressionAttributeValues: {
              ':icon': iconUrl,
            },
          })
        )
        
        updated++
      } else {
        console.log(`No icon mapping found for: ${industry.name}`)
        skipped++
      }
    }

    console.log('\n=== Summary ===')
    console.log(`Total industries: ${industries.length}`)
    console.log(`Updated: ${updated}`)
    console.log(`Skipped: ${skipped}`)
    console.log('\nDone!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

addIndustryIcons()
