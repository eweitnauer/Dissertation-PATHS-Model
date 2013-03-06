Simulator = function(world, canvas) {
  this.canvas = canvas;
  this.world = world;
  this.curr_time = 0;
	this.draw_interval = 1000/10; // frequency of drawing the scene and updating the mouse interaction in ms
	this.step_interval = 1000/10; // frequency of stepping the scene when playing in ms
	this.draw_position = true; // displays the current position in world coordinates at the upper left
  this.step_size = 1/60; // step size of one simulation step in seconds
  this.onWorldChange = null; // callback, called after each simulation timestep
  this.onBodySelectionChange = null; // callback with new selected object as parameter
  this.onSceneSelectionChange = null; // callback with new selected scene as parameter
  this.playing = false;
  this.drawing = true;
  this.selectedBody = null;  // the currently selected body in any scene
  this.selectedFrame = null; // the frame body of the currently selected scene
  this.selectedBodyChanged = false;
  this.selectedSceneChanged = false;
  this.init();
}

Simulator.prototype.release = function() {
  clearInterval(this.step_timer);
  clearInterval(this.draw_timer);
  this.onWorldChange = null;
  this.onBodySelectionChange = null;
  this.onSceneSelectionChange = null;
}

Simulator.prototype.init = function() {
  // save initial world state
  this.world.PushState();
  this.curr_time = 0;
  // setup debug draw
  this.dbgDraw = new b2DebugDraw();
  this.dbgDraw.m_drawScale = 200;
  this.dbgDraw.m_xformScale = 0.1;
  this.dbgDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);// | b2DebugDraw.e_centerOfMassBit);
  this.world.SetDebugDraw(this.dbgDraw);
  // setup mouse interaction
  this.mouseDown = false;
  this.mousePoint = null;
  this.selectedBody = null;
  var self = this;
  this.canvas.addEventListener("mousemove", function() { self.handleMouseMove.apply(self, arguments)}, true);
	this.canvas.addEventListener("mousedown", function() { self.mouseDown = true; }, true);
	this.canvas.addEventListener("mouseup", function() { self.handleMouseUp.apply(self, arguments)}, true);
	// setup timers
	this.step_timer = setInterval(function() {
	  if (!self.playing) return;
	  self.step.apply(self);
	}, this.step_interval);
	this.draw_timer = setInterval(function() {
	  if (!self.drawing) return;
	  self.updateMouseInteraction.apply(self);
	  self.draw.apply(self);
	}, this.draw_interval);
};

Simulator.prototype.reset = function() {
  this.world.PopState();
  this.world.PushState();
  this.curr_time = 0;
  if (this.onWorldChange) this.onWorldChange();
}

Simulator.prototype.setDrawScale = function(scale) {
  this.dbgDraw.m_drawScale = scale;
}

Simulator.prototype.handleMouseUp = function(evt) {
  this.mouseDown = false;
  if (this.mouseJoint) {
    this.world.DestroyJoint(this.mouseJoint);
	  this.mouseJoint = null;
	}
  if (this.onBodySelectionChange && this.selectedBodyChanged) {
	  this.onBodySelectionChange(this.selectedBody ? this.selectedBody.master_obj : null);
	  this.selectedBodyChanged = false;
  }
  if (this.onSceneSelectionChange && this.selectedSceneChanged) {
	  this.onSceneSelectionChange(this.selectedFrame ? this.selectedFrame.master_scene : null);
	  this.selectedSceneChanged = false;
  }
}

Simulator.prototype.handleMouseMove = function(evt) {
  var o = this.canvas;
  var x = o.offsetLeft - document.documentElement.scrollLeft,
    	y = o.offsetTop - document.documentElement.scrollTop;

  while (o = o.offsetParent) {
    x += o.offsetLeft - o.scrollLeft;
    y += o.offsetTop - o.scrollTop;
  }
	var p = new b2Vec2(evt.clientX - x, evt.clientY - y);
  this.mousePoint = this.dbgDraw.ToWorldPoint(p);
}

function getBodyAabb(body) {
  var aabb = b2AABB.Combine(body.m_fixtureList.m_aabb, body.m_fixtureList.m_aabb);
  for (var f = body.m_fixtureList.m_next; f; f = f.m_next) aabb.Combine(aabb, f.m_aabb);
  return aabb;
}

/** Checks which object and scene is at the passed position and updates the 'selectedBody' and
    'selectedFrame' attibutes accordingly. Also updates the 'selected' attributes of object and
    scene frame, so they can be highlighted in the debug draw.
    Returns the selected body. */
Simulator.prototype.selectBodyAt = function(p) {
  var aabb = new b2AABB();
	aabb.lowerBound.Set(p.x - 0.001, p.y - 0.001);
	aabb.upperBound.Set(p.x + 0.001, p.y + 0.001);

	var body = null, frame = null;
  // first search for body
	var callback = function(fixture) {
	  var b = fixture.GetBody();
  	if (b.GetType() != b2Body.b2_staticBody && fixture.GetShape().TestPoint(b.GetTransform(), p))
  	  { body = b; return false;}
    else return true;
  }
  this.world.QueryAABB(callback, aabb);
  // find frame
  for (var b=this.world.m_bodyList; b; b=b.m_next) {
    if (!('master_scene' in b)) continue;
    // we have a scene frame, check whether is position is right!
    if (aabb.TestOverlap(getBodyAabb(b))) { // found our scene!
      frame = b; break;
    }
  }

  if (this.selectedBody != body) this.selectedBodyChanged = true;
  if (this.selectedFrame != frame) this.selectedSceneChanged = true;
  // deselect old body and select the new one
  this.selectedBody && this.selectedBody.SetSelected(false);
  (this.selectedBody = body) && this.selectedBody.SetSelected(true);
  // deselect old scene frame and select new one
  this.selectedFrame && this.selectedFrame.SetSelected(false);
  (this.selectedFrame = frame) && this.selectedFrame.SetSelected(true);
  return body;
}

Simulator.prototype.updateMouseInteraction = function() {
  if (!this.mouseDown || !this.mousePoint) return;
  if (this.mouseJoint) {
    this.mouseJoint.SetTarget(this.mousePoint);
  } else {
    var body = this.selectBodyAt(this.mousePoint);
    if (!body) return;
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

Simulator.prototype.step = function() {
  if(!this.world) return;
  this.world.ClearForces();
  this.world.Step(this.step_size, 10, 10);
  this.curr_time += this.step_size;
  if (this.onWorldChange) this.onWorldChange();
}

Simulator.prototype.draw = function() {
  if (!this.world) return;
  var c = this.canvas.getContext("2d");
  this.dbgDraw.SetSprite(c);
  this.world.DrawDebugData();

  if (this.draw_position && this.mousePoint) {
   	c.fillStyle = "black";
	  c.fillText(this.mousePoint.x + ", " + this.mousePoint.y, 5, 10);
	}
}
