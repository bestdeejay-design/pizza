// 🚀 YANDEX EDA MANUAL COLLECTOR
// Запустить прямо в консоли браузера (F12 → Console)
// 
// ИНСТРУКЦИЯ:
// 1. Открыть https://eda.yandex.ru/r/pizza_napoli_bmroq
// 2. Нажать F12 → Console
// 3. Скопировать этот код целиком
// 4. Вставить в консоль и нажать Enter
// 5. Сидеть и смотреть как собираются данные :)

(function() {
    console.log('🍕 YANDEX EDA COLLECTOR STARTED');
    console.log('================================');
    
    const CONFIG = {
        delay: 3000, // 3 seconds between items
        outputFile: 'yandex-eda-manual-collect.json'
    };
    
    let collectedData = [];
    let currentIndex = 0;
    let totalProducts = 0;
    let isRunning = false;
    
    // Normalize title for matching
    function normalizeTitle(title) {
        return title.trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[\[\]\(\)]/g, '')
            .replace(/[\""]/g, '')
            .replace(/ё/g, 'е');
    }
    
    // Extract data from modal
    function extractProductData() {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) {
            console.warn('❌ Modal not found!');
            return null;
        }
        
        const modalText = modal.innerText;
        
        // Title
        const titleEl = modal.querySelector('h1, h2, [class*="title"]');
        const title = titleEl ? titleEl.textContent.trim() : 'Unknown';
        
        // Weight
        const weightMatch = modalText.match(/(\d+(?:\.\d+)?)\s*г/i);
        const weight = weightMatch ? `${weightMatch[1]} г` : null;
        
        // Price
        const priceMatch = modalText.match(/(\d+)\s*₽/);
        const price = priceMatch ? parseInt(priceMatch[1]) : null;
        
        // Description
        let description = '';
        const descSelectors = ['[class*="description"]', '.description', 'p'];
        for (const selector of descSelectors) {
            const descEl = modal.querySelector(selector);
            if (descEl && descEl.textContent.trim().length > 10) {
                description = descEl.textContent.trim();
                break;
            }
        }
        
        // Ingredients
        let ingredients = [];
        const ingredientEl = modal.querySelector('[class*="ingredient"], .ingredients');
        if (ingredientEl) {
            ingredients = ingredientEl.textContent
                .split(',')
                .map(i => i.trim())
                .filter(i => i.length > 0);
        }
        
        // Nutrition (КБЖУ)
        const nutrition = {
            proteins: null,
            fats: null,
            carbs: null,
            calories: null
        };
        
        const proteinMatch = modalText.match(/белки?[:\s]*(\d+(?:\.\d+)?)\s*г/i);
        const fatMatch = modalText.match(/жиры?[:\s]*(\d+(?:\.\d+)?)\s*г/i);
        const carbMatch = modalText.match(/углеводы?[:\s]*(\d+(?:\.\d+)?)\s*г/i);
        const calorieMatch = modalText.match(/калории?[:\s]*(\d+(?:\.\d+)?)\s*(?:ккал|кал)/i);
        
        if (proteinMatch) nutrition.proteins = parseFloat(proteinMatch[1]);
        if (fatMatch) nutrition.fats = parseFloat(fatMatch[1]);
        if (carbMatch) nutrition.carbs = parseFloat(carbMatch[1]);
        if (calorieMatch) nutrition.calories = parseFloat(calorieMatch[1]);
        
        return {
            title: title,
            normalizedTitle: normalizeTitle(title),
            weight: weight,
            price: price,
            description: description,
            ingredients: ingredients,
            nutrition: nutrition,
            url: window.location.href,
            collectedAt: new Date().toISOString()
        };
    }
    
    // Find all products - EXPANDED SELECTORS
    function findProductCards() {
        const selectors = [
            // Yandex Eda specific
            '[class*="ProductCard"]',
            '[class*="product-card"]',
            '[class*="ProductCardV2"]',
            '[class*="product-card-v2"]',
            
            // Generic cards
            '[class*="card"]',
            '[class*="Card"]',
            '[class*="item"]',
            '[class*="Item"]',
            
            // ID based
            '[id*="product"]',
            '[id*="card"]',
            
            // Data attributes
            '[data-testid="product-card"]',
            '[data-product-id]',
            
            // Semantic HTML
            'article',
            'section[class*="card"]',
            'div[class*="menu-item"]',
            'div[class*="catalog-item"]'
        ];
        
        let cards = [];
        for (const selector of selectors) {
            try {
                cards = document.querySelectorAll(selector);
                if (cards.length > 0) {
                    console.log(`✅ Found ${cards.length} products by selector: ${selector}`);
                    break;
                }
            } catch (error) {
                // Skip invalid selectors
            }
        }
        
        return Array.from(cards);
    }
    
    // Close modal
    async function closeModal() {
        const closeBtn = document.querySelector('[role="dialog"] button[class*="close"], [role="dialog"] [class*="Close"]');
        if (closeBtn) {
            closeBtn.click();
            await new Promise(r => setTimeout(r, 800));
        }
    }
    
    // Main collection loop
    async function collectAllModals() {
        if (isRunning) {
            console.warn('⚠️ Already running!');
            return;
        }
        
        isRunning = true;
        console.log('\n🚀 Starting collection...');
        console.log('========================');
        
        const productCards = findProductCards();
        totalProducts = productCards.length;
        
        console.log(`📦 Total products to collect: ${totalProducts}\n`);
        
        for (let i = 0; i < productCards.length; i++) {
            try {
                const card = productCards[i];
                
                // Scroll to card
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(r => setTimeout(r, 800));
                
                // Click to open modal
                card.click();
                console.log(`▶️  Opening product ${i + 1}/${totalProducts}...`);
                
                // Wait for modal to open
                await new Promise(r => setTimeout(r, CONFIG.delay));
                
                // Extract data
                const data = extractProductData();
                
                if (data) {
                    collectedData.push(data);
                    console.log(`✅ Collected: ${data.title} | Weight: ${data.weight || 'N/A'} | Price: ${data.price || 'N/A'}₽`);
                } else {
                    console.warn(`❌ Failed to extract data for product ${i + 1}`);
                }
                
                // Close modal
                await closeModal();
                
                // Progress
                const progress = ((i + 1) / totalProducts * 100).toFixed(1);
                console.log(`📊 Progress: ${progress}% (${i + 1}/${totalProducts}) - Collected: ${collectedData.length}\n`);
                
            } catch (error) {
                console.error(`❌ Error at index ${i}:`, error);
            }
        }
        
        // Save results
        saveResults();
    }
    
    // Save to file
    function saveResults() {
        console.log('\n================================');
        console.log('💾 Collection complete!');
        console.log(`📦 Total products: ${collectedData.length}`);
        console.log('===============================\n');
        
        const output = {
            source: 'Yandex Eda',
            restaurant: 'Pizza Napoli',
            url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
            collectedAt: new Date().toISOString(),
            totalProducts: collectedData.length,
            products: collectedData
        };
        
        const blob = new Blob([JSON.stringify(output, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = CONFIG.outputFile;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ File downloaded:', CONFIG.outputFile);
        console.log('\n🎉 DONE! Check your downloads folder.');
        
        isRunning = false;
    }
    
    // Create control panel
    function createControlPanel() {
        // Remove if exists
        const existing = document.getElementById('yandex-collector-panel');
        if (existing) existing.remove();
        
        const panel = document.createElement('div');
        panel.id = 'yandex-collector-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background: white;
            border: 2px solid #ff6b6b;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(255,107,107,0.3);
            font-family: Arial, sans-serif;
            min-width: 250px;
        `;
        
        panel.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #ff6b6b; font-size: 18px;">🍕 Yandex Collector</h3>
            <div style="margin-bottom: 10px; color: #666; font-size: 14px;">
                Products found: <strong id="yc-found">-</strong>
            </div>
            <div style="margin-bottom: 15px; color: #666; font-size: 14px;">
                Collected: <strong id="yc-collected">0</strong>
            </div>
            <button id="yc-start" style="
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                margin-bottom: 8px;
            ">🚀 Start Collection</button>
            <button id="yc-stop" style="
                width: 100%;
                padding: 12px;
                background: #f0f0f0;
                color: #666;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
            ">⏹️ Stop</button>
        `;
        
        document.body.appendChild(panel);
        
        // Update found count
        const cards = findProductCards();
        document.getElementById('yc-found').textContent = cards.length;
        
        // Start button
        document.getElementById('yc-start').onclick = () => {
            document.getElementById('yc-start').disabled = true;
            document.getElementById('yc-start').textContent = '⏳ Running...';
            collectAllModals();
        };
        
        // Stop button
        document.getElementById('yc-stop').onclick = () => {
            isRunning = false;
            console.warn('⚠️ Stopped by user');
            document.getElementById('yc-start').disabled = false;
            document.getElementById('yc-start').textContent = '🚀 Start Collection';
        };
        
        console.log('✅ Control panel created!');
    }
    
    // Auto-create panel after 1 second
    setTimeout(() => {
        createControlPanel();
        console.log('\n🎯 CLICK "🚀 Start Collection" TO BEGIN');
    }, 1000);
    
})();
