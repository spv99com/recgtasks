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
function initTriggers (tmz) {
  if (TESTMODE == 1) 
    logIt(LOG_CRITICAL,'TESTMODE - No trigger will be installed for timezone %s.',tmz);
  else
    //if list of project triggers does not contain any trigger having callback function name the same as we use
    if (getTriggers() == 0) {
      logIt(LOG_CRITICAL,'No trigger for "'+triggerFunction+'" found. Installing trigger for time zone %s.',tmz);
      createTriggers(tmz);
    }
    else 
      logIt(LOG_DEV, 'Trigger installed already.');
}

//---------------------------------------------
function getTriggers() {
  return (ScriptApp.getProjectTriggers().filter(function(trg){ return trg.getHandlerFunction() == triggerFunction }).length)
}

//---------------------------------------------
function createTriggers(tmz) {
  // Trigger running at 1am depending on timezone specified in settings
  // If no timezone specified, script timezone is used (GMT)
  ScriptApp.newTrigger(triggerFunction)
      .timeBased()
      .everyDays(1)
      .inTimezone(tmz)
      .atHour(1)
      .create();
      
  // Adding extra run just in case first run failed because of API errors    
  ScriptApp.newTrigger(triggerFunction)
      .timeBased()
      .everyDays(1)
      .inTimezone(tmz)
      .atHour(3)
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
  logIt(LOG_CRITICAL,'Removing %s triggers for "'+triggerFunction+'"',t.length);
  for (var i=0;i<t.length;i++){
    ScriptApp.deleteTrigger(t[i]);
  };
  return t.length;
}