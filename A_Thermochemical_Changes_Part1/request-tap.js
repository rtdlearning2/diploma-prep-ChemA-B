
/*! request-tap: logs network requests & errors to console */
(function(){
  function log(){ try{ console.log.apply(console, arguments); }catch(_){ } }

  // fetch
  if (typeof window.fetch === "function"){
    const _fetch = window.fetch;
    window.fetch = function(u, opts){
      log("[tap][fetch] →", u);
      return _fetch.call(this, u, opts).then(res => {
        log("[tap][fetch] ←", res.url || u, res.status, res.ok ? "OK" : "FAIL");
        return res;
      }).catch(err => {
        log("[tap][fetch][ERR]", u, err && err.message || err);
        throw err;
      });
    };
  }

  // XHR
  if (typeof XMLHttpRequest !== "undefined"){
    const _open = XMLHttpRequest.prototype.open;
    const _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url){
      this.__tap_url = url;
      this.addEventListener("load", () => {
        log("[tap][xhr] ←", this.__tap_url, this.status, this.statusText);
      });
      this.addEventListener("error", () => {
        log("[tap][xhr][ERR]", this.__tap_url);
      });
      return _open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(){
      log("[tap][xhr] →", this.__tap_url);
      return _send.apply(this, arguments);
    };
  }

  // script src
  try{
    const desc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");
    if (desc && desc.set){
      Object.defineProperty(HTMLScriptElement.prototype, "src", {
        set: function(v){
          log("[tap][script] →", v);
          this.addEventListener("load", () => log("[tap][script] ←", v, "OK"));
          this.addEventListener("error", () => log("[tap][script][ERR]", v));
          return desc.set.call(this, v);
        },
        get: function(){ return desc.get.call(this); }
      });
    }
  }catch(_){}

  // image src
  try{
    const idesc = Object.getOwnPropertyDescriptor(Image.prototype, "src");
    if (idesc && idesc.set){
      Object.defineProperty(Image.prototype, "src", {
        set: function(v){
          log("[tap][img] →", v);
          this.addEventListener("load", () => log("[tap][img] ←", v, "OK"));
          this.addEventListener("error", () => log("[tap][img][ERR]", v));
          return idesc.set.call(this, v);
        },
        get: function(){ return idesc.get.call(this); }
      });
    }
  }catch(_){}

  // global error
  window.addEventListener("error", function(e){
    log("[tap][window.error]", e && e.message, e && e.filename, e && e.lineno+":"+e.colno);
  });
  window.addEventListener("unhandledrejection", function(e){
    log("[tap][unhandledrejection]", e && e.reason);
  });
})();
