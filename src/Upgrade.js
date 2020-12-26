function isUpgradeNeeded(currentBuild){
    var props = PropertiesService.getUserProperties();
    var cb = props.getProperty("codeBuild");
    logIt(LOG_DEV, "Checking upgrade. App=%s Installed=%s", currentBuild, cb );
    return cb != currentBuild;
}

function performUpgrade(currentBuild){
    var allOK = true;
    try {
        removeAllTriggers(); 
        initTriggers (userTimeZone);
    } catch(err) {
        var e='Error setting triggers. err='+err.message;
        logIt(LOG_CRITICAL,e);
        logExecutionResult(e);
        allOK=false;
    }

    if (allOK){
        var props = PropertiesService.getUserProperties();
        props.setProperty("logVerboseLevel","02");  // reset user's log level to WARN after upgrade
        props.setProperty("codeBuild",currentBuild);
    }
}