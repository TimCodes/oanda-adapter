//const RxHttpRequest = require('rx-http-request');
const RxHR = require('@akanass/rx-http-request').RxHR;
 const HttpObservable = require('http-observable');
const Rx  = require('rxjs/Rx');
const fs = require('fs')
//console.log(RxHR)
console.log('hello world')


// RxHR.getBuffer('https://portalstoragewuprod2.azureedge.net/vision/Analysis/1-1.jpg').subscribe(
//     (data) => {

//         if (data.response.statusCode === 200) {
//             console.log(data.response.headers['content-type']); // Show image content-type.
//             console.log(data.body); // Show image buffer array.
//         }
//     },
//     (err) => console.error(err) // Show error in console
// );



let options = {

        headers: {

                "Authorization" : `Bearer ${"f2a541bd658a95920c624f73f5d9c656-59fb5d06d799d59d054a395bbf336977"}`,
                'Connection': 'keep-alive'
            
        },
        encoding: 'utf8'
}

let basePath =  'https://stream-fxpractice.oanda.com'
let accountId  = "1560075"
let pairID    = "EUR_USD"

//https://api-fxpractice.oanda.com/v1/candles?instrument=EUR_USD&start=2017-05-10T22:12:19.000Z&end=2017-05-10T23:12:19.000Z&granularity=M15

            
// RxHR.get(`https://api-fxpractice.oanda.com/v1/candles?instrument=EUR_USD&start=2017-05-05T12%3A38%3A43.275Z&end=2017-05-10T17%3A38%3A43.276Z&granularity=M15`).subscribe(
//     (data) => {
//         console.log(data)
//         if (data.response.statusCode === 200) {
//             console.log(data.response.headers['content-type']); // Show image content-type.
//             console.log(data.body); // Show image buffer array.
//         }
//         console.log('getting data')
//     },
//     (err) => console.error(err) // Show error in console
// );


// var source = Rx.Observable.create(function (observer) {
//   // Yield a single value and complete
//   observer.next(42);
//   observer.complete();

//   // Any cleanup logic might go here
//   return function () {
//     console.log('disposed');
//   }
// });
            
// HttpObservable.get(`http://google.com`, options).subscribe(
//     (data) => {
//         console.log(data)
//         if (data.response.statusCode === 200) {
//             console.log(data.response.headers['content-type']); // Show image content-type.
//             console.log(data.body); // Show image buffer array.
//         }
//         console.log('getting data')
//     },
//     (err) => console.error(err) // Show error in console
// );


function getOHLC(barCount, timeFrame){
   
    if(barCount > 300){
        throw new Error(`max bars is 300 you gave ${bars} as parameter`)
    }

    let start = calculateBarStartDate(timeFrame);



}

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

         let subject  = new Rx.Subject();  
         let firstBar = this.getOHLCByCount(symbol, windowSize, timeFrame);

         let barStream  =  Rx.Observable.timer(timeParams.startDate, timeParams.interval)
                            .flatMap ( d=> od.getOHLCByCount(symbol, 1, timeFrame) )
                            .map(d => subject.next(d[0]) )
                        
         let window = firstBar.switchMap(  d =>  subject.startWith(d)
                        ).scan((acc, curr) => {
                            console.log('--- acc ---', acc)
                            acc.shift()
                            acc.push(curr)
                            return  acc
                        });                            


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

let accessToken = "f2a541bd658a95920c624f73f5d9c656-59fb5d06d799d59d054a395bbf336977"
let config = {
    accountId,
    accessToken,
}

// will work for everyting except one mintue 
function getTimeUnitRoundedDown(unitValue, unitType, date){

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

function getHourssRoundedDown(mintueValue){

    if(mintueValue === 1){
        return 1;
    }


    let date = new Date();
    let minutes = date.getMinutes();
    let floor = (mintueValue* Math.floor(minutes / mintueValue));

    return floor;
}

let date = new Date(); 


let od = new OandaAdaptorRx(config);

// od.getOHLCByDateRange('EUR_USD', 'Wed May 10 2017 14:12:19 GMT-0600', 'Wed May 10 2017 17:12:19 GMT-0600', 'M15')
// .subscribe(
//        (data) => {
//       //  console.log(data)
//         if (data.response.statusCode === 200) {
//            // console.log(data.response.headers['content-type']); // Show image content-type.
//            // console.log(data.body); // Show image buffer array.
//             let cs = JSON.parse(data.body).candles
//             console.log(cs.length)
//             fs.writeFile('message.json', JSON.stringify(cs, null , 2), (err) => {
//                     if (err) throw err;
//                     console.log('The file has been saved!');
//             });
//         }else{
//            // console.log(data.body)
//         }
//         console.log('getting data')
//     },
//     function (err) {
//         console.log('Error: ' + err);
//     },
//     function () {
//         console.log('Completed');
//     });


// od.getOHLCSteam("EUR_USD", 'M1' )
// .subscribe(d => console.log(d))

od.getOHLCWindow("EUR_USD", 'M1', 10)
.subscribe(d => console.log(d))

/*
    poor mans version of managing bar pull,
    ensures atleat 300 bars back, without having 
    complex data management logic, because
    the forex market is not 24 * 7, and 
    differnces in time zones.

    TODO: fix this and account for 
    the day of the week and use GMT for Time Zone

 */


function calculateBarStartDate(timeFrame){

       let start = new Date()
      
      if(/D/.test(timeFrame)){
        let multiplier = timeFrame.replace('D', '') 
        start.setDate( start.getDate() - (multiplier * 500) )
      }else if(/H/.test(timeFrame)){
        let multiplier = Number(timeFrame.replace('H', ''))
        start.setHours( start.getHours() - (multiplier * 500) )
      }else if(/M/.test(timeFrame)){
        let multiplier = Number(timeFrame.replace('M', ''))
        start.setMinutes( start.getMinutes() - (multiplier * 500) )
      }
        
      return start; 

}

// options.url = `${basePath}/v1/prices?accountId=${accountId}&instruments=${pairID}`
// options.method = 'get'
            
// function getHttpStreamObservable(options){
//     return   Rx.Observable.create(function (observer) { 
//                 RxHR.request( options)
//                 .on('data',  data => observer.next(data) )
//                 .on('end',   data =>  observer.complete(data) )  
//                 .on('error', err => observer.error(err) )  

//                 return function () {
                    
//                 };  
//             });  
// }  

// let s =      getHttpStreamObservable(options) 

// let sub = s.subscribe(
//     function (x) {
//         console.log('Next: ' + x);
//     },
//     function (err) {
//         console.log('Error: ' + err);
//     },
//     function () {
//         console.log('Completed');
//     });


//     setTimeout(function () {
//         console.log("kill sub ")
//         sub.unsubscribe()
//     }, 2000)



//      const subject = new Rx.Subject();
// // //basic scan example, sum over time starting with zero
// // const arraySource = Rx.Observable.from([1,2,3,4,5])
// // const example = subject
// //   .startWith([1,2,3,4])
// //   .scan((acc, curr) => {
// //     console.log('--- acc ---', acc)
// //     acc.push(curr)
// //    return  acc
// //   });
// // //log accumulated values
// // const subscribe = example.subscribe(val => console.log('Accumulated total:', val));
// // //next values into subject, adding to the current sum
// // subject.next(1); //1
// // subject.next(2); //3
// // subject.next(3); //6

// let t =  Rx.Observable.fromPromise(axios.get('http://jsonplaceholder.typicode.com/posts'))
// .map((response) => response.data.slice(0, 2))
//  .map(data => data)


// let e = t.switchMap(
//   d =>  subject.startWith(d)
// ).scan((acc, curr) => {
//      console.log('--- acc ---', acc)
//      acc.shift()
//      acc.push(curr)
//     return  acc
//    });
//  const subscribe = e.subscribe(val => console.log('Accumulated total:', val));


// Rx.Observable.interval(5000)
// .map(t => subject.next({  body: "new post ",
//   id:Math.random() * 10,
//   title: "qdgdgdge",
//   userId: 1555
// }
// ))
// .subscribe((data) => {
          
//          });
       
// //     .scan((acc, curr) => {
// //     console.log('--- acc ---', acc)
// //     acc.shift()
// //     acc.push(curr)
// //    return  acc
// //   })


// t.subscribe((data) => {
          
//          });
