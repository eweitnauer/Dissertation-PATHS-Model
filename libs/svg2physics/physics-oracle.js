/// Written by Erik Weitnauer, 2013.
/**
PhyscisOracle:
This class provides all functionality of the "physics black box" to the PBP Interpreter. It has the following methods:

- observeCollisions(): gives back an array of collision events {a, b, dv, t} where a is the body moving faster towards the other (the active one)
- getTouchGroups(): gives back an array of arrays of dyn. bodies that directly or indirectly touch each other
- getTouchedBodies(body): gives back an array of bodies directly touched by the passed body, potentially including the ground.
*/
/// Pass a b2World.
var PhysicsOracle = function(physics_scene) {
	this.pscene = physics_scene;
  this.pscene.onWorldChange.addListener(this.synchShapes.bind(this));
	this.contact_listener = new PhysicsOracle.ContactListener(this);
  this.gotoState('start');
}

/// State can be one of
/// 'start' ... goes to 0.1 seconds after the initial state (things start moving, "resting" objects settle down).
/// 'end' ... goes to the state where all objects stopped moving (or max. 10 seconds after start)
PhysicsOracle.prototype.gotoState = function(state) {
  if (state == 'start') this.pscene.seek(0.1);
  else if (state == 'end') this.pscene.simulateUntilSleep();
  else throw 'unknown state "' + state + '"';
}

/// Calls synch_to_phys for every body's master shape object. This updates the x, y and rot attributes of
/// the shapes.
PhysicsOracle.prototype.synchShapes = function() {
  this.pscene.forEachBody(function(b) { b.master_obj.synch_to_phys() });
}

/// Returns all objects grouped by touch. E.g "A  BC" will be returned as [[A], [B,C]]. Only
/// regards dynamic bodies.
PhysicsOracle.prototype.getTouchGroups = function() {
	return this.pscene.world.getTouchGroups();
}

/// Gives back an array of bodies directly touched by the passed body, potentially including the
/// ground.
PhysicsOracle.prototype.getTouchedBodies = function(body) {
	return body.getTouchedBodies();
}

/// Gives back an array of collision events {a, b, dv, t} where a is the 'hitter' and b the
/// 'hit' body.
PhysicsOracle.prototype.observeCollisions = function() {
	this.pscene.pushState();
	var old_cl = this.pscene.world.m_contactManager.m_contactListener;
	this.pscene.world.SetContactListener(this.contact_listener);
	this.collisions = [];
	this.pscene.simulateUntilSleep(8);
	this.pscene.world.SetContactListener(old_cl);
	this.collisions = PhysicsOracle.mergeCollisions(this.collisions, 0);
	this.pscene.popState();
	return this.collisions;
}

/// Merges collision of any body pair that are temporally closer than `max_dt` default: 0.25 s.
/// It also removes any collision that happened before `min_t` default: 0.1 s (this is useful
/// since often objects that are supposed to lie on the ground are hitting the ground in the
/// first 0.1 seconds).
PhysicsOracle.mergeCollisions = function(collisions, min_t, max_dt) {
  var res = [];
  if (typeof(max_dt) == 'undefined') max_dt = 0.25;
  if (typeof(min_t)  == 'undefined') min_t  = 0.1;
  for (var i=0; i<collisions.length; i++) {
    var c = collisions[i];
    if (c.t < min_t) continue;
    var r = res[res.length-1];
    if (r && ((r.a == c.a && r.b == c.b) || (r.a == c.b && r.b == c.a))
          && (Math.abs(r.t - c.t) <= max_dt)) {
      r.dv = Math.max(r.dv, c.dv);
    } else {
      res.push(c);
    }
  }
  return res;
}

PhysicsOracle.ContactListener = function(parent) {
	var wm = new Box2D.Collision.b2WorldManifold();
	this.BeginContact = function (contact) {}
  this.EndContact = function (contact) {}
  /// for a new or changed contact, save the delta velocities in normal direction for all
  /// contact points
  this.PreSolve = function (contact, oldManifold) {
  	// don't do anything if we already know this contact and it had the same
  	// number of points in its manifold last time already
  	if (!contact.IsTouching()) {
    	contact.pointCount = 0;
    	contact.process = false;
    	return;
  	}
  	if (contact.pointCount && contact.pointCount == contact.m_manifold.m_pointCount) {
    	contact.process = false;
    	return;
 	 	}
  	contact.pointCount = contact.m_manifold.m_pointCount;
  	contact.process = true;
  	var bodya = contact.m_fixtureA.m_body, bodyb = contact.m_fixtureB.m_body;
  	contact.GetWorldManifold(wm);
  	var max_vel_a = 0, max_vel_b = 0;
  	var norm = wm.m_normal;

  	// If a rectangle lies on the ground, you pick up one corner, tilt it and let it fall
  	// back to the ground then you'll have two contact points, but only in one of them
  	// there will be a relative speed (on the side that was lifted). We are interested the
  	// highest objects speeds in all contact points.
  	// CAUTION: wm.m_points might contain more points than are actually set,
  	//          we can only use the first contact.m_manifold.m_pointCount points!
  	for (var i=0; i<contact.m_manifold.m_pointCount; i++) {
    	var vel_a = bodya.GetLinearVelocityFromWorldPoint(wm.m_points[i]);
    	var vel_b = bodyb.GetLinearVelocityFromWorldPoint(wm.m_points[i]);
    	vel_a = vel_a.x*norm.x + vel_a.y*norm.y;
    	vel_b = vel_b.x*norm.x + vel_b.y*norm.y;
    	if (Math.abs(vel_a) > Math.abs(max_vel_a)) max_vel_a = vel_a;
    	if (Math.abs(vel_b) > Math.abs(max_vel_b)) max_vel_b = vel_b;
  	}
  	contact.vel_a = max_vel_a;
  	contact.vel_b = max_vel_b;
	}
	/// if the delta speed is high enough,
	this.PostSolve = function (contact, impulse) {
    if (!contact.process) return;
	  var dv = Math.abs(contact.vel_a-contact.vel_b);
  	if (dv > 0.5) {
    	var bodya = contact.m_fixtureA.m_body, bodyb = contact.m_fixtureB.m_body;
    	if (Math.abs(contact.vel_a) > Math.abs(contact.vel_b)) {
      	//console.log(bodya.master_obj.id, 'hits', bodyb.master_obj.id, 'with', dv, 'at', world.curr_time);
      	parent.collisions.push({a: bodya, b: bodyb, dv:dv, t:world.curr_time});
    	} else {
      	//console.log(bodyb.master_obj.id, 'hits', bodya.master_obj.id, 'with', dv, 'at', world.curr_time);
      	parent.collisions.push({a:bodyb, b:bodya, dv:dv, t:world.curr_time});
    	}
    }
  }
}
