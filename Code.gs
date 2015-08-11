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
//*****************************************

function processRecurrentLists() {
  
  // read user preferecies for this user & script
  var userProps = getUserProps()
  
  //override for testing purposes
  //userProps.recListPrefix =  "RTLT";
  //userProps.destTaskListName = "Test List";

  // create Task Calendar - all recurrent tasks will be created in Task Calendar first
  var taskCal = new TaskCalendar();
  
  var dateStart = new Date();
  var dateEnd = new Date();
  var tasks;
  
  var result;
  
  dateStart.setUTCHours(0,0,0,0);
  
  dateEnd.setTime(dateEnd.getTime());
  dateEnd.setUTCDate(dateEnd.getUTCDate() + userProps.dateRangeLength);
  
  dateEnd.setUTCHours(23,59,59,0);

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
          Logger.log('Processing RTTL "%s" ID "%s" to destination task list "%s"', taskLists.items[i].title, taskLists.items[i].id, defaultTaskList.title);
          
          // load tasks from Google Tasks recurrent task list
          tasks = Tasks.Tasks.list(taskLists.items[i].id);
          
          // create instances of recurrent tasks in task calendar
          taskCal.processRecTasks(tasks, dateStart, dateEnd)
          
        } else {
          Logger.log('Ignoring task list "%s" - it is not RTTL.', taskLists.items[i].title);
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
      result = 'ERROR: Destination task list '+userProps.destTaskListName+' not found.';
      Logger.log(result);
      
    }  
  } else {
    result = 'Warning: No task lists found.';
    Logger.log(result);
  }
  
  return result;
}
  

