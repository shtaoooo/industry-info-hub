/**
 * Script to add test news and blogs to DynamoDB
 * 
 * Usage:
 * 1. Set AWS credentials and region
 * 2. Run: npx ts-node scripts/add-test-news-blogs.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'

const client = new DynamoDBClient({ region: 'us-east-2' })
const docClient = DynamoDBDocumentClient.from(client)

const NEWS_TABLE = 'IndustryPortal-News'
const BLOGS_TABLE = 'IndustryPortal-Blogs'
const INDUSTRIES_TABLE = 'IndustryPortal-Industries'

async function addTestData() {
  try {
    console.log('Fetching industries...')
    
    // Get all industries
    const industriesResult = await docClient.send(
      new ScanCommand({
        TableName: INDUSTRIES_TABLE,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    const industries = industriesResult.Items || []
    console.log(`Found ${industries.length} industries`)

    if (industries.length === 0) {
      console.log('No industries found. Please add industries first.')
      return
    }

    // Take first 3 industries for testing
    const testIndustries = industries.slice(0, 3)

    let newsCount = 0
    let blogsCount = 0

    for (const industry of testIndustries) {
      console.log(`\nAdding test data for industry: ${industry.name}`)

      // Add 2 news items per industry
      for (let i = 1; i <= 2; i++) {
        const newsId = randomUUID()
        const now = new Date().toISOString()

        const newsItem = {
          PK: `NEWS#${newsId}`,
          SK: 'METADATA',
          id: newsId,
          industryId: industry.id,
          title: `${industry.name} Industry News ${i}`,
          summary: `This is a summary of news article ${i} for ${industry.name}. It provides important updates and insights about recent developments in the industry.`,
          content: `Full content of news article ${i} for ${industry.name}. This would contain the complete article text with detailed information about the topic.`,
          imageUrl: `/images/industries/${industry.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`,
          author: 'Industry Portal Team',
          publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: now,
          updatedAt: now,
        }

        await docClient.send(
          new PutCommand({
            TableName: NEWS_TABLE,
            Item: newsItem,
          })
        )

        newsCount++
        console.log(`  Added news: ${newsItem.title}`)
      }

      // Add 2 blog posts per industry
      for (let i = 1; i <= 2; i++) {
        const blogId = randomUUID()
        const now = new Date().toISOString()

        const blogItem = {
          PK: `BLOG#${blogId}`,
          SK: 'METADATA',
          id: blogId,
          industryId: industry.id,
          title: `Insights into ${industry.name}: Blog Post ${i}`,
          summary: `Explore the latest trends and analysis in ${industry.name}. This blog post ${i} covers key topics and provides expert perspectives.`,
          content: `Full blog content for ${industry.name} blog post ${i}. This would include detailed analysis, expert opinions, and actionable insights.`,
          imageUrl: `/images/industries/${industry.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`,
          author: 'Industry Expert',
          publishedAt: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: now,
          updatedAt: now,
        }

        await docClient.send(
          new PutCommand({
            TableName: BLOGS_TABLE,
            Item: blogItem,
          })
        )

        blogsCount++
        console.log(`  Added blog: ${blogItem.title}`)
      }
    }

    console.log('\n=== Summary ===')
    console.log(`Industries processed: ${testIndustries.length}`)
    console.log(`News items added: ${newsCount}`)
    console.log(`Blog posts added: ${blogsCount}`)
    console.log('\nDone!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

addTestData()
