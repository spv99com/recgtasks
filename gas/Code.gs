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

var TESTMODE = 0; //DO NOT DELETE THIS LINE

// comment or un-comment following line to disable/enable test mode
//TESTMODE = 1;  

/**
 * Special function that handles HTTP GET requests to the published web app.
 * @return {HtmlOutput} The HTML page to be served.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
      .setTitle('Recurring Tasks')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

//TODO: remove direct saving to GTasks from TaskCal object - TaskCal should create path-update data set only and saving should occur somewhere else

//*****************************************
//*****************************************

function processRecurrentLists() {
  //TODO - test script for handling of timezones
  
  // read user preferecies for this user & script
  var userProps = getUserProps();
  
  var cache = CacheService.getUserCache();
  cache.put("execStarted",Date.now(), 8000);
  
  logLevel = userProps.logVerboseLevel;
  
  logIt(LOG_INFO, "Executing script as "+Session.getActiveUser().getEmail());
  
  logIt(LOG_DEV, "Installed triggers: ");
  ScriptApp.getProjectTriggers().forEach(function (i) { logIt(LOG_DEV, "  >  %s, %s, %s, %s", i.getUniqueId(), i.getEventType(), i.getHandlerFunction(), i.getTriggerSource()) });
  
  //override for testing purposes
  if (TESTMODE == 1) {
    userProps.recListPrefix =  "TRTL";
    userProps.destTaskListName = "Test List";
    userProps.dateRangeLength = 60;
    logLevel = 999;
    
    logIt(LOG_CRITICAL, "**** TEST MODE ENABLED **** THIS IS NOT SUITABLE FOR REAL DEPLOYMENT ***")
  }

  // create Task Calendar - all recurrent tasks will be created in Task Calendar first
  var taskCal = new TaskCalendar();
  
  // starting date for calculation is TODAY
  var dateStart = new Date();
  dateStart.setHours(0,0,0,0); //set hours/minutes/seconds to zero
  
  // set ending date for recurrent tasks processing
  var dateEnd = new Date();
  dateEnd.setTime(dateEnd.getTime());  //why I did this???
  dateEnd.setDate(dateStart.getDate() + userProps.dateRangeLength); 
  dateEnd.setHours(23,59,59,999);
  
  var tasks;
  var result;

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
        if (taskLists.items[i].title.indexOf(userProps.recListPrefix) == 0 && taskLists.items[i].id != defaultTaskList.id ) {
          logIt(LOG_INFO, '<b>Processing RTTL "%s" to list "%s"</b>', taskLists.items[i].title, defaultTaskList.title);
          
          // load tasks from Google Tasks recurrent task list
          tasks = Tasks.Tasks.list(taskLists.items[i].id);
          
          // create instances of recurrent tasks in task calendar
          taskCal.processRecTasks(tasks, dateStart, dateEnd)
          
        } else {
          logIt(LOG_INFO, '<b>Ignoring task list "%s" - it is not RTTL.</b>', taskLists.items[i].title);
        }

      }        

      // load tasks from Google Tasks  Default Task list
      tasks = Tasks.Tasks.list(defaultTaskList.id, {
        dueMin:dateStart.toISOString(), 
        dueMax:dateEnd.toISOString(),
        showHidden:true,
        maxResults:1000
      });
      
      logIt(LOG_INFO, 'Removing possible duplicates.');
      // remove tasks which already exist in Google tasks from our array, so only new tasks will remain
      if (tasks) 
        taskCal.removeDuplicatesFromArray(tasks);
      
      logIt(LOG_INFO, 'Saving newly created instances of tasks.');
      // save tasks from work calendar to Default task list - avoid duplicates
      taskCal.saveAllTasks(defaultTaskList.id, dateStart, dateEnd)
      
    } else {
      result = 'Destination task list '+userProps.destTaskListName+' not found.';
      logIt(LOG_CRITICAL, result);
      
    }  
  } else {
    result = 'No task lists found.';
    logIt(LOG_CRITICAL, result);
  }
  
  logIt(LOG_CRITICAL, "*** Script execution completed ***");
  
  cache.put("execLog", Logger.getLog(), 8000);
  cache.put("execFinished",Date.now(), 8000);
  
  return result;
}
  


