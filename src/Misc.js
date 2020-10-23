// Copyright (c) 2015-2020 Jozef Sovcik. All Rights Reserved.
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

//--------------------------------------------------
function date2rfc3339(dt, tzo) {
  // Google requires task due date in rfc3339 format, BUT ignores the time part of it,
  // so it does shift tasks to another day in case of using toISOString() function
  // 2008-11-13T00:00:00+01:00 == 2008-11-12T23:00:00Z
  
  function pad(n){return n<10 ? '0'+n : n}
  
  if (tzo == undefined)
    tzo = "Z"; //if not defined, then UTC "Zulu" time
  
  return dt.getFullYear()+'-'
      + pad(dt.getMonth()+1)+'-'
      + pad(dt.getDate())+'T'
      + pad(dt.getHours())+':'
      + pad(dt.getMinutes())+':'
      + pad(dt.getSeconds())+".000"+tzo;  
  
}

//--------------------------------------------------
function tzOffsetString(dt) {
  
  function pad(n){return n<10 ? '0'+n : n}
  
  var h, m, n
  
  if (!dt)
    dt = new Date();
    
  h = dt.getTimezoneOffset()/60;
  n = (h >= 0) ? "-" : "+";
  h = Math.floor(Math.abs(h));
  m = Math.abs(dt.getTimezoneOffset() % 60);
  
  return (n+pad(h)+":"+pad(m));
}

//----------------------------------------------------

function isScriptAuthorized() {
  try {
    var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    return (authInfo.getAuthorizationStatus() != ScriptApp.AuthorizationStatus.REQUIRED);
  } catch (e) {
    console.warn("[isScrAuth] RecGTasks.com Script not authorized. err=%s",e.message);
    return false;
  }
}

//----------------------------------------------------

function leapYear(year) {
  // returns true for leap year
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
}

//----------------------------------------------------
function getUserDetails() {
  var ue = "-not authorized-";
  if (isScriptAuthorized()) ue = Session.getActiveUser().getEmail();
  return ({ua:ue});
}

//----------------------------------------------------
function safeReadTasklists(){
  var retry=true;
  var retryCount=10;
  var result=null;
  
  while (retry && retryCount > 0){
    try {  
      result = Tasks.Tasklists.list();
      retry=false;
    } catch (e) {
      logIt(LOG_CRITICAL, "Internal Google Error occured: %s", JSON.stringify(e));
      retryCount--;
      Utilities.sleep(gTaskQTime); // artificial pause to manage API quota
    }
  }
  
  return result;

}

//----------------------------------------------------
function safeTaskListRead(tlid,p){
  var retry=true;
  var retryCount=10;
  var tasks=null;
  
  while (retry && retryCount > 0){
    try {  
      logIt(LOG_DEV, "[safeTLRead] Reading list %s params=%s", tlid, JSON.stringify(p));
      tasks = Tasks.Tasks.list(tlid, p);
      retry=false;
    } catch (e) {
      logIt(LOG_CRITICAL, "Internal Google Error occured: %s", e.message);
      retryCount--;
      Utilities.sleep(gTaskQTime); // artificial pause to manage API quota
    }
  }
  
  return tasks;

}

//----------------------------------------------------
function safeTaskInsert(task, taskListId){
  var retry=true;
  var retryCount=10;
  var result=null;

  while (retry && retryCount > 0) {
    try {
      result = Tasks.Tasks.insert(task, taskListId);
      retry = false;
    } catch(e) {
      logIt(LOG_CRITICAL, "Internal Google Error occured: %s", JSON.stringify(e));
      retryCount--;
      Utilities.sleep(gTaskQTime); // artificial pause to manage API quota
    }
  }
  
  return result;

}