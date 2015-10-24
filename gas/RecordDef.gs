function Record_RGT() {
  this.signature = "*E"
  this.recType = "#";
  this.frequency = -1;
  this.weekly = {days_of_week:[false, false, false, false, false, false, false]}; //[0] = Sunday, ... [6] = Saturday
  this.monthly = {day:-1};
  this.yearly = {month:-1, day:-1};
  this.recStart = {date: new Date(2000, 0, 1)};
  this.recEnd = {date: new Date(2999, 11, 31)};
  
  this.locFmt = new LocaleFmt();
  
}

//----------------------------------------------------
Record_RGT.prototype.setWeekStart = function (ws) {
  this.locFmt.setWeekStart(ws);
}

//----------------------------------------------------
Record_RGT.prototype.setDateFmt = function (f) {
  this.locFmt.setDateFmt(f);
}

//----------------------------------------------------
Record_RGT.prototype.toString = function (){

  var st = new Date(2000,0,1);
  var end = new Date(2999,11,31);
  var dow = this.weekly.days_of_week.slice(); // get a copy of array
  
  if ("M" == this.locFmt.weekStartsOn) { // if week starts on Monday
    dow[7] = dow[0]; //move Sunday to the end
    dow.shift(0); //remove Sunday from the head of array making Monday the head
  }
    
  
  var s = this.signature + " " + this.frequency + " " + this.recType + " "
  
  switch (this.recType) {
    case "W": 
      dow.forEach(function(item, i){return s += (item ? (i+1):"")}); //need to us modified week array
      break;
    case "M":
      s += this.monthly.day|0;
      break;
    case "Y":
      s += this.locFmt.getMDStr(new Date(2500,this.yearly.month, this.yearly.day));
      break;
  }
  
  s += " ";
  
  if (this.recStart != null) 
    s += ("S "+this.locFmt.getFullDateStr(this.recStart)+" ");

  
  if (this.recEnd != null) 
    s += ("E "+this.locFmt.getFullDateStr(this.recEnd)+" ");
    
  return s;

}

