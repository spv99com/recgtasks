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
      + pad(dt.getSeconds())+tzo;  
  
}

//--------------------------------------------------
function tzOffsetString(dt) {
  
  function pad(n){return n<10 ? '0'+n : n}
  
  var h, m, n
  
  if (!dt)
    dt = new Date();
    
  h = dt.getTimezoneOffset()/60;
  if (h >= 0) {n="+"} else {n="-"};
  h = Math.floor(Math.abs(h));
  m = Math.abs(dt.getTimezoneOffset() % 60);
  
  return (n+pad(h)+":"+pad(m));
}
