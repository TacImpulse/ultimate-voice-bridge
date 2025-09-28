// Check ALL browser storage for voice clone data
console.log('🔍 CHECKING ALL BROWSER STORAGE LOCATIONS');
console.log('==========================================');

// 1. Check localStorage
console.log('📦 localStorage:');
if (localStorage.length === 0) {
    console.log('   Empty');
} else {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`   ${key}: ${localStorage.getItem(key).substring(0, 100)}...`);
    }
}

// 2. Check sessionStorage
console.log('\n📦 sessionStorage:');
if (sessionStorage.length === 0) {
    console.log('   Empty');
} else {
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        console.log(`   ${key}: ${sessionStorage.getItem(key).substring(0, 100)}...`);
    }
}

// 3. Check IndexedDB
console.log('\n📦 IndexedDB databases:');
if (window.indexedDB) {
    indexedDB.databases().then(databases => {
        if (databases.length === 0) {
            console.log('   No IndexedDB databases found');
        } else {
            databases.forEach(db => {
                console.log(`   Database: ${db.name} (version ${db.version})`);
            });
        }
    }).catch(e => console.log('   Error checking IndexedDB:', e));
} else {
    console.log('   IndexedDB not supported');
}

// 4. Check if there are any React dev tools or other storage
console.log('\n🔍 Checking for React/Next.js state:');
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('   React DevTools detected - check Components tab for state');
} else {
    console.log('   No React DevTools detected');
}

// 5. Check for any global variables that might contain voice data
console.log('\n🌐 Checking global variables for voice data:');
const globalKeys = Object.keys(window);
const voiceKeys = globalKeys.filter(key => 
    key.toLowerCase().includes('voice') || 
    key.toLowerCase().includes('clone') || 
    key.toLowerCase().includes('audio')
);
if (voiceKeys.length > 0) {
    console.log('   Found potential voice-related globals:', voiceKeys);
    voiceKeys.forEach(key => {
        console.log(`   ${key}:`, typeof window[key], window[key]);
    });
} else {
    console.log('   No voice-related global variables found');
}

console.log('\n💡 If all storage is empty, the data was likely cleared by:');
console.log('   - Browser refresh/restart');
console.log('   - Clearing browser data');
console.log('   - Incognito/private mode');
console.log('   - Different browser profile');
console.log('   - Code that calls localStorage.clear()');