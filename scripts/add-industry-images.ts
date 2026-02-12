/**
 * Script to add image URLs to existing industries in DynamoDB
 * 
 * This script updates each tier1 industry with a high-quality image URL from Unsplash
 * 
 * Usage:
 * 1. Set AWS credentials and region
 * 2. Run: npx ts-node scripts/add-industry-images.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-2' })
const docClient = DynamoDBDocumentClient.from(client)

const INDUSTRIES_TABLE = 'IndustryPortal-Industries'

// High-quality industry images from Unsplash
// Each image is carefully selected to represent the industry
const industryImages: { [key: string]: string } = {
  '金融服务': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&q=85',
  '制造业': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=85',
  '零售': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=85',
  '医疗健康': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=85',
  '教育': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=85',
  '物流运输': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=85',
  '能源': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&q=85',
  '电信': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=85',
  '房地产': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=85',
  '汽车': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=85',
  '农业': 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=85',
  '旅游酒店': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=85',
  '媒体娱乐': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&q=85',
  '科技': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=85',
  '政府公共服务': 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=85',
  '保险': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=85',
  '航空航天': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=85',
  '化工': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200&q=85',
  '建筑工程': 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=85',
  '专业服务': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=85',
}

// Fallback image for industries not in the map
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85'

async function getAllIndustries() {
  const command = new ScanCommand({
    TableName: INDUSTRIES_TABLE,
    FilterExpression: 'begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':sk': 'INDUSTRY#',
    },
  })

  const response = await docClient.send(command)
  return response.Items || []
}

async function updateIndustryImage(industryId: string, industryName: string, imageUrl: string) {
  const command = new UpdateCommand({
    TableName: INDUSTRIES_TABLE,
    Key: {
      PK: `INDUSTRY#${industryId}`,
      SK: `INDUSTRY#${industryId}`,
    },
    UpdateExpression: 'SET imageUrl = :imageUrl, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':imageUrl': imageUrl,
      ':updatedAt': new Date().toISOString(),
    },
  })

  await docClient.send(command)
  console.log(`✓ Updated ${industryName} with image: ${imageUrl}`)
}

function getImageForIndustry(industryName: string): string {
  // Try exact match first
  if (industryImages[industryName]) {
    return industryImages[industryName]
  }

  // Try partial match
  for (const [key, value] of Object.entries(industryImages)) {
    if (industryName.includes(key) || key.includes(industryName)) {
      return value
    }
  }

  // Return default image
  return DEFAULT_IMAGE
}

async function main() {
  console.log('🚀 Starting industry image update...\n')

  try {
    // Get all industries
    const industries = await getAllIndustries()
    console.log(`Found ${industries.length} industries\n`)

    // Update each industry with an image
    for (const industry of industries) {
      const industryId = industry.id
      const industryName = industry.name
      const imageUrl = getImageForIndustry(industryName)

      await updateIndustryImage(industryId, industryName, imageUrl)
    }

    console.log(`\n✅ Successfully updated ${industries.length} industries with images!`)
  } catch (error) {
    console.error('❌ Error updating industries:', error)
    process.exit(1)
  }
}

main()
