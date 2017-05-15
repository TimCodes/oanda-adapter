let config = {

   environments:  {
            sandbox: {
                restHost: "https://api-sandbox.oanda.com/v1/",
                streamHost: "https://stream-sandbox.oanda.com/v1/",
                secure: false
            },
            practice: {
                restHost: "https://api-fxpractice.oanda.com/v1/",
                streamHost: "https://stream-fxpractice.oanda.com/v1/",
                secure: true
            },
            live: {
                restHost: "https://api-fxtrade.oanda.com/v1/",
                streamHost: "https://stream-fxtrade.oanda.com/v1/",
                secure: true
            }
        }
}

module.exports = config;