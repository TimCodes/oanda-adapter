var redis = require("redis")
  , subscriber = redis.createClient()
  , getPriceStream = redis.createClient()
  , publisher  = redis.createClient();

var OANDAAdapter = require("./lib/OANDAAdapter");


var client = new OANDAAdapter({
    // 'live', 'practice' or 'sandbox'
    environment: 'practice',
    // Generate your API access in the 'Manage API Access' section of 'My Account' on OANDA's website
    accessToken: 'f2a541bd658a95920c624f73f5d9c656-59fb5d06d799d59d054a395bbf336977'
});

client.subscribePrice("1560075", "EUR_USD", function (tick) {
   //console.log('tick')
  // console.log(tick)
 //  publisher.publish("test", JSON.stringify(tick));
}, this);

subscriber.on("message", function(channel, message) {
  console.log("Message '" + message + "' on channel '" + channel + "' arrived!")
});

subscriber.subscribe("test");
subscriber.subscribe("test2");

publisher.publish("test", "haaaaai");
publisher.publish("test", "kthxbai");

publisher.publish("test2", 'is it this easy?')


getPriceStream.on("message", function(channel, pair){
   client.subscribePrice("1560075", pair, function (tick) {
   ///console.log('tick')
  // console.log(tick)
     publisher.publish(`tick-${pair}`, JSON.stringify(tick));
}, this);


})

getPriceStream.subscribe('gettickstream')

// redisClient.on("error", function(err) {
//     console.error("Error connecting to redis", err);
// });