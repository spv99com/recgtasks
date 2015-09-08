// Copyright 2015 Jozef Sovcik. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//*********************************************************

function Record_Parser() {

  this.PARSE_STOP = 0;
  this.PARSE_OK = 1;
  this.PARSE_SYNTAX_ERROR = 10;
  this.PARSE_VALUE_ERROR = 11;

  // small local helper function used to make syntax case insensitive
  upcase = function(x){return x.toLocaleUpperCase()};

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
  this.recordId_RGT = [ /\*E/, upcase, function(x, dcx){  this.syntax.push([dcx, this.recType]); this.syntax.push([dcx, this.frequency]); return true} ];
  this.frequency = [/^[0-9]+$/, , this.proc_frequency];
  this.recType = [/^['D','W','M','Y']$/, , this.proc_recType];
  this.days_of_week = [/^[1-7]{1,7}$/, , this.proc_days_of_week];
  this.day_of_month = [/^[0-9]{1,2}$/, , this.proc_day_of_month];
  this.month_and_day = [/^[0-9]{1,2}\/[0-9]{1,2}$/, , this.proc_month_and_day];
  this.date_sys = [/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$/, , this.proc_date];
  this.recStart = [/^S$/, upcase, function(x, dcx) {this.syntax.push([dcx.recStart, this.date_sys]); return true}];
  this.recEnd = [/^E$/, upcase, function(x, dcx) {this.syntax.push([dcx.recEnd, this.date_sys]); return true}];

  // following tokens are optional and parser is trying to match them after syntax stack is empty and input buffer still contains some tokens
  // I admit it is not elegant solution - maybe I'll refactor it later...
  this.optional = [this.recStart, this.recEnd];

  //*E 1 D S 2015-11-02 E 2016-07-26
  //*E 1 W 12567 S 2015-11-02 E 2016-07-26
  //*E 1 M 12 S 2015-11-02 E 2016-07-26
  //*E 1 Y 12/27 S 2015-11-02 E 2016-07-26

  this.aBuffer = []; //buffer containing input tokens - it will be reversed to simulate a stack
  this.syntax = [];  //stack containing pairs defining [data-context, syntax] - it might be dynamically modified by tokens being processed
  
  
}

Record_Parser.prototype.proc_day_of_month = function(x, dcx) {
// validation function for "day of month"
// right now hardcoded to 31 days (even for February)
// TODO: differentiate months & leap years

  x = parseInt(x,10);
  dcx.day = x;
  if (x < 1 || x > 31) {
    this.err.set(this.PARSE_VALUE_ERROR,"Wrong day of month specified: "+x);
  }

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
    case "W": this.syntax.push([dcx.weekly,this.days_of_week]); break;
    case "M": this.syntax.push([dcx.monthly, this.day_of_month]); break;
    case "Y": this.syntax.push([dcx.yearly, this.month_and_day]); break;
    default: res = false;
  }
  return res;
};

Record_Parser.prototype.proc_month_and_day = function(x, dcx){
// validation function for month/day pairs (no year specified)
// Right now hardcoded to MM/DD
// TODO: allow DD.MM and DD/MM - will requre some date format type property
  
  var a = x.split('/');
  dcx.month = parseInt(a[0],10)-1; //decrease by 1 as months in Javascript are 0-11
  dcx.day = parseInt(a[1],10);

  if (dcx.month < 0 || dcx.month > 11)
    this.err.set(this.PARSE_VALUE_ERROR, "Wrong month specified in: "+x);

  if (dcx.day < 1 || dcx.day > 31)
    this.err.set (this.PARSE_VALUE_ERROR, "Wrong day specified in: "+x);

  return (this.PARSE_OK == this.err.code);

};

Record_Parser.prototype.proc_days_of_week = function(x, dcx){
  for (var i=0; i<x.length; i++) 
    dcx.days_of_week[parseInt(x[i])-1] = true;
  return true; //no issues expected
};

Record_Parser.prototype.proc_date = function(x, dcx){
// validation function for system dates formatted as YYYY-MM-DD
// TODO: allow other date formats

  var a = x.split('-');
  var y = parseInt(a[0],10);
  var m = parseInt(a[1],10);
  var d = parseInt(a[2],10);
  if (y > 0 && m > 0 && m < 13 && d > 0 && d < 32)
    dcx.date = new Date(y,m-1,d); //decrease month by 1 as months in JS are 0-11
  else
    this.err.set(this.PARSE_VALUE_ERROR, "Wrong date specified: "+x);

  return (this.PARSE_OK == this.err.code);

};

Record_Parser.prototype.doParse = function(input_line, dcx){
// method used to start parsing
//   input_line - string containing input to be parsed
//   dcx - data context object - object to be used to stored parsed values
// for now syntaxt is initialized for recurrency patterns only
// TODO: implement record type recognition (definitely not needed for recurrent tasks :-)
  
  // empty input - nothing to do
  if (0 == input_line.trim().length) return true;

  //split string buffer into pieces and reverse it so push/pop can be used
  this.aBuffer = input_line.trim().split(/[ \f\n\r\t\v]/).reverse();

  // for now hardcoded so the first token should be RGT record prefix
  this.syntax.push([dcx, this.recordId_RGT ]);

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

      // if prep function is defined, run it
      if (s[1])
        b = s[1].call(this, b);

      // check syntax
      if (b.search(s[0]) < 0)
        this.err.set(this.PARSE_SYNTAX_ERROR,"Syntax error: "+b);

      // process & validate data
      if (!s[2].call(this, b, dcx)){
        //if called validation failed, but did not set error code, then set it manually
        if (this.PARSE_OK == this.err.code)
          this.err.set(this.PARSE_VALUE_ERROR, "Data error: "+b);
      }

    }

    // empty input buffer, but syntax is expecting something
    if (this.aBuffer.length == 0 && this.syntax.length != 0)
      this.err.set(this.PARSE_SYNTAX_ERROR,"Attributes missing.");

    // if input buffer is not empty, but no syntax element left try optional attributes
    if (this.aBuffer.length != 0 && this.syntax.length == 0) {
      b = this.aBuffer[this.aBuffer.length-1];
      for (i = 0; i < this.optional.length; i++){
        if (b.search(this.optional[i][0]) == 0) {
          this.syntax.push([mdcx, this.optional[i]]);
          break;
        }
      }
    }

    // if not even optional attributes matched, yell error
    if (this.aBuffer.length != 0 && this.syntax.length == 0)
      this.err.set(this.PARSE_SYNTAX_ERROR,"Too many attributes.");

  }

  return (this.PARSE_OK == this.err.code);

};
