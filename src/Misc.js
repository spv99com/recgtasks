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
    return (authInfo.getAuthorizationStatus() == ScriptApp.AuthorizationStatus.NOT_REQUIRED);
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

/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://gist.github.com/vaiorabbit/5657561
 * Ref.: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @param {string} str the input value
 * @param {boolean} [asString=false] set to true to return the hash value as 
 *     8-digit hex string instead of an integer
 * @param {integer} [seed] optionally pass the hash of the previous chunk
 * @returns {integer | string}
 */
function hashFnv32a(str, asString, seed) {
    /*jshint bitwise:false */
    var i, l,
        hval = (seed === undefined) ? 0x811c9dc5 : seed;

    for (i = 0, l = str.length; i < l; i++) {
        hval ^= str.charCodeAt(i);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    if( asString ){
        // Convert to 8 digit hex string
        return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
    }
    return hval >>> 0;
}