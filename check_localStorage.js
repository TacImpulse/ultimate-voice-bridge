// Check voice clone data in localStorage
const voiceClones = localStorage.getItem('voice-clones');

if (voiceClones) {
    console.log('=== VOICE CLONE LOCALSTORAGE DATA ===');
    console.log('Raw data length:', voiceClones.length);
    
    try {
        const parsed = JSON.parse(voiceClones);
        console.log('Number of clones found:', parsed.length);
        
        parsed.forEach((clone, index) => {
            console.log(`\n--- Clone ${index + 1}: ${clone.name} ---`);
            console.log('ID:', clone.id);
            console.log('Backend ID:', clone.backendId);
            console.log('Backend Synced:', clone.backendSynced);
            console.log('Status:', clone.status);
            console.log('Created At:', clone.createdAt);
            console.log('Samples count:', clone.samples?.length || 0);
            
            if (clone.samples && clone.samples.length > 0) {
                clone.samples.forEach((sample, sIndex) => {
                    console.log(`  Sample ${sIndex + 1}:`, {
                        name: sample.name,
                        duration: sample.duration,
                        quality: sample.quality,
                        transcript: sample.transcript?.substring(0, 50) + '...',
                        hasAudioBlob: !!sample.audioBlob,
                        audioMissing: sample.audioMissing
                    });
                });
            }
        });
        
        console.log('\n=== ANALYSIS ===');
        const totalSamples = parsed.reduce((total, clone) => total + (clone.samples?.length || 0), 0);
        console.log('Total samples across all clones:', totalSamples);
        
        const backendSyncedClones = parsed.filter(clone => clone.backendSynced);
        console.log('Backend synced clones:', backendSyncedClones.length);
        
        const clonesWithSamples = parsed.filter(clone => clone.samples && clone.samples.length > 0);
        console.log('Clones with samples:', clonesWithSamples.length);
        
    } catch (error) {
        console.error('Error parsing voice clones data:', error);
        console.log('First 500 characters of raw data:', voiceClones.substring(0, 500));
    }
} else {
    console.log('No voice clone data found in localStorage');
}