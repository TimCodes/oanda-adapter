

  function getTimeParams( timeFrame ){

        let sec  = 1000;   
        let min  = sec * 60;
        let hour = min * 60;
        let day  = hour * 24;

        let timeUnit    = timeFrame[0];
        let multiplier  = Number(timeFrame.substr(1));

        let interval        = 0;
        let startDate       = new Date();
        let roundedValue    = getTimeUnitRoundedDown(multiplier, timeUnit, startDate);

        switch (timeUnit) {
            case 'S':
                interval = multiplier * sec; 
                startDate.setSeconds( (roundedValue + multiplier) ); 
                break;
            
             case 'M':
                interval = multiplier * min;
                startDate.setMinutes( (roundedValue + multiplier) );
                startDate.setSeconds(0);
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
  
   function safeJsonParse(obj) {
        var json

        try {
            json = JSON.parse(obj);
        } catch (err) {
            return console.log(err);
        }

        return json;
  }



  module.exports.getTimeUnitRoundedDown = getTimeUnitRoundedDown;
  module.exports.getTimeParams  = getTimeParams;  
  module.exports.safeJsonParse = safeJsonParse;