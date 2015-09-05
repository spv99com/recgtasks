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
  
  // date format
  this.dateFormat;

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
TaskCalendar.prototype.createTasks_DoM = function(task, rangeStart, rangeEnd) {
  //create "Day of Month recurrence" task occurences
  //params:
  //   task - task
  //   dom - day of month
  //   rangeStart, rangeEnd - start and end date for data range to be considered
  
  var y = rangeStart.getUTCFullYear();
  var m = rangeStart.getUTCMonth();
  var d = this.alignMonthDays(m, task.recDef.monthly.day);
  var t;
  
  var dt = new Date(Date.UTC(y, m, d));
  dt.setUTCHours(0,0,0,0);
  
  while (dt < rangeStart) {
    m++;
    d = this.alignMonthDays(m, task.recDef.monthly.day);    
    dt.setTime(Date.UTC(y, m, d));
    dt.setUTCHours(0,0,0,0);
  }
  
  while (dt <= rangeEnd) {
    t = this.copyTask(task);
    t.due = dt.toISOString(); //Google Tasks require due date to be written in ISO format
    t.due2msec = dt.getTime(); //secondary due date kept for further internal processing
    
    this.dayTasks[m][d][this.dayTasks[m][d].length] = t;
    
    m++;
    d = this.alignMonthDays(m, task.recDef.monthly.day);
    dt.setTime(Date.UTC(y, m, d));
  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.createTasks_DoY = function(task, rangeStart, rangeEnd) {
  //create "Date of Year recurrence" task occurences
  //params:
  //   task - task
  //   dom - day of month
  //   moy - month of year
  //   rangeStart, rangeEnd - start and end date for data range to be considered
  
  var y = rangeStart.getUTCFullYear();
  var m = task.recDef.yearly.month % 12;
  var d = this.alignMonthDays(m, task.recDef.yearly.day);
  var t;
  
  var dt = new Date(Date.UTC(y, m, d));
  
  dt.setUTCHours(0,0,0,0);
  
  if (dt < rangeStart) 
    dt.setUTCFullYear(++y);
  
  while (dt <= rangeEnd) {
    t = this.copyTask(task);
    t.due = dt.toISOString(); //Google Tasks require due date to be written in ISO format
    t.due2msec = dt.getTime(); //secondary due date kept for further internal processing
    
    this.dayTasks[m][d][this.dayTasks[m][d].length] = t;
    
    y++;
    dt.setUTCFullYear(y);
  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.createTasks_DAY = function(task, rangeStart, rangeEnd) {
  //create "Every X days recurrence" task occurences
  //params:
  //   task - task
  //   recStart - starting date for recurrency
  //   rangeStart, rangeEnd - start and end date for data range to be considered
  
  var d = (rangeStart.getTime() - task.recDef.recStart.date.getTime()) / 86400000; //difference in miliseconds to days
  d = Math.floor(d % task.recDef.frequency); // number of days since last calculated occurence rounded to WHOLE days
  var m;
  
  var dt = new Date();
  dt.setUTCHours(0,0,0,0);
  
  dt.setUTCDate(dt.getUTCDate() - d); // date of the previous occurence
  if (dt < rangeStart) // if outside the range, then add one occurence
    dt.setUTCDate(dt.getUTCDate() + task.recDef.frequency);
  
  while (dt <= rangeEnd) {
    t = this.copyTask(task);
    t.due = dt.toISOString(); //Google Tasks require due date to be written in ISO format
    t.due2msec = dt.getTime(); //secondary due date kept for further internal processing
    
    d = dt.getUTCDate();
    m = dt.getUTCMonth();
    this.dayTasks[m][d][this.dayTasks[m][d].length] = t;
    
    dt.setUTCDate(dt.getUTCDate()+task.recDef.frequency);
  }
  
}

//--------------------------------------------------

TaskCalendar.prototype.processRecTasks = function (rTasks, rangeStart, rangeEnd) {
  // process all tasks from a specified task list and enter them into specified task calendar object
  //
  // rTasks - list of tasks to be processed
  // rangeStart, rangeEnd - date range for which tasks will be created
  
  var today = new Date();
  today.setUTCHours(23,59,59,999);
  var parser = new Record_Parser();
  
  var n, i, ii;
    
  if (rTasks.items) {
    for (var i = 0; i < rTasks.items.length; i++) {
      var t = new RecurrentTask("no title");
      parser.err.reset();
      t.title = rTasks.items[i].title;
      t.notes = rTasks.items[i].notes;
      t.recDef = new Record_RGT();
      
      logIt(LOG_INFO,'  > Task "%s"', t.title);
      
      n = rTasks.items[i].notes
      // scan notes lines to find one containing recurrency pattern definition
      // and parse only if recurrency definition was found
      if (n && (ii = n.search(/\*E/))>=0) {
        t.notes = n.slice(0,ii);
        n = n.slice(ii);
        ii = n.search(/\x0A/);
        if (ii > 0) {
          t.notes += n.slice(ii+1);
          n = n.slice(0,ii);
        }
        
        logIt(LOG_DEV, '    > to be parsed "%s"', n);
        parser.doParse(n,t.recDef); 

        if (parser.err.code != parser.PARSE_OK){
          logIt(LOG_WARN,'    > ' + parser.err.text);
        }
        
        logIt(LOG_DEV, '    > parsed "%s"', JSON.stringify(t.recDef));
        
        // if no recurrency start date defined, then let it be January 1st, 2000
        if (!t.recDef.recStart.date) 
          t.recDef.recStart.date = Date(Date.UTC(2000, 0, 1)) 

        // if no recurrency end date defined, then let it be January 1st, 3000
        if (!t.recDef.recEnd.date) 
          t.recDef.recEnd.date = Date(Date.UTC(3000, 0, 1)) 
          
        // if task validity falls inside daterange to be generated, then let's generate instances of it
        if ((t.recDef.recStart.date <= today) && t.recDef.recEnd.date >= today)
          this.createTasks(t, rangeStart, rangeEnd);
      } else 
        logIt(LOG_DEV, '    > not parsed - missing recurrency pattern');
    }
  } else {
    logIt(LOG_INFO,'  > No tasks found in the task list.');
  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.createTasks = function(rTask, rangeStart, rangeEnd) {
  // process specific recurrent task, analyze recurrency pattern and create simple tasks based on the recurrency pattern
  // supported patterns:
  //   DOM - day of a month (parameters: {day of a month})
  //   DOY - day of a year (parameters: {month of a year}, {day of a month})
  //   DAY - exery X day (parameters: {frequency in days})
  var p1, p2
  
  logIt(LOG_INFO, '    >> Creating instances of ',rTask.title);
  if (rTask.recDef.recStart.date <= rangeEnd && rTask.recDef.recEnd.date >= rangeStart) {
    switch (rTask.recDef.recType) {
      case "D":
        this.createTasks_DAY(rTask, rangeStart, rangeEnd);
        break;
      case "M":
        this.createTasks_DoM(rTask, rangeStart, rangeEnd);
        break;
      case "Y":
        this.createTasks_DoY(rTask, rangeStart, rangeEnd);
        break;
    }
  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.saveAllTasks = function(taskListId, rangeStart, rangeEnd) {
  // method saves ALL tasks stored in array dayTasks into specified Google Apps task list
  // the assumption is, that all irrelevant tasks have been removed from dayTasks array
  
  var y, m, d, i;
  var task;
  
  // save/insert all tasks from dayTasks array to specified Google tasks list
  for (m = 0; m < 12; m++)
    for (d = 1; d <= this.monthDays[m]; d++)
      for (i = 0; i < this.dayTasks[m][d].length; i++) {
        task = Tasks.Tasks.insert(this.dayTasks[m][d][i], taskListId);
        logIt(LOG_EXTINFO, '  > Task having ID "%s" has been saved.', task.id);    
        
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
      if (dt) 
        this.removeDuplicatesFromDayTasks(title, dt); //remove tasks from specific date
    }
  } else 
    logIt(LOG_INFO, '  > No tasks found.');
  
}

//--------------------------------------------------
TaskCalendar.prototype.removeDuplicatesFromDayTasks = function(title, dt) {
  // remove all tasks having specified title from specified date
  var m = dt.getUTCMonth();
  var d = dt.getUTCDate();
  
  for (var i=0;i < this.dayTasks[m][d].length; i++) {
    logIt(LOG_DEV, '  > Removing duplicates for month %s day %s',m,d);
    logIt(LOG_DEV, '  > Due dates: "%s" ** "%s"',this.dayTasks[m][d][i].due2msec,dt.getTime());
    logIt(LOG_DEV, '  > Titles: "%s" ** "%s"',this.dayTasks[m][d][i].title,title);
    if ((this.dayTasks[m][d][i].due2msec == dt.getTime()) && (this.dayTasks[m][d][i].title == title))
      this.dayTasks[m][d].splice(i,1);
  }
  
}