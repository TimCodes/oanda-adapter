//const RxHttpRequest = require('rx-http-request');
const RxHR = require('@akanass/rx-http-request').RxHR;
const HttpObservable = require('http-observable');
const Rx  = require('rxjs/Rx');
const fs = require('fs')

const config = require('./config')
const timeUtils = require('./Utils')


/**
 * TODO: make all streams subject or another way to enforce mutlicasting and single execution
 * 
 */

class OandaAdaptorRx {

    constructor(configObj){

        this.environments = config.environments;


        this.accountId   = configObj.accountId;
        this.accessToken = configObj.accessToken;
        this.environment = configObj.environment || 'practice'
        this.restURL     = this.environments[this.environment].restHost;
        this.streamURL   = this.environments[this.environment].streamHost;
        this.secure      = this.environments[this.environment].secure;
        this.logger      = configObj.logger ||  console;

        // object will hold a connected obsevavle for each 
        // tick stream requested, this enables multicasting
        // and a signel execution of an obs

        // max here is two, need an aditional property of pairs keep track of pairs for each stream  
        this.mainTickStream;  
        this.tickStreams = {};
        this.ohclStreams = {}
        this.ohlcWindowStreams = {};


        if (this.environment === "sandbox") {
            this.username = configObj.username;
        }
    }
    
    makeRestCall(sufixURL){

        let baseURL = this.restURL;
   
        let url     =  `${baseURL}${sufixURL}`;
      
        let options = { headers: {
             Authorization: "Bearer " + this.accessToken,
            
        }}
        let obs = RxHR.get(url, options)
                    .retry(10)
                    .map(d => {
                        if (d.body && db.body.candles) {
                            return   timeUtils.safeJsonParse(d.body).candles
                        }else{
                            return [];
                        }
                       
                         
                    })
                    .catch(err => this.logger.error('error sending rest request to oanda, retry limit reached', err))
                    
        return  obs;
    }

   makeGetCall(sufixURL){
        console.log("------ make get call ----- ")
        let baseURL = this.restURL;
   
        let url     =  `${baseURL}${sufixURL}`;
      
        let options = { headers: {
             Authorization: "Bearer " + this.accessToken,
             Connection: 'Keep-Alive'
            
        }}
        let obs = RxHR.get(url, options)
                    // .do(r => console.log(r.body))
                    .retry(10)
                    .catch(err => this.logger.error('error sending rest request to oanda, retry limit reached', err))
                    
        return  obs;
    }
   
    makePostCall(sufixURL, body){

        let baseURL = this.restURL;
   
        let url     =  `${baseURL}${sufixURL}`;
      
        let options = { 
            headers: {
             Authorization: "Bearer " + this.accessToken,
             Connection: 'Keep-Alive'
            },
            body : body
       }
        let obs = RxHR.post(url, options)
                    .retry(10)
                    .catch(err => this.logger.error('error sending rest request to oanda, retry limit reached', err))
                    
        return  obs;
    }

     makePatchCall(sufixURL, body){
        
        let baseURL = this.restURL;
   
        let url     =  `${baseURL}${sufixURL}`;
      
        let options = { 
            headers: {
             Authorization: "Bearer " + this.accessToken,
             Connection: 'Keep-Alive'
            
            },
            body: body
        }
        let obs = RxHR.patcht(url, options)
                    .retry(10)
                    .catch(err => this.logger.error('error sending rest request to oanda, retry limit reached', err))
                    
        return  obs;
    }

    makeDeleteCall(sufixURL){
        
        let baseURL = this.restURL;
   
        let url     =  `${baseURL}${sufixURL}`;
      
        let options = { headers: {
             Authorization: "Bearer " + this.accessToken,
             Connection: 'Keep-Alive'
            
        }}
        let obs = RxHR.deletet(url, options)
                    .retry(10)
                    .catch(err => this.logger.error('error sending rest request to oanda, retry limit reached', err))
                    
        return  obs;
    }
     
    

     // TODO : should return a connectable observable here 
     // need to keep track of number of subribes 
     // and when subscribes reach 0 need to do manually shot down conneted obs with unsubscribe
     makeStreamCall(suffixUrl){

        
        let url     =  `${this.streamURL}${suffixUrl}`;   
        let options = {
             headers: {  Authorization: "Bearer " + this.accessToken,   Connection: "Keep-Alive"},
             method: 'GET',
             encoding: 'utf8',
             uri : url
        
       }

       let obs = Rx.Observable.create(function (observer) { 

                    RxHR.request(options,
                     (error, response, body) => {
        
                        if (error) {
                          observer.error(error)
                        }
                    })
                    .on("data",  d =>   observer.next( d ) )
                    .on('error', err =>  observer.error(err))
                    .on('end', ()  =>  observer.complete() )
                    

                    return () => { console.log("http stream disposed") }
               })     
                    
        return  obs 
                 .multicast(this.subjectFactory)
                 .refCount();
    }

    // for each price stream need to check which pairs are in each
    // if not in a current stream then make new stream 
    // if there are two stream trhwo errror 
    getPriceStream(instrument){
       
        if(this.tickStreams.hasOwnProperty(instrument) ){
            return this.tickStreams[instrument];
        }else{
            let tickStreamNames = Object.keys(this.tickStreams);
            tickStreamNames.push(instrument);
            let instruments  = encodeURIComponent(tickStreamNames.join(','));
            let suffixUrl    = `prices?accountId=${this.accountId}&instruments=${instruments}`;

            let obs = this.makeStreamCall(suffixUrl);

            this.mainTickStream = obs;

            console.log('--- tick strreams ---', instruments)

        //    for (var key in this.tickStreamst) {
        //      this.tickStreams[key] =  this.mainTickStream
        //                                      .switchMap(str =>  this.parseChunkedTickData(str))
        //                                      .filter( tick  => tick.hasOwnProperty('tick')) 
        //                                      .map(tick => tick.tick)
        //                                      .filter(tick => tick.instrument == key )
        //                                      .multicast(this.subjectFactory)
        //                                      .refCount()
        //                                      //.retry(10)
        //    }       

           this.tickStreams[instrument] = this.mainTickStream
                                             .switchMap(str =>  this.parseChunkedTickData(str))
                                             .filter( tick  => tick.hasOwnProperty('tick')) 
                                             .map(tick => tick.tick)
                                             .filter(tick => tick.instrument == instrument )
                                             .multicast(this.subjectFactory)
                                             .refCount()
                                            // .retry(10)                           

           return this.tickStreams[instrument];                                  
             
        }


    }

    parseChunkedTickData(tickData) {
       
       let parsed =  tickData.split(/\r\n/).map(function (line) {
            let obj = {};
            if (line) {
                 try {
                    obj = JSON.parse(line)
                }catch(e){
                    console.log('error parsing json', e)    
                } 
             }
           return obj
        })

        return Rx.Observable.from(parsed)
    }

    subjectFactory(){
        return new Rx.Subject(); 
    }

    getEventStream(){
         let suffixUrl    = `events?accountId=${this.accountId}`;
         return this.makeStreamCall(suffixUrl)
    }


    getOHLCByDateRange(symbol, start, end, granularity){

        let startDate = new Date(start).toISOString();
        let endDate   = new Date(end).toISOString();
        console.log(endDate, startDate)
        startDate = encodeURIComponent(startDate);
        endDate   = encodeURIComponent(endDate);
          
        let sufixURL  =  `candles?instrument=${symbol}&granularity=${granularity}&start=${startDate}&end=${endDate}`;
        

        /// need to make sure that candles exist some defensive coding 
        return this.makeGetCall(sufixURL).map(d => { 
             if (d.body) {
                            return   timeUtils.safeJsonParse(d.body).candles
                        }else{
                            return [];
                        }
                       
        });
        //candles?instrument=EUR_USD&start=2017-05-05T12%3A38%3A43.275Z&end=2017-05-10T17%3A38%3A43.276Z&granularity=M15
    }

    getOHLCByCount(symbol, count, granularity){
       console.log('----- get ohlc by count ---------')
       if(count > 500){
          return  Rx.Observable.throw(new Error(`max count allowed is 500 you gave : ${count}`))

       }
       
          
        let sufixURL  =  `candles?instrument=${symbol}&granularity=${granularity}&count=${count}`;
        
        return this.makeGetCall(sufixURL).map(d => {
              if (d.body) {
                            return   timeUtils.safeJsonParse(d.body).candles
                        }else{
                            return [];
                        }
                       
        });
        //candles?instrument=EUR_USD&start=2017-05-05T12%3A38%3A43.275Z&end=2017-05-10T17%3A38%3A43.276Z&granularity=M15
    }

    getOHLCStream(symbol, timeFrame ){

        
         let timeParams = timeUtils.getTimeParams(timeFrame);  
        
         let firstBar    = this.getOHLCByCount(symbol, 1, timeFrame)
                            .map(d => d[0] );
         console.log(timeParams)                   
 
         let barStream  =  Rx.Observable.timer(timeParams.startDate, timeParams.interval)
                            .do(() => { var d = new Date(); console.log(d.toLocaleString()); })
                            .map ( d=> { 
                                let start = new Date();
                                let end   = new Date();

                                start.setSeconds( start.getSeconds() - ( timeParams.interval / 1000 ) ); 
                                //end.setSeconds( end.getSeconds() + ( timeParams.interval / 1000 ) ); 

                                return od.getOHLCByDateRange(symbol, start, end,  timeFrame)
                                //od.getOHLCByCount(symbol, 1, timeFrame) 
                             })
                            .switchMap(d => d)
                            .map(d => d[0] )

         let mergeStream = firstBar.merge(barStream);

         return mergeStream;               

    }
    
    // TODO : need to fix this to do true multicasting for each pair window
    getOHLCWindow(symbol, timeFrame, windowSize){

         let subject    = new Rx.Subject();  
         let timeParams = timeUtils.getTimeParams(timeFrame);  
        

        //emit immediately, then every 5s
        const  window = this.getOHLCByCount(symbol,windowSize, timeFrame)
                            .switchMap(d => subject.startWith(d))
                            .scan(function (acc, curr) {
                                acc.shift();
                                acc.push(curr);
                                return acc;
                        })
        //switch to new inner observable when source emits, invoke project function and emit values
        const example =      Rx.Observable.timer(timeParams.startDate, timeParams.interval)
                            .flatMap ( d=> od.getOHLCByCount(symbol, 1, timeFrame) )
                            .map(d =>  subject.next(d))

        example.subscribe()


        return window; 

    }


    /** 
    * @method getOpenTrades
    * @param {String} maxId Optional The server will return trades with id less than or equal to this
    * @param {Number} count Optional Maximum number of open trades to return. Default: 50 Max value: 500
    * @param {String} instrument Optional Retrieve open trades for a specific instrument only Default: all
    * @param {Array} ids: Optional A (URL encoded) comma separated list of trades to retrieve. Maximum number of ids: 50. No other parameter may be specified with the ids parameter.
    * @param {String} order.expiry Required. If order type is ‘limit’, ‘stop’, or ‘marketIfTouched’. The value specified must be in a valid datetime format.
    **/
    
    // TODO: test if 'all' will work as an instrument param
    getOpenTrades(maxId = null, count = 50, instrument = 'all', ids = [] ){
           
           let args      = Array.prototype.slice.call(arguments);
           let suffixUrl = `/accounts/${this.accountId}/trades`;
          
           if(args.length > 0){
               suffixUrl += "?";
           }

           if(ids.length > 0 && args.length > 1){
            return Rx.Observable.throw(new Error(`No other parameter may be specified with the ids parameter.`));
           }

           if(ids.length > 0){
               let encodedIds = encodeURIComponent(idx.join(','));
               suffixUrl      +=  `idx = ${encodedIds}`
           }else{
                if(maxId){
                    suffixUrl += `maxId=${maxId}&count=${count}&intrument=${instrument}`;
                }else if (!maxId) {
                    suffixUrl += `count=${count}&intrument=${instrument}`;
                }  
           }

           return this.makeGetCall(suffixUrl); 
           
     
    }

    getTrade(tradeId){
         let suffixURL = `/accounts/${this.accountId}/trades/${tradeId}`;
         return this.makeGetCall(suffixURL);
    }

    modifyTrade(tradeId, patchObj){
         let suffixURL = `/accounts/${this.accountId}/trades/${tradeId}`;
         return this.makePatchCall(suffixURL, patchObj);
    }

    closeTrade(tradeId){
          let suffixURL = `/accounts/${this.accountId}/trades/${tradeId}`;
          return this.makeDeleteCall(suffixURL);
    }

    getOrders(){
        let suffixURL   = `/accounts/${this.accountId}/orders`;
        return this.makeGetCall(suffixURL);
    }

    getOrder(orderId){
        let suffixURL   = `/accounts/${this.accountId}/orders/${orderId}`;
        return this.makeGetCall(suffixURL);
    }

    /**
    * @method createOrder
    * @param {String} accountId Required.
    * @param {Object} order
    * @param {String} order.instrument Required. Instrument to open the order on.
    * @param {Number} order.units Required. The number of units to open order for.
    * @param {String} order.side Required. Direction of the order, either ‘buy’ or ‘sell’.
    * @param {String} order.type Required. The type of the order ‘limit’, ‘stop’, ‘marketIfTouched’ or ‘market’.
    * @param {String} order.expiry Required. If order type is ‘limit’, ‘stop’, or ‘marketIfTouched’. The value specified must be in a valid datetime format.
    * @param {String} order.price Required. If order type is ‘limit’, ‘stop’, or ‘marketIfTouched’. The price where the order is set to trigger at.
    * @param {Number} order.lowerBound Optional. The minimum execution price.
    * @param {Number} order.upperBound Optional. The maximum execution price.
    * @param {Number} order.stopLoss Optional. The stop loss price.
    * @param {Number} order.takeProfit Optional. The take profit price.
    * @param {Number} order.trailingStop Optional The trailing stop distance in pips, up to one decimal place.
    * @param {Function} callback
    */
    createOrder(orderObj){
        let suffixUrl = `/accounts/${this.accountId}/orders`;
        this.makePostCall(suffixUrl, orderObj);
    }

    modifyOrder(orderId, patchObj){
         let suffixUrl = `/accounts/${this.accountId}/orders/${orderId}`;
         this.makePatchCall(suffixUrl, patchObj);
    
    }

    closeOrder(orderId){
         let suffixUrl = `/accounts/${this.accountId}/orders/${orderId}`;
         this.makeDeleteCall(suffixUrl);
    
    }
   
  
    
    
}

let accountId  = "1560075"


let accessToken = "f2a541bd658a95920c624f73f5d9c656-59fb5d06d799d59d054a395bbf336977"
let Oconfig = {
    accountId,
    accessToken,
}


let date = new Date(); 


let od = new OandaAdaptorRx(Oconfig);

let start = new Date();
let end    = new Date();

// start.setMinutes(0)

// end.setMinutes(55)

// od.getOHLCByDateRange('EUR_USD', start, end, 'M5' )
// .subscribe(d => console.log(d))

// od.getOHLCStream("EUR_USD", 'H1' )
// .subscribe(d => console.log(d))

 od.getOHLCWindow("EUR_USD", 'M15', 2)
 .subscribe(d => console.log(d))




// od.getPriceStream('GBP_USD')
// .subscribe(t => console.log("--- obs c ---", t))

// od.getPriceStream('EUR_USD')
// .subscribe(t => console.log("--- obs b ---", t))


// let ps = od.getPriceStream(['EUR_USD'])
// ps.subscribe(t => console.log("--- obs a ---", t))


// od.getPriceStream('AUD_JPY')
// .subscribe(t => console.log("--- obs d ---", t))

// setTimeout(function() {
//     od.getPriceStream('USD_CAD')
// .subscribe(t => console.log("--- obs e ---", t))
// }, 10000);


// od.getOHLCByCount("EUR_USD", 20, 'M15')
// .subscribe(console.log)

//od.mainTickStream.subscribe(d => console.log('-- main ---', d))
//od.getEventStream().subscribe(d => console.log(d))