/**
 * GHOSTTRICK FLASH SALE - BROWSER CONSOLE TEST SUITE
 * Copy and paste these snippets into your browser console while logged in to test API logic.
 */

// --- BATCH 1: VISIBILITY TEST ---
async function testVisibility() {
    console.log("--- Batch 1: Checking Sale Visibility ---");
    try {
        const response = await fetch('/api/sale-events');
        const sales = await response.json();
        
        if (sales.length === 0) {
            console.warn("No active sales found. Please create one in Admin first.");
            return;
        }

        const firstSale = sales[0];
        console.log(`Sale: ${firstSale.name} (${firstSale.slug})`);
        
        firstSale.products.forEach(p => {
            console.log(`Product: ${p.name}`);
            console.log(`- Display Price: ${p.price}`);
            console.log(`- Original Price: ${p.originalPrice}`);
            console.log(`- Flash Stock: ${p.flashStock}`);
            console.log(`- Sold Count: ${p.soldCount}`);
            
            if (p.price < p.originalPrice) console.log("✅ Price Override: OK");
            else console.error("❌ Price Override: FAILED (Sale price should be lower)");
        });
    } catch (e) {
        console.error("Error fetching sales:", e);
    }
}

// --- BATCH 2: TRANSACTION & CONCURRENCY TEST ---
async function testPurchase(variantId, qty = 1) {
    console.log(`--- Batch 2: Testing Purchase for Variant ${variantId} ---`);
    const orderData = {
        items: [{ variantId: variantId, quantity: qty }],
        paymentMethod: "COD",
        shippingAddress: "Console Test Address",
        note: "Testing Flash Sale Stock Deduction"
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        if (response.ok) {
            console.log("✅ Order Created Successfully!", result);
        } else {
            console.error("❌ Order Failed:", result.message || result);
        }
    } catch (e) {
        console.error("Error creating order:", e);
    }
}

// --- BATCH 2.5: RACE CONDITION SIMULATOR ---
async function simulateRaceCondition(variantId, requests = 5) {
    console.log(`--- Simulating ${requests} concurrent purchases for Variant ${variantId} ---`);
    
    const promises = [];
    for(let i=0; i<requests; i++) {
        promises.push(testPurchase(variantId, 1));
    }
    
    console.log("Executing all requests simultaneously...");
    await Promise.all(promises);
    console.log("Simulation finished. Check flash stock in Admin to see if it's below 0 (It shouldn't be!).");
}

console.log("GhostTrick Test Tools Loaded.");
console.log("Run 'testVisibility()' to check display logic.");
console.log("Run 'testPurchase(VARIANT_ID)' to test buying.");
console.log("Run 'simulateRaceCondition(VARIANT_ID, 5)' to test concurrency.");
