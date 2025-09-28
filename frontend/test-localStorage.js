// Quick test to check if there are voice clones in localStorage
// Run this in browser console on the voice clone page

const stored = localStorage.getItem('voice-clones');
if (stored) {
    const clones = JSON.parse(stored);
    console.log('📋 Voice clones in localStorage:', clones.length);
    clones.forEach((clone, i) => {
        console.log(`${i+1}. ${clone.name} (samples: ${clone.samples?.length || 0}, synced: ${clone.backendSynced})`);
    });
} else {
    console.log('❌ No voice clones found in localStorage');
}