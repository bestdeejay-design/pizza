// Extract all unique image URLs from menu-complete.json
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('menu-complete.json', 'utf8'));

// Collect all images
const imageUrls = new Set();

// Iterate through all categories in menu
Object.keys(data.menu).forEach(category => {
    data.menu[category].forEach(item => {
        if (item.image) {
            imageUrls.add(item.image);
        }
    });
});

console.log(`Found ${imageUrls.size} unique images\n`);

// Create download script
const curlCommands = Array.from(imageUrls).map((url, index) => {
    const filename = url.split('/').pop();
    return `curl -L "${url}" -o img/${index.toString().padStart(4, '0')}-${filename}`;
});

// Write to file
fs.writeFileSync('download-images.sh', '#!/bin/bash\nmkdir -p img\n' + curlCommands.join('\n'));

console.log('Created download-images.sh with curl commands');
console.log('Run: bash download-images.sh');
