// Copyright (c) 2015-2016 Jozef Sovcik. All Rights Reserved.
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

var triggerFunction = "processRecurrentLists";  //trigger callback function name

//---------------------------------------------
function initTriggers () {
  if (TESTMODE == 1) 
    logIt(LOG_CRITICAL,'TESTMODE - No trigger will be installed.');
  else
    //if list of project triggers does not contain any trigger having callback function name the same as we use
    if (getTriggers() == 0) {
      logIt(LOG_CRITICAL,'No trigger for "'+triggerFunction+'" found. Installing trigger.');
      createTriggers();
    }
    else 
      logIt(LOG_DEV, 'Trigger installed already.');
}

//---------------------------------------------
function getTriggers() {
  return (ScriptApp.getProjectTriggers().filter(function(trg){ return trg.getHandlerFunction() == triggerFunction }).length)
}

//---------------------------------------------
function createTriggers() {
  // Trigger every 1 hour.
  // Running every one hour is needed because trigger/script is unaware of user's timezone
  ScriptApp.newTrigger(triggerFunction)
      .timeBased()
      .everyHours(1)
      .create();
}

//---------------------------------------------
function getTriggerDetails () {
  var cache = CacheService.getUserCache();
  return [cache.get("execStarted"), cache.get("execFinished")];
}

//---------------------------------------------
function removeAllTriggers() {
  var t = ScriptApp.getProjectTriggers();
  for (var i=0;i<t.length;i++){
    ScriptApp.deleteTrigger(t[i]) 
  };
  return t.length;
}
