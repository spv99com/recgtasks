function Record_Parser() {

  this.PARSE_STOP = 0;
  this.PARSE_OK = 1;
  this.PARSE_SYNTAX_ERROR = 10;
  this.PARSE_VALUE_ERROR = 11;

  upcase = function(x){return x.toLocaleUpperCase()};

  this.err = {
    code:-1,
    text:"",
    reset:function(){this.code = 1; this.text=""},
    set:function(a,b){this.code = a; this.text=b}
  };

  this.recordId_RGT = [ /\*E/, upcase, function(x, dcx){  this.syntax.push([dcx, this.rec_type]); this.syntax.push([dcx, this.frequency]); return true} ];
  this.frequency = [/^[0-9]+$/, , this.proc_frequency];
  this.rec_type = [/^['D','W','M','Y']$/, , this.proc_rec_type];
  this.day_of_month = [/^[0-9]{1,2}$/, , this.proc_day_of_month];
  this.month_and_day = [/^[0-9]{1,2}\/[0-9]{1,2}$/, , this.proc_month_and_day];
  this.date_sys = [/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$/, , this.proc_date];
  this.dt_start = [/^S$/, upcase, function(x, dcx) {this.syntax.push([dcx.dt_start, this.date_sys]); return true}];
  this.dt_end = [/^E$/, upcase, function(x, dcx) {this.syntax.push([dcx.dt_end, this.date_sys]); return true}];

  this.optional = [this.dt_start, this.dt_end];

  //*E 1 D S 2015-11-02 E 2016-07-26
  //*E 1 W 12567 S 2015-11-02 E 2016-07-26
  //*E 1 M 12 S 2015-11-02 E 2016-07-26
  //*E 1 Y 12/27 S 2015-11-02 E 2016-07-26

  this.aBuffer = [];
  this.syntax = [];
  this.err.reset();
}

Record_Parser.prototype.proc_day_of_month = function(x, dcx) {
  x = parseInt(x,10);
  dcx.day = x;
  if (x < 1 || x > 31) {
    this.err.set(this.PARSE_VALUE_ERROR,"Wrong day of month specified: "+x);
  }

  return (this.PARSE_OK == this.err.code);
};

Record_Parser.prototype.proc_frequency = function(x, dcx) {
  x = parseInt(x,10);
  dcx.frequency = x;
  if (x<=0) {
    this.err.set(this.PARSE_VALUE_ERROR,"Wrong frequency specified: "+x);
  }

  return (this.PARSE_OK == this.err.code);
};

Record_Parser.prototype.proc_rec_type = function(x, dcx){
  var res = true;
  dcx.rec_type = x.toLocaleUpperCase();
  switch (dcx.rec_type) {
    case "D": break;
    //case "W": syntax.push(days_of_week); break;
    case "M": this.syntax.push([dcx.monthly, this.day_of_month]); break;
    case "Y": this.syntax.push([dcx.yearly, this.month_and_day]); break;
    default: res = false;
  }
  return res;
};

Record_Parser.prototype.proc_month_and_day = function(x, dcx){
  var a = x.split('/');
  dcx.month = parseInt(a[0],10);
  dcx.day = parseInt(a[1],10);

  if (dcx.month < 1 || dcx.month > 12)
    this.err.set(this.PARSE_VALUE_ERROR, "Wrong month specified in: "+x);

  if (dcx.day < 1 || dcx.day > 31)
    this.err.set (this.PARSE_VALUE_ERROR, "Wrong day specified in: "+x);

  return (this.PARSE_OK == this.err.code);

};

Record_Parser.prototype.proc_date = function(x, dcx){
  var a = x.split('-');
  var y = parseInt(a[0],10);
  var m = parseInt(a[1],10);
  var d = parseInt(a[2],10);
  if (y > 0 && m > 0 && m < 13 && d > 0 && d < 32)
    dcx.date = new Date(y,m-1,d);
  else
    this.err.set(this.PARSE_VALUE_ERROR, "Wrong date specified: "+x);

  return (this.PARSE_OK == this.err.code);

};

Record_Parser.prototype.doParse = function(input_line, dcx){

  // empty input - nothing to do
  if (0 == input_line.trim().length) return true;

  //split string buffer into pieces and reverse it so push/pop can be used
  this.aBuffer = input_line.split(/[ \f\n\r\t\v]/).reverse();

  // for now hardcoded so the first token should be RGT record prefix
  this.syntax.push([dcx, this.recordId_RGT ]);

  this.doParse_prim(dcx);
};


Record_Parser.prototype.doParse_prim = function(mdcx){

  var b;  // buffer entry
  var ss; // stack entry
  var dcx; // data context
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