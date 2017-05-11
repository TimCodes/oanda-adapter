var OANDAAdapter = require("./lib/OANDAAdapter");


var client = new OANDAAdapter({
    // 'live', 'practice' or 'sandbox'
    environment: 'practice',
    // Generate your API access in the 'Manage API Access' section of 'My Account' on OANDA's website
    accessToken: 'f2a541bd658a95920c624f73f5d9c656-59fb5d06d799d59d054a395bbf336977'
});

client.subscribePrice("1560075", "EUR_USD", function (tick) {
   console.log('tick')
   console.log(tick)
}, this);