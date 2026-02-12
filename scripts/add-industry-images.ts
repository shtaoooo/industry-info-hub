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

// Local industry images paths
// These images are stored in frontend/public/images/industries/
const industryImages: { [key: string]: string } = {
  // 金融服务 - 股票交易大厅/金融数据
  '金融服务': '/images/industries/finance.jpg',
  '金融': '/images/industries/finance.jpg',
  
  // 制造业 - 现代化工厂生产线
  '制造业': '/images/industries/manufacturing.jpg',
  '制造': '/images/industries/manufacturing.jpg',
  
  // 零售 - 现代购物中心
  '零售': '/images/industries/retail.jpg',
  
  // 医疗健康 - 医疗科技/医生
  '医疗健康': '/images/industries/healthcare.jpg',
  '医疗': '/images/industries/healthcare.jpg',
  
  // 教育 - 现代教室/学习
  '教育': '/images/industries/education.jpg',
  
  // 物流运输 - 集装箱港口/物流中心
  '物流运输': '/images/industries/logistics.jpg',
  '物流': '/images/industries/logistics.jpg',
  
  // 能源 - 太阳能板/风力发电
  '能源': '/images/industries/energy.jpg',
  
  // 电信 - 通信塔/5G网络
  '电信': '/images/industries/telecom.jpg',
  
  // 房地产 - 现代建筑/摩天大楼
  '房地产': '/images/industries/realestate.jpg',
  
  // 汽车 - 现代汽车生产线
  '汽车': '/images/industries/automotive.jpg',
  
  // 农业 - 现代农业科技
  '农业': '/images/industries/agriculture.jpg',
  
  // 旅游酒店 - 豪华酒店/度假村
  '旅游酒店': '/images/industries/tourism.jpg',
  '旅游': '/images/industries/tourism.jpg',
  
  // 媒体娱乐 - 影视制作/媒体中心
  '媒体娱乐': '/images/industries/media.jpg',
  '媒体': '/images/industries/media.jpg',
  
  // 科技 - 数据中心/科技办公室
  '科技': '/images/industries/technology.jpg',
  
  // 政府公共服务 - 政府建筑
  '政府公共服务': '/images/industries/government.jpg',
  '政府': '/images/industries/government.jpg',
  
  // 保险 - 保护伞/安全概念
  '保险': '/images/industries/insurance.jpg',
  
  // 航空航天 - 飞机/航空
  '航空航天': '/images/industries/aerospace.jpg',
  '航空': '/images/industries/aerospace.jpg',
  
  // 化工 - 化工厂/实验室
  '化工': '/images/industries/chemical.jpg',
  
  // 建筑工程 - 建筑工地/施工
  '建筑工程': '/images/industries/construction.jpg',
  '建筑': '/images/industries/construction.jpg',
  
  // 专业服务 - 商务会议/咨询
  '专业服务': '/images/industries/professional.jpg',
  '专业': '/images/industries/professional.jpg',
  
  // 电子商务 - 在线购物
  '电子商务': '/images/industries/insurance.jpg',
  '电商': '/images/industries/insurance.jpg',
  
  // 食品饮料 - 食品生产
  '食品饮料': '/images/industries/food.jpg',
  '食品': '/images/industries/food.jpg',
  
  // 纺织服装 - 服装设计/时尚
  '纺织服装': '/images/industries/textile.jpg',
  '服装': '/images/industries/textile.jpg',
}

// Fallback image for industries not in the map
const DEFAULT_IMAGE = '/images/industries/default.jpg'

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
