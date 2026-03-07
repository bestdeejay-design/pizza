// Update menu-complete.json with local image paths
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('menu-complete.json', 'utf8'));

// Create image URL to filename mapping
const imageMap = new Map();
let index = 0;

// Collect all unique images in order they appear
Object.keys(data.menu).forEach(category => {
    data.menu[category].forEach(item => {
        if (item.image && !imageMap.has(item.image)) {
            const filename = item.image.split('/').pop();
            imageMap.set(item.image, `img/${index.toString().padStart(4, '0')}-${filename}`);
            index++;
        }
    });
});

console.log(`Mapped ${imageMap.size} images to local paths`);

// Update all image URLs
Object.keys(data.menu).forEach(category => {
    data.menu[category].forEach(item => {
        if (item.image && imageMap.has(item.image)) {
            item.image = imageMap.get(item.image);
        }
    });
});

// Save updated file
fs.writeFileSync('menu-complete.json', JSON.stringify(data, null, 2));
console.log('Updated menu-complete.json with local image paths');
