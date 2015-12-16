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
  // Trigger every hour.
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
