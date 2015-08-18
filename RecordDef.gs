function Record_RGT() {

  this.recType = "#";
  this.frequency = -1;
  this.weekly = {days_of_week:"#"};
  this.monthly = {day:-1};
  this.yearly = {month:-1, day:-1};
  this.recStart = {date:new Date(Date.UTC(2000, 0, 1))};
  this.recEnd = {date:new Date(Date.UTC(2999, 11, 31))};
}
