function initTriggers () {
  var tf = "processRecurrentLists"
  if (!ScriptApp.getProjectTriggers().filter(function(trg){ trg.getHandlerFunction() == tf })) {
    Logger.log('No trigger for '+tf+' found. Installing trigger.');
  }
}

function createTriggers() {
  // Trigger every hour.
  ScriptApp.newTrigger('processRecurrentLists')
      .timeBased()
      .everyHours(1)
      .create();
}
