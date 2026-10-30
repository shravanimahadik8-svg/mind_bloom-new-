const https = require('https');

https.get('https://openrouter.ai/api/v1/models', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const models = JSON.parse(data).data;
        const freeModels = models.filter(m => m.pricing.prompt === '0' && m.pricing.completion === '0');
        console.log('Free models:', freeModels.map(m => m.id).slice(0, 10));
    });
});
