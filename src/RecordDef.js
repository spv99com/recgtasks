// Copyright (c) 2015-2016 Jozef Sovcik. All Rights Reserved.
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

function Record_RGT() {
  this.signature = "*E"
  this.recType = "#";
  this.frequency = -1;
  this.weekly = {days_of_week:[false, false, false, false, false, false, false]}; //[0] = Sunday, ... [6] = Saturday
  this.monthly = {day:-1};
  this.yearly = {month:-1, day:-1};
  this.recStart = {date: new Date(2000, 0, 1)};
  //this.recStart = new Date(2000, 0, 1);
  this.recEnd = {date: new Date(2999, 11, 31)};
  //this.recEnd = new Date(2999, 11, 31);
  
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
  
  if (this.recStart.date != null) 
    s += ("S "+this.locFmt.getFullDateStr(this.recStart.date)+" ");

  
  if (this.recEnd.date != null) 
    s += ("E "+this.locFmt.getFullDateStr(this.recEnd.date)+" ");
    
  return s;

}
