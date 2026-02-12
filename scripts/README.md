# Industry Portal Scripts

This directory contains utility scripts for managing the Industry Portal.

## Download Industry Images Script

This script downloads high-quality industry images from Unsplash and saves them to the frontend public directory.

### Usage

```bash
# From the scripts directory
node download-industry-images.js

# Or using npm
npm run download-images
```

### What it does

1. Creates `frontend/public/images/industries/` directory if it doesn't exist
2. Downloads optimized images (1200px width, 85% quality) for each industry
3. Saves images with descriptive filenames (e.g., `finance.jpg`, `manufacturing.jpg`)
4. Skips already downloaded images to avoid re-downloading

### Downloaded Images

The script downloads images for the following industries:
- finance.jpg - Financial services
- manufacturing.jpg - Manufacturing
- retail.jpg - Retail
- healthcare.jpg - Healthcare
- education.jpg - Education
- logistics.jpg - Logistics & Transportation
- energy.jpg - Energy
- telecom.jpg - Telecommunications
- realestate.jpg - Real Estate
- automotive.jpg - Automotive
- agriculture.jpg - Agriculture
- tourism.jpg - Tourism & Hospitality
- media.jpg - Media & Entertainment
- technology.jpg - Technology
- government.jpg - Government & Public Services
- insurance.jpg - Insurance
- aerospace.jpg - Aerospace & Aviation
- chemical.jpg - Chemical
- construction.jpg - Construction & Engineering
- professional.jpg - Professional Services
- food.jpg - Food & Beverage
- textile.jpg - Textile & Apparel
- default.jpg - Default fallback image

## Add Industry Images Script

This script updates all existing industries in DynamoDB with local image paths.

### Prerequisites

1. AWS credentials configured (via AWS CLI or environment variables)
2. Access to the DynamoDB table in us-east-2 region
3. Node.js and npm installed
4. Images already downloaded to `frontend/public/images/industries/`

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
2. Matches each industry name to a local image path
3. Updates each industry record with the `imageUrl` field pointing to local images
4. Provides console output showing progress

### Notes

- The script uses local image paths (e.g., `/images/industries/finance.jpg`)
- These images are served from the Amplify deployment
- Run the download script first to ensure images are available locally
- The script is idempotent - running it multiple times will update the same records
