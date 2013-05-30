/// Written by Erik Weitnauer, 2013.
/** A wrapper around the b2World class */

Box2D.Common.b2Settings.b2_linearSleepTolerance = 0.1 //0.01;
Box2D.Common.b2Settings.b2_angularSleepTolerance = 20.0 / 180.0 * Math.PI //2.0 / 180.0 * b2Settings.b2_pi;

var PhysicsScene = function(world, dt) {
	this.world = world;
	this.world.curr_time = this.world.curr_time || 0;
	this.world.PushState(); // save initial state for reset
	this.dt = dt || 1/50;
	this.onWorldChange = new ListenerPattern(); // Emits world.curr_time each time the world changed.
	this.emit_changes = true; // set to false to stop updating the world change listeners
}

PhysicsScene.prototype.pushState = function() {
	this.world.PushState();
}

PhysicsScene.prototype.popState = function() {
	this.world.PopState();
	if (this.emit_changes) this.onWorldChange.emit(this.world.curr_time);
}

PhysicsScene.prototype.reset = function() {
	this.popState();
	this.pushState();
}

PhysicsScene.prototype.getTime = function() {
	return this.world.curr_time;
}

PhysicsScene.prototype.seek = function(t) {
	if (this.world.curr_time > t) this.reset();
	this.simulate(t - this.world.curr_time);
}

/// dt is optional, returns dt.
PhysicsScene.prototype.step = function(dt) {
	dt = dt || this.dt;
	this.world.ClearForces(); // in case we set any forces like with mouse joints
	this.world.Step(dt, 10, 10);
  this.world.curr_time += dt;
  if (this.emit_changes) this.onWorldChange.emit(this.world.curr_time);
  return dt;
}

/// Makes as many steps of this.dt as needed to reach time.
PhysicsScene.prototype.simulate = function(time) {
  var t = 0;
  while (t+this.dt<time) t += this.step();
  var rest = time-t;
  if (rest > 0.001) this.step(rest);
}

/// Simulates until all bodies sleep or max_time (default: Inifinity) is reached. Returns time.
PhysicsScene.prototype.simulateUntilSleep = function(max_time) {
	var max_time = max_time || Infinity;
	var t = 0;
	while (t<=max_time && this.countAwake() > 0) t += this.step();
	return t;
}

/// Simulates the world for the passed time, calls the callback and restores
/// the previous world state.
PhysicsScene.prototype.analyzeFuture = function(time, callback) {
	if (time == 0) callback();
	else if (time < 0) throw "You are mistaking the past for the future."
	else {
		var old_emit_changes = this.emit_changes;
		this.emit_changes = false;
		this.pushState();
		this.simulate(time);
		callback();
		this.popState();
		this.emit_changes = old_emit_changes;
	}
};

PhysicsScene.prototype.forEachBody = function(f) {
  for (var b = this.world.m_bodyList; b; b = b.m_next) {
  	if (b.master_obj) f(b);
  }
}

PhysicsScene.prototype.forEachDynamicBody = function(f) {
  for (var b = this.world.m_bodyList; b; b = b.m_next) {
  	if (b.GetType() == b2Body.b2_dynamicBody) f(b);
 	}
}

/// Returns the total kinetic energy of all bodies.
PhysicsScene.prototype.getKineticEnergy = function() {
	var energy = 0;
	this.world.forEachDynamicBody(function(b) {
		energy += 0.5 * (b.m_I*b.m_angularVelocity*b.m_angularVelocity
		                +b.m_mass*b.m_linearVelocity.Length()*b.m_linearVelocity.Length());
	});
	return energy;
}

/// Returns the number of dynamic objects that are awake.
PhysicsScene.prototype.countAwake = function() {
	var count = 0;
	this.forEachDynamicBody(function(b) { if (b.IsAwake()) count++ });
	return count;
}

var ListenerPattern = function() {
	this.listeners = [];
}
ListenerPattern.prototype.addListener = function(l) { this.listeners.push(l) }
ListenerPattern.prototype.removeListener = function(l) {
	var i=this.listeners.indexOf(l);
	if (i>=0) Array.remove(this.listeners, l);
}
ListenerPattern.prototype.removeAll = function() { this.listeners = [] }
ListenerPattern.prototype.emit = function() {
	for (var i = 0; i < this.listeners.length; i++) {
		this.listeners[i].apply(this.listeners[i], arguments);
	}
}