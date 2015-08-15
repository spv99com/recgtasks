 
//*************************************************************
  
function upcase(s) {return s.toLocaleUpperCase()}

PARSE_STOP = 0;
PARSE_OK = 1;
PARSE_SYNTAX_ERROR = 10;
PARSE_VALUE_ERROR = 11;

function RGTrecDef() {

  var rec_type = "#";
  var requency = 1;
  var weekly = {days_of_week:"#"};
  var monthly = {day:0};
  var yearly = {month:0, day:0};
  var dt_start = {date:0};
  var dt_end = {date:0};
}


function RGTParser() {

  this.err = {code:PARSE_OK, text:""};
  
  this.line_prefix = [ /\*E/, upcase, function(x){return true} ];
  this.frequency = [/^[0-9]+$/, , this.proc_frequency];  
  this.rec_type = [/^['D','W','M','Y']$/, upcase, this.proc_rec_type];
  this.day_of_month = [/^[0-9]{1,2}$/, , function(x) {x = parseInt(x,10); t.day_of_month = x; return [(x > 0 && x < 32), x] }];
  this.month_and_day = [/^[0-9]{1,2}\/[0-9]{1,2}$/, , this.proc_month_and_day];
  this.date_sys = [/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$/, , this.proc_date];
  this.dt_start = [/^S$/, upcase, function(x, t) {this.syntax.push(date_sys); return this.parse_prim(this.aBuffer.pop(), t.dt_start)}];
  this.dt_end = [/^E$/, upcase, function(x, t) {this.syntax.push(date_sys); return this.parse_prim(this.aBuffer.pop(), t.dt_end)}];
  
  this.optional = [this.dt_start, this.dt_end];

  //*E 1 D S 2015-11-02 E 2016-07-26
  //*E 1 W 12567 S 2015-11-02 E 2016-07-26
  //*E 1 M 12 S 2015-11-02 E 2016-07-26
  //*E 1 Y 12/27 S 2015-11-02 E 2016-07-26
  
  this.syntax = [
    this.line_prefix,
    this.frequency,
    this.rec_type]
	
  this.aBuffer = [];
  
}

RGTParser.prototype.proc_frequency = function(x, t) {
  x = parseInt(x,10); 
  t.frequency = x; 
  if (x<=0) { 
    this.err.code = PARSE_VALUE_ERROR;
	this.err.text = "Wrong frequency used: "+x;
  }
  
  return (PARSE_OK == this.err.code);
}

RGTParser.prototype.proc_rec_type = function(x, t){
  var res = true;
  t.rec_type = x;
  switch (t.rec_type) {
    //case "W": syntax.push(days_of_week); break;
	case "M": this.syntax.push(day_of_month); res = this.parse_prim(t.monthly); break;
	case "Y": this.syntax.push(month_and_day); res = this.parse_prim(t.yearly); break;
  }
  return res;
}

RGTParser.prototype.proc_month_and_day = function(x, t){
  var a = result.split('/');
  t.month = parseInt(a[0],10);
  t.day = parseInt(a[1],10);
  
  if (t.month < 1 || t.month > 12) {
    this.err.code = PARSE_VALUE_ERROR;
	this.err.text = "Wrong month used: "+t.month;
  }
  
  if (t.day < 1 || t.day > 31) {
    this.err.code = PARSE_VALUE_ERROR;
	this.err.text = "Wrong day used: "+t.day;
  }
  
  return (PARSE_OK == this.err.code);
  
}

RGTParser.prototype.proc_date = function(x, t) {
  var a = result.split('-');
  var y = parseInt(a[0],10);
  var m = parseInt(a[1],10);
  var d = parseInt(a[2],10);
  if (y > 0 && m > 0 && m < 13 && d > 0 && d < 32) {
      t.date = new Date(y,m,d);
  }
  
}

RGTParser.prototype.parse = function(input_line, target){
  //split string buffer into pieces and reverse it so push/pop can be used
  this.aBuffer = input_line.split(/[ \f\n\r\t\v]/).reverse();
 
  console.log("&& "+this.aBuffer)
 
  this.parse_prim(target);
  

}


RGTParser.prototype.parse_prim = function(t){
 
  console.log("*** status");
  console.log(this.aBuffer[this.aBuffer.length-1]);

  if (this.err.code != PARSE_OK) return false;

  // empty input buffer, but syntax is expecting something
  if (this.aBuffer.length == 0 && this.syntax.length != 0) {
    this.err.code = PARSE_SYNTAX_ERROR;
	this.err.text = "Attributes missing."
  }

  // if input buffer is not empty, but no syntax element left try optional attributes
  if (this.aBuffer.length != 0 && this.syntax.length == 0) {
    b = this.aBuffer[this.aBuffer.length-1];
    for (var ii = 0; ii < this.optional.length-1; ii++){
	  if (b.search(this.optional[ii][0]) == 0) { 
	    this.syntax.push(this.optional[ii]);
		break;
	  }
	}
  }
  
  // if not even optional attributes matched, yell error
  if (this.aBuffer.length != 0 && this.syntax.length == 0) {
    this.err.code = PARSE_SYNTAX_ERROR;
	this.err.text = "Too many attributes."
  }
  
  if (this.err.code != PARSE_OK) return false;
  
  s = this.syntax.pop();
  b = this.aBuffer.pop();
  
  // if prep function is defined, run it
  if (s[1]) b = s[1](b);
  
  // check syntax
  if (b.search(s[0]) < 0) { 
    this.err.code = PARSE_SYNTAX_ERROR;
	this.err.text = "Syntax error: "+b;
  }
	
  x = s[2](b, t);
  
  return (this.err.code == PARSE_OK);

}

//**********************************************************************

lines = [
  "*E 1 D S 2015-11-02 E 2016-07-26",
  "*E 1 W 12567 S 2015-11-02 E 2016-07-26",
  "*E 1 M 12 S 2015-11-02 E 2016-07-26",
  "*E 1 Y 12/27 S 2015-11-02 E 2016-07-26"
]


lines.forEach(function(x){
  var p = new RGTParser();
  var r = new RGTrecDef();
  console.log("*********************************************");
  console.log("1:"+x);
  console.log("2:"+p.parse(x,r));
  console.log("3:"+p.err);
  console.log("4:"+r);
})
