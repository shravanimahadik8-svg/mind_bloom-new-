const openrouter = require('./openrouter');

async function test() {
    try {
        const res = await openrouter.analyzeSession([
            { role: 'user', content: 'hello, i am very sad' }
        ]);
        console.log("SUCCESS:", res);
    } catch (e) {
        console.error("FAIL:", e);
    }
}
test();
