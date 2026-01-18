// Simple test script for local video generation
require('dotenv').config();
const { generateVideo } = require('../src/services/video-generator');

const testUrl = process.argv[2] || 'https://ai-playground-indol.vercel.app';

console.log(`🧪 Testing video generation for: ${testUrl}\n`);

generateVideo({
    jobId: 'test-' + Date.now(),
    url: testUrl,
    format: '9:16',
    duration: 15,
    onProgress: (progress) => {
        console.log(`Progress: ${progress}%`);
    }
})
    .then(videoUrl => {
        console.log(`\n✅ Success! Video URL: ${videoUrl}`);
        process.exit(0);
    })
    .catch(error => {
        console.error(`\n❌ Error:`, error.message);
        console.error(error.stack);
        process.exit(1);
    });
