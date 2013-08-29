// events in DOM2 have the properties cancelable and bubble
// they are created with createEvent and initialized with initEvent, then sent with dispatchEvent
// I won't use the DOM2 event engine for now, but might do so later when I need more powerful
// features than right now

/// Mixin-Pattern as described on
/// http://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/
/// Usage: asEventListner.call(MyClass.prototype);
var asEventListener = function() {
  // Adds the passed listener for events of passed type (a string). Won't add the same listner twice.
  this.addEventListener = function(type, listener) {
    var key = '__on' + type;
    if (!this[key]) this[key] = [];
    // don't register the same listener twice
    if (this[key].indexOf(listener) != -1) return;
    this[key].push(listener);
  }
  this.on = this.addEventListener;

  // Removes the passed listener from the passed event type (a string). Don't pass a
  // specific listener to remove all listeners of that type of event.
  this.removeEventListener = function(type, listener) {
    var key = '__on' + type;
    if (!this[key]) return;
    if (!listener) this[key].length = 0;
    else {
      var idx = this[key].indexOf(listener);
      if (idx !== -1) this[key].splice(idx, 1);
    }
  }
  this.off = this.removeEventListener;

  // Dispatches an event. The event is optional.
  this.dispatchEvent = function(type, event) {
    var key = '__on' + type;
    if (!this[key]) return;
    for (var i=0; i<this[key].length; i++) this[key][i](event);
  }

  return this;
};
