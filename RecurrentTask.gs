function RecurrentTask(t) {
  // RecurrentTask object constructor
  
  this.title = t;
  this.notes = "";
  this.recStart = new Date(Date.UTC(2000,00,01));
  this.recEnd = new Date(Date.UTC(3000,11,31));
  this.recType = "x";
  this.recParam = "x";

}

//--------------------------------------------------
RecurrentTask.prototype.parseFreqTypes = function(s) {
  var defFreqTypes = ["D", "W", "M", "Y"];
  var defFreqTypesSignificant = 1;
  var defRecTypes = ["DAY", "DOW", "DOM", "DOY"];

  var i = defRecTypes.indexOf(s.substring(0,1));
  if (i>-1) {this.recType = defRecTypes[i]};
  
  return this.recType;
  
}

//--------------------------------------------------
RecurrentTask.prototype.parseWeekDays = function(sp) {
  var defDaysOfWeek = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  var defDaysOfWeekSignificant = defDaysOfWeek[0].length;

  if (sp[0] == "ON") {sp.shift()};
  
  do {
    
    var i = defDaysOfWeek.indexOf(sp[0].substring(0,defDaysOfWeekSignificant));
    
    if (i>-1) {this.recDaysOfWeek = this.recDaysOfWeek | Math.pow(2,i)};
    
    if (sp[0].slice(-1) != ",") {i = -1} 
    else {sp.shift()};
    
  } while (i>-1);
  
  return this.recDaysOfWeek;
  
}

//--------------------------------------------------
RecurrentTask.prototype.parseStartEnd = function(sp) {

  if (sp.length() < 2) { return -1 };
  
  if (sp[0].substr(0,1) == "S") {
    this.resStart = parseDate(sp[1]);
    sp.shift();
    sp.shift();
  }
  
  if (sp[0].substr(0,1) == "E") {this.resEnd = parseDate(sp[1])};
  
  return 0;
  
}

  
//--------------------------------------------------
RecurrentTask.prototype.parseSaved2 = function(n) {
  // DAY: *R [every] [N] d[ay] [start 12/31] [end 4/12]
  // DOW: *R [every] [N] w[eek] [on] Mon[day] [, Tuesday] [start 12/31] [end 4/12]
  // DOM: *R [every] [N] m[onth] [on] 5 [day] [start 12/31] [end 4/12]
  // DOY: *R [every] [N] y[ear] [on] Jan 12 [start 12/31] [end 4/12]
  
  var f = 1;
  
  var defMonthsOfYear = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  var defMonthsOfYearSignificant = 3;
  
  var s = n.toLocaleUpperCase();
  s = s.replace(/\x20\x20/g, " ");
  var sp = s.split(" ");
  
  var i = 0;
  
  if (sp[i] != "*R") {return "";}
  i++;
  if (sp[i] == "EVERY") {i++;}
  
  //var rec.Frequency = 1;
  f = parseInt(sp[i]);
  if (f > 0) {
    rec.Frequency = f;
    i++;
  }
  
  
  
  for (var i = 0; i < sp.length; i++) {
    
  }

}


//--------------------------------------------------
RecurrentTask.prototype.parseSaved = function(n) {
  // parse text note for JSON data
  
  // TODO: timezone of recurrence start and end - UTC is used everywhere, but unsure what user entered in start/end of recurrence
 
  if (n) {
    n = n.replace(/\x0A/g, "")
    n = n.replace(/\x0D/g, "")
    try {
      var tn = JSON.parse(n);
      var sp;
      if (tn) {
        sp = tn.recStart ? tn.recStart.split('-') : [2000,0,1];
        this.recStart = sp.length >= 3 ? new Date(sp[0], sp[1]-1, sp[2]) : new Date(2000,00,01);
      
        sp = tn.recEnd ? tn.recEnd.split('-') : [3000,11,31];
        this.recEnd = sp.length >= 3 ? new Date(sp[0], sp[1]-1, sp[2]) : new Date(3000,11,31);
      
        this.recType = tn.recType || "x";
        this.recParam = tn.recParam || "x";
        this.notes = tn.notes;
      }
      
    } catch(err) {
      Logger.log(err)
    }
    
  }
  
}
