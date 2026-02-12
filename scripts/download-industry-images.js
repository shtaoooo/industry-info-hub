/**
 * Script to download industry images from Unsplash and save them locally
 * 
 * Usage:
 * node scripts/download-industry-images.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, '../frontend/public/images/industries');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Industry images mapping
const industryImages = {
  'finance': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=85',
  'manufacturing': 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1200&q=85',
  'retail': 'https://images.unsplash.com/photo-1555529902-5261145633bf?w=1200&q=85',
  'healthcare': 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&q=85',
  'education': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=85',
  'logistics': 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=1200&q=85',
  'energy': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=85',
  'telecom': 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=1200&q=85',
  'realestate': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=85',
  'automotive': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&q=85',
  'agriculture': 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&q=85',
  'tourism': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85',
  'media': 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1200&q=85',
  'technology': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=85',
  'government': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=85',
  'insurance': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=85',
  'aerospace': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=85',
  'chemical': 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1200&q=85',
  'construction': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=85',
  'professional': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=85',
  'food': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=85',
  'textile': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&q=85',
  'default': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85',
};

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(imagesDir, filename);
    
    // Check if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`✓ ${filename} already exists, skipping...`);
      resolve();
      return;
    }

    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ Downloaded ${filename}`);
          resolve();
        });
      } else {
        fs.unlink(filepath, () => {});
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function downloadAllImages() {
  console.log('🚀 Starting image download...\n');
  console.log(`Downloading to: ${imagesDir}\n`);

  const downloads = [];
  for (const [name, url] of Object.entries(industryImages)) {
    const filename = `${name}.jpg`;
    downloads.push(downloadImage(url, filename));
  }

  try {
    await Promise.all(downloads);
    console.log(`\n✅ Successfully downloaded ${Object.keys(industryImages).length} images!`);
    console.log(`\nImages saved to: ${imagesDir}`);
  } catch (error) {
    console.error('\n❌ Error downloading images:', error.message);
    process.exit(1);
  }
}

downloadAllImages();
