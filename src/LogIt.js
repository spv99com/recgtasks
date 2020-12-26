LOG_ALL = "00";
LOG_CRITICAL = "01";
LOG_WARN = "02";
LOG_INFO = "03";
LOG_EXTINFO = "04";
LOG_DEV = "10";
LOG_TRACE = "20";

var logLevel = LOG_WARN;
var logs = ["execLog1", "execLog2", "execLog3", "execLog4", "execLog5"];

function logIt(l,fmt,v1, v2, v3, v4, v5, v6) {
  if (l > logLevel) return;
  
  var prefix = "??? ";
  
  switch (l){
    case LOG_ALL: prefix = "[A] "; break;
    case LOG_CRITICAL: prefix = "[C] ";break;
    case LOG_WARN: prefix = "[W] "; break;
    case LOG_INFO: prefix = "[I] "; break;
    case LOG_EXTINFO: prefix = "[O] "; break;
    case LOG_DEV: prefix = "[D] "; break;
    case LOG_TRACE: prefix = "[T] "; break;
  }
  
  Logger.log(prefix+fmt, v1 || "", v2 || "", v3 || "", v4 || "", v5 || "", v6 || "");
}

function getLog(){
  var body = "";
  var cache = CacheService.getUserCache();
  logs.forEach(function(itm, idx){var c = cache.get(itm); c != null ? body += c.replaceAll("\n","<br>") : body+="";});
  return body.length>0?"<h3>*** Log beginning ***</h3>" + body + "<h3>*** Log end ***</h3>":"";
}

function saveLog(log){
  var cache = CacheService.getUserCache();
  var i = 0;
  
  cache.removeAll(logs)
  while (log.length > 0 || i>4){
    cache.put(logs[i], log.length>0 ? log.substr(0,80000) : "");
    log = log.substr(80000);
    i++
  }
}

function logExecutionStart(manual){
  var props = PropertiesService.getUserProperties();
  props.setProperty("execStarted",Date.now().toString());
  props.setProperty("execFinished",0);
  props.setProperty("execResult","Not finished...");
  props.setProperty("execType",manual?"Manual":"Automatic");
}

function logExecutionEnd(){
  var props = PropertiesService.getUserProperties();
  props.setProperty("execFinished",Date.now().toString());
}

function logExecutionResult(result){
  var props = PropertiesService.getUserProperties();
  props.setProperty("execResult",result);
}
