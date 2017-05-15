//const RxHttpRequest = require('rx-http-request');
const RxHR = require('@akanass/rx-http-request').RxHR;
const HttpObservable = require('http-observable');
const Rx  = require('rxjs/Rx');
const fs = require('fs')

const config = require('./config')
const timeUtils = require('./TimeUtils')

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

        if (this.environment === "sandbox") {
            this.username = configObj.username;
        }
    }
    
    makeRestCall(sufixURL){

        let baseURL = this.restURL;
   
        let url     =  `${baseURL}${sufixURL}`;
       console.log(url);
        let options = { headers: {
             Authorization: "Bearer " + this.accessToken,
            
        }}
        let obs = RxHR.get(url, options)
                    .retry(10)
                    .map(d => JSON.parse(d.body).candles )
                    .catch(err => this.logger.error('error sending rest request to oanda, retry limit reached', err))
                    
        return  obs;
    }

     makeStreamCall(sufixURL){

        let baseURL = this.restURL;
   
        let url     =  `${baseURL}${sufixURL}`;
         console.log(url);
        let options = { headers: {
             Authorization: "Bearer " + this.accessToken,
            
        }}

        let obs = Rx.Observable.create(function (observer) { 

                    RxHR.request({uri: 'http://www.google.fr'},
                     (error, response, body) => {
        
                        if (error) {
                          observer.error(error)
                        }
                    })
                    .on("data",  d =>   observer.next(d) )
                    .on('error', err =>  observer.error(err))
                    .on('end', () =>  observer.complete())
                    

                    return () => console.log("http stream disposed")
               })     
                    
        return  obs;
    }


    getOHLCByDateRange(symbol, start, end, granularity){

        let startDate = new Date(start).toISOString();
        let endDate   = new Date(end).toISOString();

        startDate = encodeURIComponent(startDate);
        endDate   = encodeURIComponent(endDate);
          
        let sufixURL  =  `candles?instrument=${symbol}&granularity=${granularity}&start=${startDate}&end=${endDate}`;
        
        return this.makeRestCall(sufixURL);
        //candles?instrument=EUR_USD&start=2017-05-05T12%3A38%3A43.275Z&end=2017-05-10T17%3A38%3A43.276Z&granularity=M15
    }

    getOHLCByCount(symbol, count, granularity){

       if(count > 500){
          return  Rx.Observable.throw(new Error(`max count allowed is 500 you gave : ${count}`))

       }
       
          
        let sufixURL  =  `candles?instrument=${symbol}&granularity=${granularity}&count=${count}`;
        
        return this.makeRestCall(sufixURL);
        //candles?instrument=EUR_USD&start=2017-05-05T12%3A38%3A43.275Z&end=2017-05-10T17%3A38%3A43.276Z&granularity=M15
    }

    getOHLCSteam(symbol, timeFrame ){

        
         let timeParams = timeUtils.getTimeParams(timeFrame);  
        
         let firstBar    = this.getOHLCByCount(symbol, 1, timeFrame)
                            .map(d => d[0] );
                            
 
         let barStream  =  Rx.Observable.timer(timeParams.startDate, timeParams.interval)
                            .flatMap ( d=> od.getOHLCByCount(symbol, 1, timeFrame) )
                            .map(d => d[0] )

         let mergeStream = firstBar.merge(barStream);

         return mergeStream;               

    }

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


  
    
    
}

let accountId  = "1560075"


let accessToken = "f2a541bd658a95920c624f73f5d9c656-59fb5d06d799d59d054a395bbf336977"
let Oconfig = {
    accountId,
    accessToken,
}


let date = new Date(); 


let od = new OandaAdaptorRx(Oconfig);



od.getOHLCSteam("EUR_USD", 'M1' )
.subscribe(d => console.log(d))

 od.getOHLCWindow("EUR_USD", 'M1', 2)
 .subscribe(d => console.log(d))

