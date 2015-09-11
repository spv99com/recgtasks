// Copyright 2015 Jozef Sovcik. All Rights Reserved.
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

//*********************************************************

LOG_CRITICAL = 1;
LOG_WARN = 2;
LOG_INFO = 3;
LOG_EXTINFO = 4;
LOG_DEV = 10;

var logLevel = LOG_WARN;
var logs = ["execLog1", "execLog2", "execLog3", "execLog4", "execLog5"];

function logIt(l,fmt,v1, v2, v3, v4, v5, v6) {
  if (l > logLevel) return;
  
  var prefix = "??? ";
  
  switch (l){
    case LOG_CRITICAL: prefix = "[C] ";break;
    case LOG_WARN: prefix = "[W] "; break;
    case LOG_INFO: prefix = "[I] "; break;
    case LOG_EXTINFO: prefix = "[O] "; break;
  }
  
  Logger.log(prefix+fmt+"<br>", v1, v2, v3, v4, v5, v6);
}

function getLog(){
  var body = "";
  var cache = CacheService.getUserCache();
  logs.forEach(function(itm, idx){body += cache.get(itm);});
  return "<h3>*** Log beginning ***</h3>" + body + "<h3>*** Log end ***</h3>";
}

function saveLog(cache, log){
  var i = 0;
  
  cache.removeAll(logs)
  while (log.length > 0 || i>4){
    cache.put(logs[i], log.substr(0,80000));
    log = log.substr(80000);
    i++
  }
}
