// Copyright (c) 2015-2018 Jozef Sovcik. All Rights Reserved.
//
// Portions Copyright 2013 Google Inc. All Rights Reserved.
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

//---------------------------------------------------------------------------------
/**
 * Returns the ID and name of every task list in the user's account.
 * @return {Array.<Object>} The task list data.
 */
function getTaskLists() {
  
  var taskLists = Tasks.Tasklists.list().getItems();
  if (!taskLists) {
    return [];
  }
  return taskLists.map(function(taskList) {
    return {
      id: taskList.getId(),
      name: taskList.getTitle()
    };
  });
}

//---------------------------------------------------------------------------------
// primitive function wrapping task resource pagination
// pagination implemented because of API bug causing no greater number than 100 is 
// accepted https://code.google.com/a/google.com/p/apps-api-issues/issues/detail?id=3641
function getTasks_paged(tlid, params){

  var p = JSON.parse(JSON.stringify(params)); //clone object
  if ("fields" in p && p.fields.length > 0 && p.fields.indexOf("nextPageToken") < 0) // add field nextPageToken only if no field specified or missing
    p.fields += ",nextPageToken";
    
  var tasks;
  
  tasks = safeTaskListRead(tlid,p);
  if (!tasks) return [];
  
  var t = [];
  
  if (tasks.items)
    t = t.concat(tasks.items);
  
  //while there is a next page
  while ("nextPageToken" in tasks) {
    p.pageToken = tasks.nextPageToken; // page to read is the next page...
    Utilities.sleep(gTaskQTime); // artificial pause to manage API quota
    
    tasks = safeTaskListRead(tlid,p);
    if (!tasks) break;
        
    if (tasks.items)
      t = t.concat(tasks.items);
  }
  
  return t;
}


//---------------------------------------------------------------------------------
/**
 * Returns information about the tasks within a given task list.
 */
function getProcessedTasks(tlid) {

  var tasks
  var tasks_proc = [];
  var tproc = {};
  
  // get all tasks
  var params = {fields:"items(id,title,notes)"};
  tasks = getTasks_paged(tlid, params);
  
  // add recurrence pattern
  var re = /^\*E.*$/m; //"m" stands for multiline flag ^,$ are then limited to a single line
  for (var i=0; i < tasks.length; i++){
    var m = re.exec(tasks[i].notes); // returns an array of matches
    tasks[i].recPattern = m != null ? m[0] : "";
  }
  
  // add parsed recurrence pattern
  var up = getUserProps();  
  var parser = new Record_Parser();
  parser.setWeekStart(up.weekStartsOn);
  parser.setDateFmt(up.dateFormat);
  for (var i=0; i < tasks.length; i++){
    parser.err.reset();
    tasks[i].recDef = new Record_RGT();
    tasks[i].recDef.setWeekStart(up.weekStartsOn);
    tasks[i].recDef.setDateFmt(up.dateFormat);
    parser.doParse(tasks[i].recPattern,tasks[i].recDef);
    tasks_proc[i] = {
      id : tasks[i].id,
      title: tasks[i].title,
      notes: tasks[i].notes,
      recPattern: null
    }
    
    if (parser.err.code == parser.PARSE_OK && tasks[i].recPattern){
      tasks_proc[i].recPattern = tasks[i].recPattern;
      tasks_proc[i].recType = tasks[i].recDef.recType;
      tasks_proc[i].recFreq = tasks[i].recDef.frequency;
      tasks_proc[i].recW_dow = tasks[i].recDef.weekly.days_of_week;
      tasks_proc[i].recM_day = tasks[i].recDef.monthly.day;
      tasks_proc[i].recY_month = tasks[i].recDef.yearly.month;
      tasks_proc[i].recY_day = tasks[i].recDef.yearly.day;
      
      // it is important to send date without timezone information so client can interpret it as its own timezone
      tasks_proc[i].recStart = tasks[i].recDef.recStart.date > dateMin ? date2rfc3339(tasks[i].recDef.recStart.date, '') : null;
      tasks_proc[i].recEnd = tasks[i].recDef.recEnd.date < dateMax ? date2rfc3339(tasks[i].recDef.recEnd.date, '') : null;
    } else {
      // logIt(LOG_DEV, "Wrong recurrence pattern %s : %s", tasks[i].title, tasks[i].notes);
    }
    
  }
  
  return tasks_proc;

}

//---------------------------------------------------------------------------------

function createTaskList(title) {
  var taskList = {title: title}; 
  return Tasks.Tasklists.insert(taskList);  
}

//---------------------------------------------------------------------------------

function createTask(taskListId, t, n) {
  var task = { title: t, notes: n};  
  return Tasks.Tasks.insert(task, taskListId); 
}

//---------------------------------------------------------------------------------

function deleteTask(taskListId, tid) {
  logIt(LOG_EXTINFO, ">> Deleting task %s", tid);
  try {
    Tasks.Tasks.patch({deleted:true}, taskListId, tid);
  } catch (e) {
    logIt(LOG_CRITICAL, "Failed deleting task %s. err=%s", tid, JSON.stringify(e));
  }
}

//---------------------------------------------------------------------------------

function updateRecTask(taskListId, t){
  var userProps = getUserProps();
  
  var r = new Record_RGT();
  r.locFmt.setWeekStart(userProps.weekStartsOn);
  r.locFmt.setDateFmt(userProps.dateFormat);

  r.recType = t.recType;
  r.frequency = t.recFreq;
  r.recStart.date = ((t.recStart_ms) ? new Date(t.recStart_ms):null);
  r.recEnd.date = ((t.recEnd_ms) ? new Date(t.recEnd_ms):null);
  r.weekly.days_of_week = t.recW_dow;
  r.monthly.day = t.recM_day;
  r.yearly.month = t.recY_month;
  r.yearly.day = t.recY_day;
  r.title = t.title;
  r.notes = t.notes;
  
  var s = r.toString();
  s = r.notes+(r.notes?"\n":"")+s; //append recurrence pattern to the end of notes
  
  logIt(LOG_EXTINFO, ">> Updating task %s", t.id);
  try {
    Tasks.Tasks.patch({title:r.title, notes:s}, taskListId, t.id);
  } catch (e) {
    logIt(LOG_CRITICAL, "Failed updating task %s. err=%s", r.title, JSON.stringify(e));
  }

}

//---------------------------------------------------------------------------------

function createExampleList(title) {
  // read user preferecies for this user & script
  var userProps = getUserProps();
  
  var r = new Record_RGT();
  r.locFmt.setWeekStart(userProps.weekStartsOn);
  r.locFmt.setDateFmt(userProps.dateFormat);
  
  var s; 
  
  var d = new Date();
  var id = createTaskList(userProps.recListPrefix+" "+title).getId();
  
  r.recType = "W";
  r.frequency = 1;
  r.weekly.days_of_week = [false, true, false, false, true, false, false];
  r.recStart.date = null;
  r.recEnd.date = null;
  s = r.toString();
  createTask(id, "Buy milk", "Buy milk every week on Monday & Thursday\n"+s);

  r.recType = "M";
  r.frequency = 1;
  r.monthly.day = 20;
  r.recStart.date = null;
  r.recEnd.date = null;  
  s = r.toString();
  createTask(id, "Pay kindergarten", "Pay kindergarten every month on 20th\n"+s);

  r.recType = "Y";
  r.frequency = 1;
  r.yearly.day = 14;
  r.yearly.month = 3; //months are 0-11
  r.recStart.date = null;
  r.recEnd.date = null;  
  s = r.toString();
  createTask(id, "Pay taxes", "Every April 14th\n"+s);
  
  r.recType = "W";
  r.frequency = 2;
  r.weekly.days_of_week = [false, false, false, false, false, false, true];
  r.recStart.date = null;
  r.recEnd.date = null;  
  s = r.toString();
  createTask(id, "Water plants", "Every second Saturday\n"+s);

  r.recType = "D";
  r.frequency = 5;
  r.recStart.date = new Date(d.getFullYear(),8,1); 
  r.recEnd.date = new Date(d.getFullYear(),11,30); 
  s = r.toString();
  createTask(id, "Do jogging", "Do it every 5th day during Sep-Dec\n"+s);
  
}

//---------------------------------------------------------------------------------

function slideTasks(tlid, d) {

  var params
  var tasks
  var yd, ds
  
  logIt(LOG_INFO, "Sliding past due tasks to date: %s", d);

  ds = date2rfc3339(d);

  // calculate last midnight
  yd = new Date(d.getTime());
  yd.setDate(yd.getDate()-1);
  yd.setHours(23, 59, 59, 999);
  
  // get list of non-completed tasks which were due before last midnight
  logIt(LOG_DEV, ">> Getting list of overdue tasks: %s", date2rfc3339(yd));
  params = {showCompleted:false, dueMax:date2rfc3339(yd)};
  tasks = getTasks_paged(tlid,params);

  for (var i=0;i < tasks.length;i++){
    logIt(LOG_EXTINFO, ">> Sliding %s from %s", tasks[i].title, tasks[i].due);
    try {
      Tasks.Tasks.patch({due:ds}, tlid, tasks[i].id);
    } catch (e) {
      logIt(LOG_CRITICAL,"Failed sliding task error=%s", e.message);
    }
    
    Utilities.sleep(gTaskQTime); // artificial pause to manage API quota     
  };

  logIt(LOG_EXTINFO, ">> Slid %s tasks", i);

}

//-----------------------------------------------------------------------------------

function removeDuplicateTasks(tlid, d){

  var ds, td1, td2
  var count = 0;
  
  logIt(LOG_INFO, "Removing duplicate tasks from date: %s", d);

  // beginning of the date
  td1 = new Date(d.getTime());
  td1.setHours(0,0,0,000);
  // end of date
  td2 = new Date(d.getTime());
  td2.setHours(23,59,59,999);

  // get the list of tasks for specified date
  logIt(LOG_DEV, ">> Getting list of tasks date: %s, %s", td1, td2);
  var params = {showCompleted:true, dueMin:date2rfc3339(td1), dueMax:date2rfc3339(td2)};
  var tasks = getTasks_paged(tlid,params);
    
  // remove duplicates
  for (var i=0; i<tasks.length; i++)
    for (var j = i+1; j<tasks.length; j++){
      // check if every task of today is different from the one currently being slid
      if (tasks[i].title == tasks[j].title) {
        logIt(LOG_EXTINFO, ">> Deleting duplicate %s from %s", tasks[j].title, tasks[j].due);
        Tasks.Tasks.patch({deleted:true}, tlid, tasks[j].id);
        count++;
        Utilities.sleep(gTaskQTime); // artificial pause to manage API quota

      };
    };

  logIt(LOG_EXTINFO, ">> Removed %s duplicate tasks", count);


}