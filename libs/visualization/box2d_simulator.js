Simulator = function(world, canvas, scaling) {
  this.canvas = canvas;
  this.world = world;
  this.curr_time = 0;
	this.draw_interval = 1000/30; // frequency of drawing the scene and updating the mouse interaction in ms
	this.step_interval = 1000/30; // frequency of stepping the scene when playing in ms
	this.interaction_interval = 1000/30; // frequency of updating the mouse interaction in ms
  this.draw_position = true; // displays the current position in world coordinates at the upper left
  this.draw_scale = scaling || 1;
  this.step_size = 1/60; // step size of one simulation step in seconds
  this.playing = false;
  this.drawing = true;
  this.init();
}

/// Reset all intervals.
Simulator.prototype.release = function() {
  clearInterval(this.step_timer);
  clearInterval(this.draw_timer);
  clearInterval(this.interaction_timer);
}

Simulator.prototype.init = function() {
  // save initial world state
  //this.world.PushState();

  this.curr_time = 0;
  // setup debug draw
  this.dbgDraw = new b2DebugDraw();
  this.dbgDraw.SetSprite(this.canvas.getContext("2d"));
  this.dbgDraw.SetDrawScale(this.draw_scale);
  this.dbgDraw.SetXFormScale(0.1);
  this.dbgDraw.SetFillAlpha(0.5);
  this.dbgDraw.SetLineThickness(1.0);
  this.dbgDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);// | b2DebugDraw.e_centerOfMassBit);
  this.world.SetDebugDraw(this.dbgDraw);
  // setup mouse interaction
  this.mouseDown = false;
  this.mousePoint = new b2Vec2(0,0);
  var self = this;
  this.canvas.addEventListener("mousemove", function() { self.handleMouseMove.apply(self, arguments)}, true);
	this.canvas.addEventListener("mousedown", function() { self.mouseDown = true; self.handleMouseMove.apply(self, arguments)}, true);
	this.canvas.addEventListener("mouseup", function() { self.handleMouseUp.apply(self, arguments)}, true);
  window.addEventListener("scroll", function() { self.canvas_position = self.getElementPosition(self.canvas) });
	// setup timers
	this.step_timer = setInterval(function() {
	  if (!self.playing) return;
	  self.step.apply(self);
	}, this.step_interval);
	this.interaction_timer = setInterval(function() {
    self.updateInteraction.apply(self);
  }, this.interaction_interval);
  this.draw_timer = setInterval(function() {
	  if (!self.drawing) return;
	  self.draw.apply(self);
	}, this.draw_interval);

  this.canvas_position = this.getElementPosition(this.canvas);
};

Simulator.prototype.getElementPosition = function(el) {
  var x = el.offsetLeft - document.documentElement.scrollLeft,
      y = el.offsetTop - document.documentElement.scrollTop;
  while (el = el.offsetParent) {
    x += el.offsetLeft - el.scrollLeft;
    y += el.offsetTop - el.scrollTop;
  }
  return {x: x, y: y};
}

Simulator.prototype.reset = function() {
  this.world.PopState();
  this.world.PushState();
  this.curr_time = 0;
}

Simulator.prototype.handleMouseUp = function(evt) {
  this.mouseDown = false;
  if (this.mouseJoint) {
    this.world.DestroyJoint(this.mouseJoint);
	  this.mouseJoint = null;
	}
}

Simulator.prototype.handleMouseMove = function(evt) {
  this.mousePoint.x = (evt.clientX - this.canvas_position.x) / this.draw_scale;
  this.mousePoint.y = (evt.clientY - this.canvas_position.y) / this.draw_scale;
}

/** Checks which object is at the passed position, a b2Vec2. Returns the selected body. */
Simulator.prototype.getBodyAtMouse = function() {
  var aabb = new b2AABB();
  var p = this.mousePoint;
	aabb.lowerBound.Set(p.x - 0.001, p.y - 0.001);
	aabb.upperBound.Set(p.x + 0.001, p.y + 0.001);

	var body = null;
  // first search for body
	var filter = function(fixture) {
	  var b = fixture.GetBody();
  	if (b.GetType() != b2Body.b2_staticBody && fixture.GetShape().TestPoint(b.GetTransform(), p)) {
      body = b;
      return false;
    }
    return true;
  }
  this.world.QueryAABB(filter, aabb);

  return body;
}

/// Updates mouse joint target and creates it if neccessary.
/// If mouse button is not down, it will destroy the joint.
Simulator.prototype.updateInteraction = function() {
  if (this.mouseDown && !this.mouseJoint) {
    var body = this.getBodyAtMouse();
    if (body) {
      var md = new b2MouseJointDef();
      md.bodyA = this.world.GetGroundBody();
      md.bodyB = body;
      md.target = this.mousePoint;
      md.collideConnected = true;
      md.maxForce = 300.0 * body.GetMass();
      this.mouseJoint = this.world.CreateJoint(md);
      body.SetAwake(true);
    }
  }
  if (this.mouseJoint) {
    if (this.mouseDown) {
      this.mouseJoint.SetTarget(this.mousePoint);
    } else {
      this.world.DestroyJoint(this.mouseJoint);
      this.mouseJoint = null;
    }
  }
}

Simulator.prototype.step = function() {
  if(!this.world) return;
  this.world.ClearForces();
  this.world.Step(this.step_size, 10, 10);
  this.curr_time += this.step_size;
  if (this.onWorldChange) this.onWorldChange();
}

Simulator.prototype.draw = function() {
  if (!this.world) return;
  this.world.DrawDebugData();

  if (this.draw_position && this.mousePoint) {
   	//c.fillStyle = "black";
	  //c.fillText(this.mousePoint.x + ", " + this.mousePoint.y, 5, 10);
	}
}
