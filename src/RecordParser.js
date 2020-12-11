function Record_Parser() {

  this.locFmt = new LocaleFmt();

  this.PARSE_STOP = 0;
  this.PARSE_OK = 1;
  this.PARSE_SYNTAX_ERROR = 10;
  this.PARSE_VALUE_ERROR = 11;

  // small local helper function used to make syntax case insensitive
  upcase = function(x){return x.toLocaleUpperCase()};
  
  // helper for putting zeroes in
  pad = function(n,m) {return ((m>1)&&(n<(10*(m-1)))) ? '0'+pad(n,m-1) : n}
  

  // small helper object used to pass error information
  this.err = {
    code:-1,
    text:"",
    reset:function(){this.code = 1; this.text = ""},
    set:function(a,b){this.code = a; this.text = b}
  };
  
  this.err.reset(); //and reset any error from previous parsing

  // syntax definition is in following form [<match-pattern>, prepare, validate]
  //    <match-pattern> - token on the top of the input buffer is matched with this RegExp pattern - if not matching then syntax error
  //    prepare - optional prepare function is called prior to pattern-matching and can be used to tweak input (e.g. changing all letters to upper-case ones, so matching will be case insensitive)
  //    validate - validation function is called after match passed successfully - it can be used to validate data entered (e.g month does have less than 31 days) and to store data into DCX (data-context object)
  this.sx_recordId_RGT = [ /\*E/, upcase, function(x, dcx){  this.syntax.push([dcx, this.sx_recType]); this.syntax.push([dcx, this.sx_frequency]); return true} ];
  this.sx_frequency = [/^[0-9]+$/, , this.proc_frequency];
  this.sx_recType = [/^['D','W','M','Y']$/, , this.proc_recType];
  this.sx_DoW = [/^[1-7]{1,7}$/, , this.proc_days_of_week];
  this.sx_DoM = [/^[0-9]{1,2}$/, , this.proc_day_of_month];
  this.sx_MD = [/^[0-9]{1,2}\/[0-9]{1,2}$/, , this.proc_month_and_day];
  this.sx_FullDate = [/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$/, , this.proc_date];
  this.sx_recStart = [/^S$/, upcase, function(x, dcx) {this.syntax.push([dcx.recStart, this.sx_FullDate]); return true}];
  this.sx_recEnd = [/^E$/, upcase, function(x, dcx) {this.syntax.push([dcx.recEnd, this.sx_FullDate]); return true}];

  // following tokens are optional and parser is trying to match them after syntax stack is empty and input buffer still contains some tokens
  // I admit it is not elegant solution - maybe I'll refactor it later...
  this.optional = [this.sx_recStart, this.sx_recEnd];

  //*E 1 D S 2015-11-02 E 2016-07-26
  //*E 1 W 12567 S 2015-11-02 E 2016-07-26
  //*E 1 M 12 S 2015-11-02 E 2016-07-26
  //*E 1 Y 12/27 S 2015-11-02 E 2016-07-26

  this.aBuffer = []; //buffer containing input tokens - it will be reversed to simulate a stack
  this.syntax = [];  //stack containing pairs defining [data-context, syntax] - it might be dynamically modified by tokens being processed
  
}

Record_Parser.prototype.setWeekStart = function (ws) {
  this.locFmt.setWeekStart(ws);
}

Record_Parser.prototype.setDateFmt = function (df) {
// set date format and according syntax validation regExps

  this.locFmt.setDateFmt(df);
  this.sx_MD[0] = this.locFmt.sxMD;
  this.sx_FullDate[0] = this.locFmt.sxFullDate;
}


Record_Parser.prototype.proc_day_of_month = function(x, dcx) {
// validation function for "day of month"
// right now hardcoded to 31 days (even for February)
// TODO: differentiate months & leap years

  x = parseInt(x,10);
  dcx.day = -1;
  if (x < 1 || x > 31) {
    this.err.set(this.PARSE_VALUE_ERROR,"Wrong day of month specified: "+x);
  } else
    dcx.day = x;

  return (this.PARSE_OK == this.err.code);
};


Record_Parser.prototype.proc_frequency = function(x, dcx) {
// validation function for ocurrence frequency
  
  x = parseInt(x,10);
  dcx.frequency = x;
  if (x<=0) {
    this.err.set(this.PARSE_VALUE_ERROR,"Wrong frequency specified: "+x);
  }

  return (this.PARSE_OK == this.err.code);
};


Record_Parser.prototype.proc_recType = function(x, dcx){
// validation function for recurrency types
  
  var res = true;
  dcx.recType = x.toLocaleUpperCase();
  switch (dcx.recType) {
    case "D": break;
    case "W": this.syntax.push([dcx.weekly,this.sx_DoW]); break;
    case "M": this.syntax.push([dcx.monthly, this.sx_DoM]); break;
    case "Y": this.syntax.push([dcx.yearly, this.sx_MD]); break;
    default: res = false;
  }
  return res;
};

Record_Parser.prototype.proc_month_and_day = function(x, dcx){
// validation function for month/day pairs (no year specified)
  
  var a = x.split(this.locFmt.sepMD);
  
  switch (this.locFmt.dateType) {
    case "3":
      dcx.month = parseInt(a[1],10)-1; //decrease by 1 as months in Javascript are 0-11
      dcx.day = parseInt(a[0],10);
      break;
    default:
      dcx.month = parseInt(a[0],10)-1; //decrease by 1 as months in Javascript are 0-11
      dcx.day = parseInt(a[1],10);
      break;
  }

  if (dcx.month < 0 || dcx.month > 11)
    this.err.set(this.PARSE_VALUE_ERROR, "Wrong month specified in: "+x+" expected format: "+this.locFmt.fmtMD);

  if (dcx.day < 1 || dcx.day > 31)
    this.err.set (this.PARSE_VALUE_ERROR, "Wrong day specified in: "+x+" expected format: "+this.locFmt.fmtMD);

  return (this.PARSE_OK == this.err.code);

};

Record_Parser.prototype.proc_days_of_week = function(x, dcx){
// converting string representing days of week, e.g "1256" into array of boolean values

  for (var i=0; i<x.length; i++) 
    dcx.days_of_week[parseInt(x[i])-1] = true;
    
  //logIt(LOG_DEV, '    >> DoW#1 %s,%s ', this.locFmt.weekStartsOn, dcx.days_of_week);
  
  //if week starts on Monday, then 1 = Monday, so we need to correct array values so [0] is always Sunday
  if (this.locFmt.weekStartsOn == "M") {  //if week starts on Monday, 
    dcx.days_of_week.splice(0,0,dcx.days_of_week[6]);  //move 7th item to the head of array
    dcx.days_of_week.pop(); // and remove unnecessary 8th element
  }
  
  //logIt(LOG_DEV, '    >> DoW#2 %s', dcx.days_of_week);
  
  return true; //no issues expected
};

Record_Parser.prototype.proc_date = function(x, dcx){
// validation function for full dates 

  var a;
  var sep = this.locFmt.sepFullDate;
  var y, m, d;
  
  var a = x.split(sep);
  
  //logIt(LOG_DEV, '    >> proc_date#1 "%s", "%s"', this.locFmt.dateType, sep);
  //logIt(LOG_DEV, '    >> proc_date#2 %s', a);
  
  switch (this.locFmt.dateType) {
    case "2": //US fmt MM/DD/YYYY
      y = parseInt(a[2],10);
      m = parseInt(a[0],10);
      d = parseInt(a[1],10);
      break;
    case "3": //GB fmt DD/MM/YYYY
      y = parseInt(a[2],10);
      m = parseInt(a[1],10);
      d = parseInt(a[0],10);
      break;
    case "1": //old fmt YYYY-MM-DD
      y = parseInt(a[0],10);
      m = parseInt(a[1],10);
      d = parseInt(a[2],10);
      break;
    default:
      this.err.set(this.PARSE_VALUE_ERROR,"Unknown date format "+ this.locFmt.dateType);
  }
  
  //logIt(LOG_DEV, '    >> proc_date#3 %s', [y,m,d]);
  
  if (y > 0 && m > 0 && m < 13 && d > 0 && d < 32)
    dcx.date = new Date(y,m-1,d); //decrease month by 1 as months in JS are 0-11
  else
    this.err.set(this.PARSE_VALUE_ERROR, "Wrong date specified: "+x+" expected format: "+this.locFmt.fmtFullDate+" for type "+this.locFmt.dateType+" parsed "+[y,m,d]);

  return (this.PARSE_OK == this.err.code);

};

Record_Parser.prototype.doParse = function(input_line, dcx){
// method used to start parsing
//   input_line - string containing input to be parsed
//   dcx - data context object - object to be used to store parsed values
// for now syntaxt is initialized for recurrency patterns only
// TODO: implement record type recognition (definitely not needed for recurrent tasks :-)
  
  this.aBuffer = [];
  this.syntax = [];
  
  // empty input - nothing to do
  if (0 == input_line.trim().length) return true;

  //logIt(LOG_DEV, '    >> p#1 buffer: %s', this.aBuffer);
  //logIt(LOG_DEV, '    >> p#1 syntax: %s', this.syntax);

  // split string buffer into pieces and reverse it so push/pop can be used
  // before splitting remove unnecessary white spaces
  this.aBuffer = input_line.trim().replace(/\s\s/g," ").split(/[\s]/).reverse();

  // for now hardcoded so the first token should be RGT record prefix
  this.syntax.push([dcx, this.sx_recordId_RGT ]);

  //logIt(LOG_DEV, '    >> p#2 buffer: %s', this.aBuffer);
  //logIt(LOG_DEV, '    >> p#2 syntax: %s', this.syntax);


  this.doParse_prim(dcx);
};

Record_Parser.prototype.doParse_prim = function(mdcx){
// method used to actually parse input data records
//   mdcx - master data context - data context to be used if not specified otherwise

  
  var b;  // buffer entry
  var ss; // stack entry
  var dcx; // local data context 
  var s;
  var i;  // iterator :-)


  while (this.PARSE_OK == this.err.code && this.aBuffer.length + this.syntax.length > 0) {

    while (this.aBuffer.length > 0 && this.syntax.length != 0){
      ss = this.syntax.pop();
      dcx = ss[0];
      s = ss[1];
      b = this.aBuffer.pop();
      
      //logIt(LOG_DEV, '    >> parse#1 status: %s, %s', this.err.code, this.err.text);      
      //logIt(LOG_DEV, '    >> parse#1 buffer: %s', this.aBuffer);
      //logIt(LOG_DEV, '    >> parse#1 syntax: %s', this.syntax);

      // if prep function is defined, run it
      if (s[1])
        b = s[1].call(this, b);

      // check syntax
      if (b.search(s[0]) < 0)
        this.err.set(this.PARSE_SYNTAX_ERROR,"Syntax error: "+b);
      
      //logIt(LOG_DEV, '    >> parse#2 status: %s, %s', this.err.code, this.err.text);
      //logIt(LOG_DEV, '    >> parse#2 buffer: %s', this.aBuffer);
      //logIt(LOG_DEV, '    >> parse#2 syntax: %s', this.syntax);

      // process & validate data
      if (!s[2].call(this, b, dcx)){
        //if called validation failed, but did not set error code, then set it manually
        if (this.PARSE_OK == this.err.code)
          this.err.set(this.PARSE_VALUE_ERROR, "Data error: "+b);
      }

      //logIt(LOG_DEV, '    >> parse#3 status: %s, %s', this.err.code, this.err.text);
      //logIt(LOG_DEV, '    >> parse#3 buffer: %s', this.aBuffer);
      //logIt(LOG_DEV, '    >> parse#3 syntax: %s', this.syntax);

    }

    // empty input buffer, but syntax is expecting something
    if (this.aBuffer.length == 0 && this.syntax.length != 0){
      this.err.set(this.PARSE_SYNTAX_ERROR,"Attributes missing.");
      //logIt(LOG_DEV, '    >> parse#4 buffer: %s', this.aBuffer);
      //logIt(LOG_DEV, '    >> parse#4 syntax: %s', this.syntax);
    }

    // if input buffer is not empty, but no syntax element left try optional attributes
    if (this.aBuffer.length != 0 && this.syntax.length == 0) {
      b = this.aBuffer[this.aBuffer.length-1];
      //logIt(LOG_DEV, '    >> trying optional parameters for input %s ', this.aBuffer);
      i = 0;
      do {
        if (b.search(this.optional[i][0]) == 0) {       // if optional matches
          this.syntax.push([mdcx, this.optional[i]]);   // push its syntax
          i = this.optional.length;                     // and we are done, for now
        }
      } while (++i < this.optional.length);
    }

    // if not even optional attributes matched, yell error
    if (this.aBuffer.length != 0 && this.syntax.length == 0)
      this.err.set(this.PARSE_SYNTAX_ERROR,"Too many attributes.");

  }

  return (this.PARSE_OK == this.err.code);

};
