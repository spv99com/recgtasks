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
  this.dateFormat

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
TaskCalendar.prototype.createTasks_DoM = function(task, rangeStart, rangeEnd, dom) {
  //create "Day of Month recurrence" task occurences
  //params:
  //   task - task
  //   dom - day of month
  //   rangeStart, rangeEnd - start and end date for data range to be considered
  
  var y = rangeStart.getUTCFullYear();
  var m = rangeStart.getUTCMonth();
  var d = this.alignMonthDays(m, dom);
  var t;
  
  var dt = new Date(Date.UTC(y, m, d));
  dt.setUTCHours(0,0,0,0);
  
  while (dt < rangeStart) {
    m++;
    d = this.alignMonthDays(m, dom);    
    dt.setTime(Date.UTC(y, m, d));
    dt.setUTCHours(0,0,0,0);
  }
  
  while (dt <= rangeEnd) {
    //var x = this.dayTasks[moy][dom];
    //var x1 = this.dayTasks[moy][dom].length;
    //var x2 = this.copyTask(task);

    t = this.copyTask(task);
    t.due = dt.toISOString(); //Google Tasks require due date to be written in ISO format
    t.due2msec = dt.getTime(); //secondary due date kept for further internal processing
    this.dayTasks[m][d][this.dayTasks[m][d].length] = t;
    
    m++;
    d = this.alignMonthDays(m, dom);
    dt.setTime(Date.UTC(y, m, d));
  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.createTasks_DoY = function(task, rangeStart, rangeEnd, moy, dom) {
  //create "Date of Year recurrence" task occurences
  //params:
  //   task - task
  //   dom - day of month
  //   moy - month of year
  //   rangeStart, rangeEnd - start and end date for data range to be considered
  
  var y = rangeStart.getUTCFullYear();
  var m = moy % 12;
  var d = this.alignMonthDays(m, dom);
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
TaskCalendar.prototype.createTasks_DAY = function(task, rangeStart, rangeEnd, freq) {
  //create "Every X days recurrence" task occurences
  //params:
  //   task - task
  //   freq - every X day
  //   recStart - starting date for recurrency
  //   rangeStart, rangeEnd - start and end date for data range to be considered
  
  var d = (rangeStart.getTime() - task.recStart.getTime()) / 86400000; //difference in miliseconds to days
  d = Math.floor(d % freq); // number of days since last calculated occurence rounded to WHOLE days
  var m;
  
  var dt = new Date();
  dt.setUTCHours(0,0,0,0);
  
  dt.setUTCDate(dt.getUTCDate() - d); // date of the previous occurence
  if (dt < rangeStart) // if outside the range, then add one occurence
    dt.setUTCDate(dt.getUTCDate() + freq);
  
  while (dt <= rangeEnd) {
    t = this.copyTask(task);
    t.due = dt.toISOString(); //Google Tasks require due date to be written in ISO format
    t.due2msec = dt.getTime(); //secondary due date kept for further internal processing
    d = dt.getUTCDate();
    m = dt.getUTCMonth();
    this.dayTasks[m][d][this.dayTasks[m][d].length] = t;
    dt.setUTCDate(dt.getUTCDate()+freq);
  }
  
}

//--------------------------------------------------

TaskCalendar.prototype.processRecTasks = function (rTasks, rangeStart, rangeEnd) {
  // process all tasks from a specified task list and enter them into specified task calendar object
  //
  // rTasks - list of tasks to be processed
  // rangeStart, rangeEnd - date range for which tasks will be created
  
  var today = new Date();
    
  if (rTasks.items) {
    for (var i = 0; i < rTasks.items.length; i++) {
      var t = new RecurrentTask("no title");
      t.title = rTasks.items[i].title;
      t.notes = "";
      t.parseSaved(rTasks.items[i].notes);
      Logger.log('List "%s" Task "%s"', rTasks.title, t.title);
      if (t.recStart <= today && t.recEnd >= today) 
        this.createTasks(t, rangeStart, rangeEnd);
    }
  } else {
    Logger.log('No tasks found.');
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
  
  if (rTask.recStart <= rangeEnd && rTask.recEnd >= rangeStart) {
    switch (rTask.recType.toUpperCase()) {  
      case "DAY":
        p1 = parseInt(rTask.recParam.substr(0,3));
        this.createTasks_DAY(rTask, rangeStart, rangeEnd, p1);
        break;
      case "DOM":
        p1 = parseInt(rTask.recParam.substr(0,2));
        this.createTasks_DoM(rTask, rangeStart, rangeEnd, p1);
        break;
      case "DOY":
        p1 = parseInt(rTask.recParam.substr(0,2));
        p2 = parseInt(rTask.recParam.substr(2,2));
        this.createTasks_DoY(rTask, rangeStart, rangeEnd, p1, p2);
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
        Logger.log('Task with ID "%s" was created.', task.id);    
        
      }
  
}

//--------------------------------------------------
TaskCalendar.prototype.removeDuplicatesFromArray = function(gTasks) {
  // process all tasks in gTasks and remove all tasks from dayTasks array
  // which have the same title and are due on the same date as any task from gTasks
  
  Logger.log('removeDuplicatesFromArray ****');
  if (gTasks.items) {
    for (var i = 0; i < gTasks.items.length; i++) {
      var task = gTasks.items[i];
      var title = gTasks.items[i].title;
      var dt = new Date(gTasks.items[i].due);
      if (dt) 
        this.removeDuplicatesFromDayTasks(title, dt); //remove tasks from specific date
    }
  } else {
    Logger.log('No tasks found.');  
  }
  
}

//--------------------------------------------------
TaskCalendar.prototype.removeDuplicatesFromDayTasks = function(title, dt) {
  // remove all tasks having specified title from specified date
  var m = dt.getUTCMonth();
  var d = dt.getUTCDate();
  
  for (var i=0;i < this.dayTasks[m][d].length; i++) {
    Logger.log('Removing duplicates for month %s day %s',m,d);
    Logger.log('Due dates: "%s" ** "%s"',this.dayTasks[m][d][i].due2msec,dt.getTime());
    Logger.log('Titles: "%s" ** "%s"',this.dayTasks[m][d][i].title,title);
    if ((this.dayTasks[m][d][i].due2msec == dt.getTime()) && (this.dayTasks[m][d][i].title == title))
      this.dayTasks[m][d].splice(i,1);
  }
  
}
