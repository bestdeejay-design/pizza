// ==UserScript==
// @name         Yandex Eda Modal Data Collector
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Автоматический сбор данных из модалок Yandex Eda для Pizza Napoli
// @author       Pizza Napoli Team
// @match        https://eda.yandex.ru/r/pizza_napoli_bmroq
// @grant        GM_download
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        delay: 2500, // 2.5 seconds between items
        outputFile: 'yandex-eda-complete-data.json'
    };

    let collectedData = [];
    let currentIndex = 0;
    let totalProducts = 0;

    // Normalize title for matching with menu-final.json
    function normalizeTitle(title) {
        return title.trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[\[\]\(\)]/g, '')
            .replace(/[\""]/g, '')
            .replace(/ё/g, 'е');
    }

    // Extract full product data from modal
    function extractProductData() {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return null;

        const modalText = modal.innerText;
        
        // Extract weight
        const weightMatch = modalText.match(/(\d+(?:\.\d+)?)\s*г/i);
        const weight = weightMatch ? `${weightMatch[1]} г` : null;
        
        // Extract price
        const priceMatch = modalText.match(/(\d+)\s*₽/);
        const price = priceMatch ? parseInt(priceMatch[1]) : null;
        
        // Extract description (try multiple selectors)
        let description = '';
        const descSelectors = [
            '[class*="description"]',
            '.description',
            '[class*="text"]',
            'p'
        ];
        
        for (const selector of descSelectors) {
            const descEl = modal.querySelector(selector);
            if (descEl && descEl.textContent.trim().length > 10) {
                description = descEl.textContent.trim();
                break;
            }
        }
        
        // Extract ingredients
        let ingredients = [];
        const ingredientEl = modal.querySelector('[class*="ingredient"], .ingredients');
        if (ingredientEl) {
            ingredients = ingredientEl.textContent
                .split(',')
                .map(i => i.trim())
                .filter(i => i.length > 0);
        }
        
        // Extract nutrition (КБЖУ)
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
        
        // Get title from h1 or h2
        const titleEl = modal.querySelector('h1, h2');
        const title = titleEl ? titleEl.textContent.trim() : '';
        
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

    // Find all product cards on page
    function findProductCards() {
        const selectors = [
            '[id*="product-card"]',
            '[class*="ProductCard"]',
            '[data-testid="product-card"]',
            '[class*="product-card"]'
        ];
        
        let cards = [];
        for (const selector of selectors) {
            cards = document.querySelectorAll(selector);
            if (cards.length > 0) {
                console.log(`[Yandex Collector] Found ${cards.length} products by selector: ${selector}`);
                break;
            }
        }
        
        return Array.from(cards);
    }

    // Close modal if open
    async function closeModal() {
        const closeBtn = modal.querySelector('button[class*="close"], [class*="Close"]');
        if (closeBtn) {
            closeBtn.click();
            await new Promise(r => setTimeout(r, 500));
        }
    }

    // Main collection function
    async function collectAllModals() {
        console.log('[Yandex Collector] Starting data collection...');
        
        const productCards = findProductCards();
        totalProducts = productCards.length;
        
        console.log(`[Yandex Collector] Found ${totalProducts} products to collect`);
        
        for (let i = 0; i < productCards.length; i++) {
            try {
                const card = productCards[i];
                
                // Scroll to card
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(r => setTimeout(r, 800));
                
                // Click to open modal
                card.click();
                console.log(`[Yandex Collector] Opening product ${i + 1}/${totalProducts}...`);
                
                // Wait for modal to open
                await new Promise(r => setTimeout(r, CONFIG.delay));
                
                // Extract data
                const data = extractProductData();
                
                if (data) {
                    collectedData.push(data);
                    console.log(`[Yandex Collector] ✓ Collected: ${data.title} | Weight: ${data.weight || 'N/A'}`);
                } else {
                    console.warn(`[Yandex Collector] ✗ Failed to extract data for product ${i + 1}`);
                }
                
                // Close modal
                const closeBtn = document.querySelector('[role="dialog"] button[class*="close"], [role="dialog"] [class*="Close"]');
                if (closeBtn) {
                    closeBtn.click();
                    await new Promise(r => setTimeout(r, 800));
                }
                
                // Progress indicator
                const progress = ((i + 1) / totalProducts * 100).toFixed(1);
                console.log(`[Yandex Collector] Progress: ${progress}% (${i + 1}/${totalProducts})`);
                
            } catch (error) {
                console.error(`[Yandex Collector] Error at index ${i}:`, error);
            }
        }
        
        // Save results
        saveResults();
    }

    // Save collected data to JSON file
    function saveResults() {
        console.log(`[Yandex Collector] Collection complete! Total: ${collectedData.length} products`);
        
        const output = {
            source: 'Yandex Eda',
            restaurant: 'Pizza Napoli',
            url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
            collectedAt: new Date().toISOString(),
            totalProducts: collectedData.length,
            products: collectedData
        };
        
        const blob = new Blob([JSON.stringify(output, null, 2)], {type: 'application/json'});
        
        GM_download({
            data: blob,
            name: CONFIG.outputFile,
            onload: () => {
                console.log(`[Yandex Collector] ✓ Data saved to ${CONFIG.outputFile}`);
                alert(`✅ Сбор данных завершён!\nСобрано: ${collectedData.length} продуктов\nФайл: ${CONFIG.outputFile}`);
            },
            onerror: (err) => {
                console.error('[Yandex Collector] Save error:', err);
                alert(`❌ Ошибка сохранения: ${err.message}`);
            }
        });
    }

    // Auto-start after page load
    setTimeout(() => {
        console.log('[Yandex Collector] Script initialized');
        console.log('[Yandex Collector] Will start in 3 seconds...');
        
        // Show start button
        const startBtn = document.createElement('button');
        startBtn.textContent = '🚀 Начать сбор данных';
        startBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 15px 25px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(255,107,107,0.4);
        `;
        startBtn.onclick = () => {
            startBtn.remove();
            collectAllModals();
        };
        
        document.body.appendChild(startBtn);
        console.log('[Yandex Collector] Click the button to start collection');
        
    }, 3000);

})();
