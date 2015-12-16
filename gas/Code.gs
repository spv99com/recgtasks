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
var gTaskQTime = 200;  // 200ms sleep = max 5 Task API requests/user/second
var dateMin = new Date(2000, 0, 1);
var dateMax = new Date(2999, 11, 31);

//*****************************************
//*****************************************

function processRecurrentLists(testParam) {

  // Check if the actions of the trigger requires authorization that has not
  // been granted yet; if throw exception.
  if (!isScriptAuthorized()) {
      throw "Trigger installed by RecGTasks app requires authorization to run. Visit http://www.recgtasks.com/app to grant authorization or to unistall."
  }

  // record start of execution
  var cache = CacheService.getUserCache();
  cache.put("execStarted",Date.now(), 8000);

  // read user preferecies for this user & script
  var userProps = getUserProps();
  logLevel = userProps.logVerboseLevel;

  // starting date for calculation is TODAY
  var dateStart = new Date();
  dateStart.setHours(0,0,0,0); //set hours/minutes/seconds to zero
  
  // set ending date for recurrent tasks processing
  var dateEnd = new Date();
  dateEnd.setDate(dateStart.getDate() + parseInt(userProps.dateRangeLength)); 
  dateEnd.setHours(23,59,59,999);

  //override for testing purposes
  if (TESTMODE == 1) {
     logIt(LOG_CRITICAL, "**** TEST MODE ENABLED ****")
     
     userProps = testParam.userProps;
     dateStart = testParam.dateStart;
     dateEnd = testParam.dateEnd;
   
  }
  
  logIt(LOG_DEV, "Executing script as "+Session.getActiveUser().getEmail());
  
  logIt(LOG_DEV, "Date Start: %s", dateStart);
  logIt(LOG_DEV, "Date End: %s", dateEnd);
  logIt(LOG_DEV, "Settings: %s", JSON.stringify(userProps));
  
  logIt(LOG_DEV, "Installed triggers: ");
  ScriptApp.getProjectTriggers().forEach(function (i) { logIt(LOG_DEV, "  >  %s, %s, %s, %s", i.getUniqueId(), i.getEventType(), i.getHandlerFunction(), i.getTriggerSource()) });
  
  
  // create Task Calendar - all recurrent tasks will be created in Task Calendar first
  var taskCal = new TaskCalendar();
  taskCal.setLocale(userProps.weekStartsOn, userProps.dateFormat);

  
  var tasks;
  var result;
  var taskProps;

  try {
    var taskLists = Tasks.Tasklists.list();
  } catch (e) {
    result = "Internal Google Error occured: "+JSON.stringify(e);
    logIt(LOG_CRITICAL,result );
    return result
  }
    
  if ("items" in taskLists) {
    
    // identify default Task List which instances of recurrent tasks will be copied into
    for (var i = 0; i < taskLists.items.length; i++) {
      if (taskLists.items[i].id == userProps.destTaskListId) 
        var defaultTaskList = taskLists.items[i];
    }
    
    if (defaultTaskList) {
      
      // process all Tasks lists and create instances of tasks from Recurrent task lists (those having the right prefix in task list name)
      for (i = 0; i < taskLists.items.length; i++) {
        if (taskLists.items[i].title.indexOf(userProps.recListPrefix) == 0 
            && taskLists.items[i].id != defaultTaskList.id ) {
          logIt(LOG_INFO, '<b>Processing RTTL "%s" to list "%s"</b>', taskLists.items[i].title, defaultTaskList.title);
          
          // load tasks from Google Tasks recurrent task list
          tasks = getTasks_paged(taskLists.items[i].id, {
            showCompleted:false // RTTL templates flagged as completed will not be processed
            //fields: "items(id,title,notes,due)" //to limit amount of data transported
          });

          // create instances of recurrent tasks in task calendar
          taskCal.processRecTasks(tasks, dateStart, dateEnd)
          
        } else {
          logIt(LOG_INFO, '<b>Ignoring task list "%s" - it is not RTTL.</b>', taskLists.items[i].title);
        }

      }        

      logIt(LOG_INFO, 'Fetching tasks for deduplication ', 0);
      logIt(LOG_DEV, 'Range Start %s [%s]', dateStart, dateStart.toISOString());
      logIt(LOG_DEV, 'Range End %s [%s]', dateEnd, dateEnd.toISOString());
      
      // load tasks from Google Tasks  Default Task list
      taskProps = {
        dueMin:dateStart.toISOString(), 
        //dueMax:dateEnd.toISOString(),
        showHidden:true,
        showDeleted:userProps.ignoreDeleted == "N",
        fields: "items(id,title,notes,due, deleted)" //to limit amount of data transported
      };
      tasks = getTasks_paged(defaultTaskList.id, taskProps);

      logIt(LOG_INFO, 'Removing possible duplicates for %s task instances.',tasks.length);
      // remove tasks which already exist in Google tasks from our array, so only new tasks will remain
      taskCal.removeDuplicatesFromArray(tasks);
      
      logIt(LOG_INFO, 'Saving newly created instances of tasks.');
      // save tasks from work calendar to Default task list - avoid duplicates
      taskCal.saveAllTasks(defaultTaskList.id, dateStart, dateEnd)
      
    } else {
      result = 'Destination task list '+userProps.destTaskListId+' not found.';
      logIt(LOG_CRITICAL, result);
      
    }  
  } else {
    result = 'No task lists found.';
    logIt(LOG_CRITICAL, result);
  }
  
  // if default task list does exist and sliding of overdue tasks enabled, then slide them to TODAY
  if (defaultTaskList && userProps.slideOverdue == "Y") {
    slideTasks(defaultTaskList.id, new Date());
    
    //if sliding caused any duplication, then remove duplicates
    removeDuplicateTasks(defaultTaskList.id, new Date());
  }
  
  logIt(LOG_CRITICAL, "*** Script execution completed ***");
  
  saveLog(cache, Logger.getLog());
  cache.put("execFinished",Date.now(), 8000);
  
  return result;
}
  


