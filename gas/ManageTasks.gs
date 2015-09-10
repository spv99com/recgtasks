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

/**
 * Returns information about the tasks within a given task list.
 * @param {String} taskListId The ID of the task list.
 * @return {Array.<Object>} The task data.
 */
function getTasks(taskListId) {
  var tasks = Tasks.Tasks.list(taskListId).getItems();
  if (!tasks) {
    return [];
  }
  return tasks.map(function(task) {
    return {
      id: task.getId(),
      title: task.getTitle(),
      notes: task.getNotes()
    };
  }).filter(function(task) {
    return task.title
  });
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
  
  var d = new Date();
  var id = createTaskList(userProps.recListPrefix+" "+title).getId();

  createTask(id, "Buy milk", "Buy milk every week on Monday & Thursday\r*E 1 W 25");
  createTask(id, "Pay kindergarten", "Pay kindergarten every month on 20th\r*E 1 M 20");
  createTask(id, "Pay taxes", "Every April 15th\r*E 1 Y 04/15");
  createTask(id, "Water plants", "Every second Saturday\r*E 2 W 7");
  createTask(id, "Do jogging", "Do it every second day during Jun-Sep, "+d.getFullYear()+"\r*E 2 D S "+d.getFullYear()+"-06-01 E "+d.getFullYear()+"-09-30");
  
}
