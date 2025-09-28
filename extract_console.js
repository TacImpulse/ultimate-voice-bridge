// Voice Clone localStorage Extractor - Console Version
// Run this in your browser console while on localhost:3000

console.log('🎤 Voice Clone localStorage Extractor');
console.log('=====================================');

try {
    const voiceClones = localStorage.getItem('voice-clones');
    
    if (!voiceClones) {
        console.log('❌ No voice clone data found in localStorage');
        console.log('   Make sure you are on localhost:3000 and have created voice clones');
        
        // Check for any localStorage keys that might be related
        console.log('🔍 Checking for any related localStorage keys:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('voice') || key.includes('clone') || key.includes('audio')) {
                console.log(`   Found key: "${key}"`);
            }
        }
        
        // List all localStorage keys
        console.log('📋 All localStorage keys:');
        for (let i = 0; i < localStorage.length; i++) {
            console.log(`   - ${localStorage.key(i)}`);
        }
    } else {
        console.log('✅ Voice clone data found!');
        console.log(`📊 Raw data length: ${voiceClones.length} characters`);
        
        try {
            const parsed = JSON.parse(voiceClones);
            console.log(`🎯 Found ${parsed.length} voice clones:`);
            
            let totalSamples = 0;
            let totalDuration = 0;
            
            parsed.forEach((clone, index) => {
                const sampleCount = clone.samples ? clone.samples.length : 0;
                const cloneDuration = clone.samples ? 
                    clone.samples.reduce((total, sample) => total + (sample.duration || 0), 0) : 0;
                
                totalSamples += sampleCount;
                totalDuration += cloneDuration;
                
                console.log(`\n--- Clone ${index + 1}: ${clone.name} ---`);
                console.log(`   ID: ${clone.id}`);
                console.log(`   Backend ID: ${clone.backendId || 'None'}`);
                console.log(`   Backend Synced: ${clone.backendSynced || false}`);
                console.log(`   Status: ${clone.status || 'Unknown'}`);
                console.log(`   Created: ${clone.createdAt}`);
                console.log(`   Samples: ${sampleCount} (${cloneDuration.toFixed(1)}s total)`);
                
                if (clone.samples && clone.samples.length > 0) {
                    console.log('   Sample details:');
                    clone.samples.forEach((sample, sIndex) => {
                        console.log(`     ${sIndex + 1}. ${sample.name} - ${sample.duration || 0}s`);
                        console.log(`        Transcript: "${(sample.transcript || '').substring(0, 50)}..."`);
                        console.log(`        Quality: ${sample.quality || 'Unknown'}`);
                        console.log(`        Audio Missing: ${sample.audioMissing || !sample.audioBlob}`);
                    });
                }
            });
            
            console.log('\n📈 SUMMARY:');
            console.log(`   Total Clones: ${parsed.length}`);
            console.log(`   Total Samples: ${totalSamples}`);
            console.log(`   Total Duration: ${totalDuration.toFixed(1)}s`);
            console.log(`   Backend Synced: ${parsed.filter(c => c.backendSynced).length}`);
            
            // Create downloadable backup
            console.log('\n💾 Creating backup file...');
            const dataStr = JSON.stringify(parsed, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `voice-clones-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            // Add download link to page temporarily
            link.style.display = 'none';
            document.body.appendChild(link);
            
            console.log('✅ Backup created! Run this to download:');
            console.log('   document.querySelector("a[download*=\\"voice-clones-backup\\"]").click()');
            
            // Also make the data available globally for easy access
            window.voiceCloneBackup = parsed;
            console.log('\n🌐 Data also stored in window.voiceCloneBackup for easy access');
            console.log('   You can copy it with: JSON.stringify(window.voiceCloneBackup, null, 2)');
            
        } catch (parseError) {
            console.error('❌ Error parsing voice clone data:', parseError);
            console.log('🔍 First 500 characters of raw data:');
            console.log(voiceClones.substring(0, 500));
        }
    }
    
} catch (error) {
    console.error('❌ Unexpected error:', error);
}

console.log('\n🔧 Next steps if data found:');
console.log('1. Download the backup file by running the command shown above');
console.log('2. Run: python restore_voice_clones.py');
console.log('3. Provide the backup file path when prompted');
console.log('4. Follow the restoration instructions');