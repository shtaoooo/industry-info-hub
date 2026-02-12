# Industry Portal Scripts

This directory contains utility scripts for managing the Industry Portal.

## Add Industry Images Script

This script adds high-quality image URLs to all existing industries in DynamoDB.

### Prerequisites

1. AWS credentials configured (via AWS CLI or environment variables)
2. Access to the DynamoDB table in us-east-2 region
3. Node.js and npm installed

### Installation

```bash
cd scripts
npm install
```

### Usage

```bash
# Set AWS credentials if not already configured
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-2

# Run the script
npm run add-images
```

### What it does

1. Scans all industries in the DynamoDB table
2. Matches each industry name to a high-quality Unsplash image
3. Updates each industry record with the `imageUrl` field
4. Provides console output showing progress

### Image Mapping

The script includes pre-selected high-quality images for common industries:
- 金融服务 (Financial Services)
- 制造业 (Manufacturing)
- 零售 (Retail)
- 医疗健康 (Healthcare)
- 教育 (Education)
- 物流运输 (Logistics)
- 能源 (Energy)
- 电信 (Telecommunications)
- 房地产 (Real Estate)
- 汽车 (Automotive)
- 农业 (Agriculture)
- 旅游酒店 (Tourism & Hospitality)
- 媒体娱乐 (Media & Entertainment)
- 科技 (Technology)
- And more...

For industries not in the mapping, a default business-themed image is used.

### Notes

- All images are from Unsplash and are high-quality (1200px width, 85% quality)
- The script is idempotent - running it multiple times will update the same records
- Images are served directly from Unsplash CDN (no S3 storage needed)
