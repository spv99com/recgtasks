//TODO: remove direct saving to GTasks from TaskCal object - TaskCal should create path-update data set only and saving should occur somewhere else

//*****************************************
//*****************************************

function processRecurrentLists() {
  
  // read user preferecies for this user & script
  var userProps = new RGTProperties()

  // create Task Calendar - all recurrent tasks will be created in Task Calendar first
  var taskCal = new TaskCalendar();
  
  var dateStart = new Date();
  var dateEnd = new Date();
  var tasks;
  
  dateEnd.setTime(dateEnd.getTime());
  dateEnd.setDate(dateEnd.getDate() + userProps.dateRangeLength);
  
  dateEnd.setHours(23);
  dateEnd.setMinutes(59);
  dateEnd.setSeconds(59);

  var taskLists = Tasks.Tasklists.list();
  if (taskLists.items) {
    
    // identify default Task List which instances of recurrent tasks will be copied into
    for (var i = 0; i < taskLists.items.length; i++) {
      if (taskLists.items[i].title == userProps.destTaskListName) 
        var defaultTaskList = taskLists.items[i];
    }
    
    if (defaultTaskList) {
      
      // process all Tasks lists and create instances of tasks from Recurrent task lists (those having the right prefix in task list name)
      for (i = 0; i < taskLists.items.length; i++) {
        if (taskLists.items[i].title.substr(0,3) == userProps.recListPrefix && taskLists.items[i].id != defaultTaskList.id ) {
          Logger.log('Recurrent task list "%s" ID "%s" copying to list "%s"', taskLists.items[i].title, taskLists.items[i].id, defaultTaskList.title);
          
          // load tasks from Google Tasks recurrent task list
          tasks = Tasks.Tasks.list(taskLists.items[i].id);
          
          // create instances of recurrent tasks in task calendar
          taskCal.processRecTasks(tasks, dateStart, dateEnd)
          
        } else {
          Logger.log('Not recurrent task list "%s"', taskLists.items[i].title);
        }

      }        

      // load tasks from Google Tasks  Default Task list
      tasks = Tasks.Tasks.list(defaultTaskList.id, {
        dueMin:dateStart.toISOString(), 
        dueMax:dateEnd.toISOString(),
        showHidden:true,
        maxResults:1000
      });
      
      // remove tasks which already exist in Google tasks from our array, so only new tasks will remain
      if (tasks) 
        taskCal.removeDuplicatesFromArray(tasks);
      
      // save tasks from work calendar to Default task list - avoid duplicates
      taskCal.saveAllTasks(defaultTaskList.id, dateStart, dateEnd)
      
    } else {
      Logger.log('No DEFAULT task list found.');
    }  
  } else {
    Logger.log('No task lists found.');
  }
}
  


//**********************************************************  
//**********************************************************

function RGTProperties() {
  
  this.load();
  if (!(this.destTaskListName) || (this.destTaskListName.length < 1)) {
    this.setDefaults();
    this.save()
  }
  
}

RGTProperties.prototype.setDefaults = function() {
  // set default task list name - instances of tasks will be created in this tasklist
  this.destTaskListName = "RTL Testlist";
  // set number of days into the future for maintainng recurrent tasks - it does not make sense to recreate whole year in advance
  this.dateRangeLength = 60;
  // Recurrent Tasks Task List prefix
  this.recListPrefix =  "RTL";

}

//--------------------------------------------------
RGTProperties.prototype.save = function() {
 var p = PropertiesService.getUserProperties();
 var newp = {
   destTaskListName: this.destTaskListName, 
   dateRangeLength: this.dateRangeLength,
   recListPrefix: this.recListPrefix
 };
  
 p.setProperties(newp);  
  
}

//--------------------------------------------------
RGTProperties.prototype.load = function() {
  var p = PropertiesService.getUserProperties();
  this.destTaskListName = p.getProperty("destTaskListName");
  this.dateRangeLength = parseInt(p.getProperty("dateRangeLength"));
  this.recListPrefix = p.getProperty("recListPrefix");
  
}

//**********************************************************

function RecurrentTask(t) {
  // RecurrentTask object constructor
  
  this.title = t;
  this.notes = "";
  this.recStart = new Date(Date.UTC(2000,00,01));
  this.recEnd = new Date(Date.UTC(3000,11,31));
  this.recType = "x";
  this.recParam = "x";

}

//--------------------------------------------------
RecurrentTask.prototype.parseSaved = function(n) {
  // parse text note for JSON data
  
  // TODO: timezone of recurrence start and end - UTC is used everywhere, but unsure what user entered in start/end of recurrence
 
  if (n) {
    n = n.replace(/\x0A/g, "")
    n = n.replace(/\x0D/g, "")
    var tn = JSON.parse(n);
    var sp;
    if (tn) {
      sp = tn.recStart ? tn.recStart.split('-') : [2000,1,1];
      this.recStart = sp.length >= 3 ? new Date(sp[0], sp[1]-1, sp[2]) : new Date(2000,00,01);
      
      sp = tn.recEnd ? tn.recEnd.split('-') : [3000,12,31];
      this.recEnd = sp.length >= 3 ? new Date(sp[0], sp[1]-1, sp[2]) : new Date(3000,11,31);
      
      this.recType = tn.recType || "x";
      this.recParam = tn.recParam || "x";
      this.notes = tn.notes;
    }
  }
  
}


//**********************************************************

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
TaskCalendar.prototype.createTasks_DoM = function(task, dom, rangeStart, rangeEnd) {
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
  
  while (dt < rangeStart) {
    m++;
    d = this.alignMonthDays(m, dom);    
    dt.setTime(Date.UTC(y, m, d));
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
TaskCalendar.prototype.createTasks_DoY = function(task, moy, dom, rangeStart, rangeEnd) {
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
  var p1, p2
  
  if (rTask.recStart <= rangeEnd && rTask.recEnd >= rangeStart) {
    switch (rTask.recType.toUpperCase()) {  
      case "DAY":
        break;
      case "DOM":
        p1 = parseInt(rTask.recParam.substr(0,2));
        this.createTasks_DoM(rTask, p1, rangeStart, rangeEnd);
        break;
      case "DOY":
        p1 = parseInt(rTask.recParam.substr(0,2));
        p2 = parseInt(rTask.recParam.substr(2,2));
        this.createTasks_DoY(rTask, p1, p2, rangeStart, rangeEnd);
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


//***********************************************************
  
