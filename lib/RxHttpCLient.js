//const RxHttpRequest = require('rx-http-request');
const RxHR = require('@akanass/rx-http-request').RxHR;
const HttpObservable = require('http-observable');
const Rx  = require('rxjs/Rx');
const fs = require('fs')



class OandaAdaptorRx {

    constructor(configObj){

        this.environments = {
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


        this.accountId   = configObj.accountId;
        this.accessToken = configObj.accessToken;
        this.environment = configObj.environment || 'practice'
        this.restURL     = this.environments[this.environment].restHost;
        this.streamURL   = this.environments[this.environment].streamHost;
        this.secure      = this.environments[this.environment].secure;
        this.logger      = configObj.logger ||  console;

        if (config.environment === "sandbox") {
            this.username = config.username;
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

        
         let timeParams = this._getTimeParams(timeFrame);  
        
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
         let timeParams = this._getTimeParams(timeFrame);  
        

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


    _getTimeParams( timeFrame ){

        let sec  = 1000;   
        let min  = sec * 60;
        let hour = min * 60;
        let day  = hour * 24;

        let timeUnit    = timeFrame[0];
        let multiplier  = Number(timeFrame.substr(1));

        let interval        = 0;
        let startDate       = new Date();
        let roundedValue    = this._getTimeUnitRoundedDown(multiplier, timeUnit, startDate);

        switch (timeUnit) {
            case 'S':
                interval = multiplier * sec; 
                startDate.setSeconds( (roundedValue + multiplier) ); 
                break;
            
             case 'M':
                interval = multiplier * min;
                startDate.setMinutes( (roundedValue + multiplier) );
                startDate.setSeconds(1);
                break;

             case 'H':
                interval = multiplier * hour;
                startDate.setHours( (roundedValue + multiplier) ); 
                startDate.setMinutes(0);
                startDate.setSeconds(0); 
                break 
             
             case 'D':
                 interval = multiplier * day;
                 startDate.setDate( (roundedValue + multiplier) ); 
                 startDate.setHours(0); 
                 startDate.setMinutes(0);
                 startDate.setSeconds(0);
                break   

            default:
                break;
        } 

       return {startDate, interval}

    }

    _getTimeUnitRoundedDown(unitValue, unitType, date){

        let units = 0;
        var date = date || new Date();

        if(unitType === "S"){
            units = date.getSeconds();
        }else if (unitType === "M"){
            units = date.getMinutes();
        }else if (unitType === "H"){
            units = date.getHours();
        }else if (unitType === "D"){
            units = date.getDate();
        }
    
    
        let floor = (unitValue * Math.floor(units / unitValue));

        return floor;
    }   

    
    
}

let accountId  = "1560075"


let accessToken = "f2a541bd658a95920c624f73f5d9c656-59fb5d06d799d59d054a395bbf336977"
let config = {
    accountId,
    accessToken,
}


let date = new Date(); 


let od = new OandaAdaptorRx(config);



od.getOHLCSteam("EUR_USD", 'M1' )
.subscribe(d => console.log(d))

 od.getOHLCWindow("EUR_USD", 'M1', 2)
 .subscribe(d => console.log(d))

