function LocaleFmt(){

  // date formats:
  // 1 - old: yearly MM/DD, start/end YYYY-MM-DD
  // 2 - US: yearly MM/DD, start/end MM/DD/YYYYY
  // 3 - UK: yearly DD/MM, start/end DD/MM/YYYYY

  this.defFmtMonthDay = [
    [/^[0-9]{1,2}\/[0-9]{1,2}$/, "MMsDD", "/"],
    [/^[0-9]{1,2}\/[0-9]{1,2}$/, "MMsDD", "/"],
    [/^[0-9]{1,2}\/[0-9]{1,2}$/, "DDsMM", "/"]
   ];
   
  this.defFmtFullDate = [
    [/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$/, "YYYYsMMsDD", "-"],
    [/^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}$/, "MMsDDsYYYY", "/"],
    [/^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}$/, "DDsMMsYYYY", "/"]
  ];
  
  this.dateType = 1;
  
  // let's assign some dummy values for properties
  this.fmtFullDate = "?";
  this.sepFullDate = "?";
  this.sxFullDate = /.*/;
  
  this.fmtMD = "?";
  this.sepMD = "?";
  this.sxMD = /.*/;
  
  this.weekStartsOn = "S"; //S = Sunday, M = Monday
  
  //correct initialization of properties
  this.setDateFmt(1); 
}

LocaleFmt.prototype.setWeekStart = function(sd) {
  switch (sd) {
    case "M": this.weekStartsOn = "M"; break;
    default: this.weekStartsOn = "S";
  }
}

LocaleFmt.prototype.setDateFmt = function(dt) {
  if (dt < 1 || dt > this.defFmtFullDate.length) return;
  
  this.dateType = dt;
  this.sxMD = this.defFmtMonthDay[this.dateType-1][0];
  this.sxFullDate = this.defFmtFullDate[this.dateType-1][0];
  this.sepFullDate = this.defFmtFullDate[this.dateType-1][2];
  this.sepMD = this.defFmtMonthDay[this.dateType-1][2];
  this.fmtMD = this.defFmtMonthDay[this.dateType-1][1].replace(/s/g,this.sepMD);
  this.fmtFullDate = this.defFmtFullDate[this.dateType-1][1].replace(/s/g,this.sepFullDate);
  
}

LocaleFmt.prototype.getFullDateStr = function(dt) {
  var y = dt.getFullYear();
  var m = dt.getMonth()+1;
  var d = dt.getDate();
  return this.fmtFullDate.replace(/YYYY/g,y).replace(/MM/g, m).replace(/DD/g, d);
}

LocaleFmt.prototype.getMDStr = function(dt) {
  return this.fmtMD.replace(/MM/g, dt.getMonth()+1).replace(/DD/g, dt.getDate());
}


