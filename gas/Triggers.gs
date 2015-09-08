var triggerFunction = "processRecurrentLists";

function initTriggers () {
  if (TESTMODE == 1) 
    logIt(LOG_CRITICAL,'TESTMODE - No trigger will be installed.');
  else
    if (!ScriptApp.getProjectTriggers().filter(function(trg){ trg.getHandlerFunction() == triggerFunction })) {
      logIt(LOG_CRITICAL,'No trigger for "'+tf+'" found. Installing trigger.');
      createTriggers();
    }
    else 
      logIt(LOG_DEV, 'Trigger installed already.');
}

function createTriggers() {
  // Trigger every hour.
  ScriptApp.newTrigger('processRecurrentLists')
      .timeBased()
      .everyHours(1)
      .create();
}

function getTriggerDetails () {
  var cache = CacheService.getUserCache();
  return [cache.get("execStarted"), cache.get("execFinished")];
}
