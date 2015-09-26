// Copyright 2015 Jozef Sovcik. All Rights Reserved.
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

// primitive function wrapping task resource pagination
// pagination implemented because of API bug causing no greater number than 100 is 
// accepted https://code.google.com/a/google.com/p/apps-api-issues/issues/detail?id=3641
function getTasks_paged(tlid, params){

  var p = JSON.parse(JSON.stringify(params)); //clone object
  if ("fields" in p && p.fields.length > 0 && p.fields.indexOf("nextPageToken") < 0) // add field nextPageToken only if no field specified or missing
    p.fields += ",nextPageToken";
  var tasks = Tasks.Tasks.list(tlid, p);
  var t = [];
  
  if ("items" in tasks)
    t = t.concat(tasks.items);
  
  //while there is a next page
  while ("nextPageToken" in tasks) {
    p.pageToken = tasks.nextPageToken; // page to read is the next page...
    tasks = Tasks.Tasks.list(tlid, p); // get the next page of results
    if ("items" in tasks)
      t = t.concat(tasks.items);
  }
  
  return t;
}


/**
 * Returns information about the tasks within a given task list.
 */
function getTasks(tlid) {

  var tasks
  var params = {fields:"items(title)"};
  
  tasks = getTasks_paged(tlid, params);

  return tasks;

}


function createTaskList(title) {
  var taskList = {title: title}; 
  return Tasks.Tasklists.insert(taskList);  
}


function createTask(taskListId, t, n) {
  var task = { title: t, notes: n};  
  return Tasks.Tasks.insert(task, taskListId); 
}

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
  r.recStart = null;
  r.recEnd = null;
  s = r.toString();
  createTask(id, "Buy milk", "Buy milk every week on Monday & Thursday\n"+s);

  r.recType = "M";
  r.frequency = 1;
  r.monthly.day = 20;
  r.recStart = null;
  r.recEnd = null;  
  s = r.toString();
  createTask(id, "Pay kindergarten", "Pay kindergarten every month on 20th\n"+s);

  r.recType = "Y";
  r.frequency = 1;
  r.yearly.day = 14;
  r.yearly.month = 3; //months are 0-11
  r.recStart = null;
  r.recEnd = null;  
  s = r.toString();
  createTask(id, "Pay taxes", "Every April 14th\n"+s);
  
  r.recType = "W";
  r.frequency = 2;
  r.weekly.days_of_week = [false, false, false, false, false, false, true];
  r.recStart = null;
  r.recEnd = null;  
  s = r.toString();
  createTask(id, "Water plants", "Every second Saturday\n"+s);

  r.recType = "D";
  r.frequency = 5;
  r.recStart = new Date(d.getFullYear(),8,1); 
  r.recEnd = new Date(d.getFullYear(),11,30); 
  s = r.toString();
  createTask(id, "Do jogging", "Do it every 5th day during Sep-Dec\n"+s);
  
}

//---------------------------------------------------------------------------------

function slideTasks(tlid, d) {

  var params
  var tasks
  var yd, ds

  logIt(LOG_INFO, "Going to slide past due tasks to %s", d);

  if (!d)
    d = new Date();
    
  ds = date2rfc3339(d);

  // calculate last midnight
  yd = new Date(d.getTime());
  yd.setDate(yd.getDate()-1);
  yd.setHours(23, 59, 59, 999);
  
  // get list of non-completed tasks which were due before last midnight
  params = {showCompleted:false, dueMax:date2rfc3339(yd)};
  tasks = getTasks_paged(tlid,params);
  
  tasks.forEach(function(t){ 
    logIt(LOG_EXTINFO, ">> Sliding %s from %s", t.title, t.due);
    Tasks.Tasks.patch({due:ds}, tlid, t.id);
  });

}
