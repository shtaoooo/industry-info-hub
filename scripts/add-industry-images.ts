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
// Each image is carefully selected to represent the industry with professional, relevant imagery
const industryImages: { [key: string]: string } = {
  // 金融服务 - 股票交易大厅/金融数据
  '金融服务': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=85',
  '金融': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=85',
  
  // 制造业 - 现代化工厂生产线
  '制造业': 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1200&q=85',
  '制造': 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1200&q=85',
  
  // 零售 - 现代购物中心
  '零售': 'https://images.unsplash.com/photo-1555529902-5261145633bf?w=1200&q=85',
  
  // 医疗健康 - 医疗科技/医生
  '医疗健康': 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&q=85',
  '医疗': 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&q=85',
  
  // 教育 - 现代教室/学习
  '教育': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=85',
  
  // 物流运输 - 集装箱港口/物流中心
  '物流运输': 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=1200&q=85',
  '物流': 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=1200&q=85',
  
  // 能源 - 太阳能板/风力发电
  '能源': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=85',
  
  // 电信 - 通信塔/5G网络
  '电信': 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=1200&q=85',
  
  // 房地产 - 现代建筑/摩天大楼
  '房地产': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=85',
  
  // 汽车 - 现代汽车生产线
  '汽车': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&q=85',
  
  // 农业 - 现代农业科技
  '农业': 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&q=85',
  
  // 旅游酒店 - 豪华酒店/度假村
  '旅游酒店': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85',
  '旅游': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85',
  
  // 媒体娱乐 - 影视制作/媒体中心
  '媒体娱乐': 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1200&q=85',
  '媒体': 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1200&q=85',
  
  // 科技 - 数据中心/科技办公室
  '科技': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=85',
  
  // 政府公共服务 - 政府建筑
  '政府公共服务': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=85',
  '政府': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=85',
  
  // 保险 - 保护伞/安全概念
  '保险': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=85',
  
  // 航空航天 - 飞机/航空
  '航空航天': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=85',
  '航空': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=85',
  
  // 化工 - 化工厂/实验室
  '化工': 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1200&q=85',
  
  // 建筑工程 - 建筑工地/施工
  '建筑工程': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=85',
  '建筑': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=85',
  
  // 专业服务 - 商务会议/咨询
  '专业服务': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=85',
  
  // 电子商务 - 在线购物
  '电子商务': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=85',
  '电商': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=85',
  
  // 食品饮料 - 食品生产
  '食品饮料': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=85',
  '食品': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=85',
  
  // 纺织服装 - 服装设计/时尚
  '纺织服装': 'https://images.unsplash.com/photo-1558769132-cb1aea1f1f57?w=1200&q=85',
  '服装': 'https://images.unsplash.com/photo-1558769132-cb1aea1f1f57?w=1200&q=85',
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
