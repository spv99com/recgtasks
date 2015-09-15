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

function TaskCalendar() {
  // TaskCalendar object constructor
  
  // array dayTasks will contain matrix [month][day] containing array of tasks for each specific day (if any)
  this.dayTasks = [[],[],[],[],[],[],[],[],[],[],[],[]];
  
  for (var m = 0; m < 12;m++) 
  // IMPORTANT: there are 32 items on [day] dimension, that's because 
  //  - item #0 is ignored and won't be processed - days are indexed 1-31, so zero is not used (unlike months, which are indexed 0-11)
  //  - we assume each month has 31 days, for months, where there are less real days, than 31, tasks occuring on non-existing days will be processed specially 
    this.dayTasks[m] = [[],
                        [],[],[],[],[],[],[],[],[],[],
                        [],[],[],[],[],[],[],[],[],[],
                        [],[],[],[],[],[],[],[],[],[],[]];
  
  // how many day there are in each calendar month?
  this.monthDays = [31,28,31,30,31,30,31,31,30,31,30,31];
  
  // caching time zone offset string for faster processing    
  this.TZoffset = this.tzOffsetString();
  
  this.localeDateFormat = 1; // date format - default is "old"
  this.localeWeekStartsOn = "S"; //weeks starts on "Sunday" by default, but "M" for "Monday" is possible too

}

//--------------------------------------------------
TaskCalendar.prototype.setLocale = function(ws, dtfmt) {
  this.localeWeekStartsOn = ws;
  this.localeDateFormat = dtfmt;
}

//--------------------------------------------------
TaskCalendar.prototype.tzOffsetString = function(dt) {
  
  function pad(n){return n<10 ? '0'+n : n}
  
  var h, m, d, n
  d = new Date();
  h = d.getTimezoneOffset()/60;
  if (h >= 0) {n="+"} else {n="-"};
  h = Math.floor(Math.abs(h));
  m = Math.abs(d.getTimezoneOffset() % 60);
  
  return (n+pad(h)+":"+pad(m));
}

//--------------------------------------------------
TaskCalendar.prototype.date2rfc3339 = function(dt) {
  // Google requires task due date in rfc3339 format, BUT ignores the time part of it,
  // so it does shift tasks to another day in case of using toISOString() function
  // 2008-11-13T00:00:00+01:00 == 2008-11-12T23:00:00Z
  
  function pad(n){return n<10 ? '0'+n : n}
  
  return dt.getFullYear()+'-'
      + pad(dt.getMonth()+1)+'-'
      + pad(dt.getDate())+'T'
      + pad(dt.getHours())+':'
      + pad(dt.getMinutes())+':'
      + pad(dt.getSeconds())+this.TZoffset  
  
}

//--------------------------------------------------
TaskCalendar.prototype.copyTask = function(task) {
  // simple function creating simplified copy of a Task object
  var t = {};
  
  t.title = task.title;
  t.notes = task.notes;
  t.due = task.due;
  
  return t;
}

//--------------------------------------------------
TaskCalendar.prototype.alignMonthDays = function(m, dom) {
  // based on provided month and day-of-month function returns
  // day-of-month value if day-of-month does not exceeds number of days in specified month
  // otherwise it returns the last day of specified month
  
  var d;
  
  m = m % 12; // just in case
      
  if (dom > this.monthDays[m]) 
    d = this.monthDays[m]
  else
    d = dom;

  return d;
}

//--------------------------------------------------
TaskCalendar.prototype.createTasks_DoM = function(task, rS, rE) {
  //create "Day of Month recurrence" task occurences
  //params:
  //   task - task
  //   rangeStart, rangeEnd - start and end date for data range to be considered

  var rangeStart = new Date(rS.getTime());
  var rangeEnd = new Date(rE.getTime());

  var y = rangeStart.getFullYear();
  var m = rangeStart.getMonth();
  var d = this.alignMonthDays(m, task.recDef.monthly.day);
  var t;
  
  if (rangeEnd > task.recDef.recEnd.date) 
    rangeEnd = task.recDef.recEnd.date; // do not calculate behind the recurrence validity end
  
  var dt = new Date(rangeStart.getTime());
  dt.setDate(d);
  
  while (dt < rangeStart) {
    m += task.recDef.frequency;
    d = this.alignMonthDays(m % 12, task.recDef.monthly.day);    
    dt = new Date(y, m, d, 0, 0, 0, 0);
  }
  
  while (dt <= rangeEnd) {
    t = this.copyTask(task);
    t.due = this.date2rfc3339(dt); //Google Tasks require due date to be written in rfc3339 format
    t.due2msec = dt.getTime(); //secondary due date kept for further internal processing
    
    logIt(LOG_DEV, '    >>> Creating instance %s ** %s/%s', dt, m, d);
    this.dayTasks[m % 12][d].push(t); //append to the end 
    
    m += task.recDef.frequency;
    d = this.alignMonthDays(m % 12, task.recDef.monthly.day);
    dt = new Date(y, m, d, 0, 0, 0, 0);

  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.createTasks_DoY = function(task, rS, rE) {
  //create "Date of Year recurrence" task occurences
  //params:
  //   task - task
  //   rangeStart, rangeEnd - start and end date for data range to be considered

  var rangeStart = new Date(rS.getTime());
  var rangeEnd = new Date(rE.getTime());

  var y = task.recDef.recStart.date.getFullYear();
  var m = task.recDef.yearly.month % 12;
  var d = this.alignMonthDays(m, task.recDef.yearly.day);
  var t;
  
  if (rangeEnd > task.recDef.recEnd.date) 
    rangeEnd = task.recDef.recEnd.date; // do not calculate behind the recurrence validity end
  
  var dt = new Date(rangeStart.getTime());
  dt.setTime(task.recDef.recStart.date.getTime());
  
  if (dt < rangeStart) 
    dt.setDate(this.alignMonthDays(task.recDef.yearly.month % 12, task.recDef.yearly.day)); 
  
  if (dt < rangeStart)
    dt.setMonth(task.recDef.yearly.month % 12);
  
  while (dt < rangeStart) {
    y += task.recDef.frequency;
    dt.setFullYear(y);
  }
  
  while (dt <= rangeEnd) {
    t = this.copyTask(task);
    t.due = this.date2rfc3339(dt); //Google Tasks require due date to be written in rfc3339 format
    t.due2msec = dt.getTime(); //secondary due date kept for further internal processing
    
    logIt(LOG_DEV, '    >>> Creating instance %s ** %s/%s', dt, m, d);
    this.dayTasks[m][d].push(t); //append to the end 
    
    y += task.recDef.frequency;
    dt.setFullYear(y);
  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.createTasks_DAY = function(task, rS, rE) {
  //create "Every X days recurrence" task occurences
  //params:
  //   task - task
  //   rangeStart, rangeEnd - start and end date for data range to be considered

  var rangeStart = new Date(rS.getTime());
  var rangeEnd = new Date(rE.getTime());

  var d = (rangeStart.getTime() - task.recDef.recStart.date.getTime()) / 86400000; //difference in miliseconds to days
  d = Math.floor(d % task.recDef.frequency); // number of days since last calculated occurence rounded to WHOLE days
  var m;
  
  if (rangeEnd > task.recDef.recEnd.date) 
    rangeEnd = task.recDef.recEnd.date; // do not calculate behind the recurrence validity end
  
  var dt = new Date(rangeStart.getTime());
  dt.setHours(0,0,0,0);
  
  dt.setDate(dt.getDate() - d); // date of the previous occurence
  if (dt < rangeStart) // if outside the range, then add one occurence
    dt.setDate(dt.getDate() + task.recDef.frequency);
  
  while (dt <= rangeEnd) {
    t = this.copyTask(task);
    t.due = this.date2rfc3339(dt); //Google Tasks require due date to be written in rfc3339 format
    t.due2msec = dt.getTime(); //secondary due date kept for further internal processing
    
    d = dt.getDate();
    m = dt.getMonth();
    
    logIt(LOG_DEV, '    >>> Creating instance %s ** %s ** %s/%s', dt, t.due, m, d);
    this.dayTasks[m][d].push(t); //append to the end 
    
    dt.setDate(dt.getDate()+task.recDef.frequency);
  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.createTasks_DoW = function(task, rS, rE) {
  //create "Every X weeks on specified days" task occurences
  //params:
  //   task - task
  //   rangeStart, rangeEnd - start and end date for data range to be considered
  
  var rangeStart = new Date(rS.getTime());
  var rangeEnd = new Date(rE.getTime());
  
  var d = (rangeStart.getTime() - task.recDef.recStart.date.getTime()) / 86400000 / 7; //difference in miliseconds to weeks
  d = Math.floor(d % task.recDef.frequency); // number of weeks since last calculated occurence rounded to WHOLE weeks
  var m;
  var w;
  
  var dt = new Date(rangeStart.getTime());
  dt.setHours(0,0,0,0);
  var eow = new Date();
  
  if (rangeEnd > task.recDef.recEnd.date) 
    rangeEnd = task.recDef.recEnd.date; // do not calculate behind the recurrence validity end
  
  dt.setDate(dt.getDate() - dt.getDay()); // the last Sunday (beginning of the week)
  
  if (this.localeWeekStartsOn == "M") //if week starts on Monday, then let's move to Monday
    dt.setDate(dt.getDate() + 1); 
  //logIt(LOG_DEV, '    >>> DoW#2 begining of week is %s', this.localeWeekStartsOn);
  //logIt(LOG_DEV, '    >>> DoW#2 begining of week %s', dt);
  
  dt.setDate(dt.getDate() - (d*7) ); // move weeks back to the past to when recurrence start was set
  //logIt(LOG_DEV, '    >>> DoW#3 start %s', dt);
  
  eow.setDate(dt.getDate() + 7);
  
  if (eow < rangeStart) // if outside the range, then add one occurence
      dt.setDate(dt.getDate() + (task.recDef.frequency*7));
  
  while (dt <= rangeEnd) {
    //logIt(LOG_DEV, '    >>> DoW#4 dt %s', dt);
    eow.setDate(dt.getDate() + 7);
    
    for (i=0;i<7;i++) {
      
      if (dt >= rangeStart && dt <= rangeEnd) {
        if (task.recDef.weekly.days_of_week["S" == this.localeWeekStartsOn ? i : (i+1)%7]){  // as [0] is always Sunday, some calculation is needed for Monday starts
          t = this.copyTask(task);
          t.due = this.date2rfc3339(dt); //Google Tasks require due date to be written in rfc3339 format
          t.due2msec = dt.getTime(); //secondary due date kept for further internal processing
    
          d = dt.getDate();
          m = dt.getMonth();
    
          logIt(LOG_DEV, '    >>> Creating instance %s ** %s ** %s/%s', dt, t.due, m, d);
          this.dayTasks[m][d].push(t); //append to the end 
        }
      }
      
      dt.setDate(dt.getDate() + 1); // move to the next day
      
    }
    
    dt.setDate(dt.getDate()+7*(task.recDef.frequency-1)); //skip to the next frequency
  }
  
}

//--------------------------------------------------

TaskCalendar.prototype.processRecTasks = function (rTasks, rangeStart, rangeEnd) {
  // process all tasks from a specified task list and enter them into specified task calendar object
  //
  // rTasks - list of tasks to be processed
  // rangeStart, rangeEnd - date range for which tasks will be created
  
  var parser = new Record_Parser();
  
  parser.setWeekStart(this.localeWeekStartsOn);
  parser.setDateFmt(this.localeDateFormat);
  
  logIt(LOG_EXTINFO,'  > Parser Fmt %s, %s', parser.locFmt.weekStartsOn, this.localeWeekStartsOn);
  
  var n, i, ii;
    
  if (rTasks.items) {
    for (var i = 0; i < rTasks.items.length; i++) {
      var t = new RecurrentTask("no title");
      parser.err.reset();
      t.title = rTasks.items[i].title;
      t.notes = rTasks.items[i].notes;
      t.recDef.setDateFmt(this.localeDateFormat);
      t.recDef.setWeekStart(this.localeWeekStartsOn);
      
      logIt(LOG_EXTINFO,'  > Task <b>"%s"</b>', t.title);
      
      n = rTasks.items[i].notes
      // scan notes lines to find one containing recurrency pattern definition
      // and parse only if recurrency definition was found
      if (n && (ii = n.search(/\*E/))>=0) {
        t.notes = n.slice(0,ii);
        n = n.slice(ii);
        ii = n.search(/\n/);
        if (ii > 0) {
          t.notes += n.slice(ii+1);
          n = n.slice(0,ii);
        }
        
        logIt(LOG_DEV, '    >> to be parsed #1 "%s"', n);

        parser.doParse(n,t.recDef); 

        if (parser.err.code != parser.PARSE_OK){
          logIt(LOG_CRITICAL,'  > Task parsing error - task ignored "%s"', t.title);
          logIt(LOG_WARN,'    >> Status: %s, %s', parser.err.code, parser.err.text);
        } else {
        
          logIt(LOG_DEV, '    >> parsed "%s"', JSON.stringify(t.recDef));
        
          // if no recurrency start date defined, then let it be January 1st, 2000
          if (t.recDef.recStart.date == null) 
            t.recDef.recStart.date = new Date(2000, 0, 1);

          // if no recurrency end date defined, then let it be January 1st, 3000
          if (t.recDef.recEnd.date == null) 
            t.recDef.recEnd.date = new Date(3000, 0, 1);
          
          // if task validity falls inside daterange to be generated, then let's generate instances of it
          if ((t.recDef.recStart.date <= rangeEnd) && ( rangeStart <= t.recDef.recEnd.date))
            this.createTasks(t, rangeStart, rangeEnd)
          else {
            logIt(LOG_DEV, '    >> out of range VS: %s VE: %s', t.recDef.recStart.date, t.recDef.recEnd.date); 
          }
         }
         
      } else 
        logIt(LOG_EXTINFO, '    >> not parsed - missing recurrency pattern');
    }
  } else {
    logIt(LOG_INFO,'  > No tasks found in the task list.');
  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.createTasks = function(rTask, rangeStart, rangeEnd) {
  // process specific recurrent task, analyze recurrency pattern and create simple tasks based on the recurrency pattern
  // supported patterns:
  //   DOM - monthly on specific day of a month (parameters: DD {day of a month})
  //   DOY - yearly on specific day of a year (parameters: MM/DD {month of a year}/{day of a month})
  //   DAY - daily every X day (parameters: none)
  //   DOW - weekly on specified days (parameters: string containing days of week 1-Sunday, ..., 6-Saturday, e.g. 134 = Sunday, Tuesday, Wednesday)
  var p1, p2
  
  logIt(LOG_DEV, '    >> Processing %s',rTask.title);
  if (rTask.recDef.recStart.date <= rangeEnd && rTask.recDef.recEnd.date >= rangeStart) {
    switch (rTask.recDef.recType) {
      case "D":
        this.createTasks_DAY(rTask, rangeStart, rangeEnd);
        break;
      case "W":
        this.createTasks_DoW(rTask, rangeStart, rangeEnd);
        break;
      case "M":
        this.createTasks_DoM(rTask, rangeStart, rangeEnd);
        break;
      case "Y":
        this.createTasks_DoY(rTask, rangeStart, rangeEnd);
        break;
      default:
        logIt(LOG_EXTINFO, '    >> unknown rectype', 1);
    } 
  } else
    logIt(LOG_EXTINFO, '    >> out of range - skipping (VS) %s (VE) %s (RS) %s (RE) %s', rTask.recDef.recStart.date, rTask.recDef.recEnd.date, rangeStart, rangeEnd);
  
}

//--------------------------------------------------
TaskCalendar.prototype.saveAllTasks = function(taskListId, rangeStart, rangeEnd) {
  // method saves ALL tasks stored in array dayTasks into specified Google Apps task list
  // the assumption is, that all irrelevant tasks have been removed from dayTasks array
  
  var y, m, d, i;
  var task;
  
  // save/insert all tasks from dayTasks array to specified Google tasks list
  for (m = 0; m < 12; m++){
    logIt(LOG_INFO, '  > Saving month %s', ((m+1)|0));     
    for (d = 1; d <= this.monthDays[m]; d++) {
      logIt(LOG_INFO, '  > Saving day %s:[%s]', ((d)|0));
      logIt(LOG_INFO, '  > Day Tasks %s, %s', this.dayTasks[m][d].length, this.dayTasks[m][d]);
      for (i = 0; i < this.dayTasks[m][d].length; i++) {
        task = Tasks.Tasks.insert(this.dayTasks[m][d][i], taskListId);
        logIt(LOG_INFO, '  > Task saved: %s/%s %s ** %s', ((m+1)|0),(d|0),task.title, task.due);    
      }
    }
  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.removeDuplicatesFromArray = function(gTasks) {
  // process all tasks in gTasks and remove all tasks from dayTasks array
  // which have the same title and are due on the same date as any task from gTasks
  
  if (gTasks.items) {
    for (var i = 0; i < gTasks.items.length; i++) {
      var task = gTasks.items[i];
      var title = gTasks.items[i].title;
      var dt = new Date(gTasks.items[i].due);
      if (dt) {
        logIt(LOG_DEV, '  >> Removing duplicates for %s, %s, %s', title, dt, gTasks.items[i].due);
        this.removeDuplicatesFromDayTasks(title, dt); //remove tasks from specific date
      }
    }
  } else 
    logIt(LOG_EXTINFO, '  >> OK, no tasks found for deduplication.');
  
}

//--------------------------------------------------
TaskCalendar.prototype.removeDuplicatesFromDayTasks = function(title, dt) {
  // remove all tasks having specified title from specified date
  var m = dt.getMonth();
  var d = dt.getDate();
  var f = 0;
  
  logIt(LOG_DEV, '  >>> List for %s/%s contains %s entries',m,d,this.dayTasks[m][d].length);
  logIt(LOG_DEV, '  >>> Entries %s',this.dayTasks[m][d]);
  for (var i=0;i < this.dayTasks[m][d].length; i++) {
    if (this.dayTasks[m][d][i].title == title){ // && (this.dayTasks[m][d][i].due2msec == dt.getTime()) 3.9.15 removed condition for duetime
      this.dayTasks[m][d].splice(i,1);
      f++; //found +1
    }
  }
  logIt(LOG_DEV, '  >>> Found %s duplicates',f);
  
}
