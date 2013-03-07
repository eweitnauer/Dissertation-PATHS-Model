var b2Vec2 = Box2D.Common.Math.b2Vec2
   ,b2AABB = Box2D.Collision.b2AABB
   ,b2BodyDef = Box2D.Dynamics.b2BodyDef
   ,b2Body = Box2D.Dynamics.b2Body
   ,b2FixtureDef = Box2D.Dynamics.b2FixtureDef
   ,b2Fixture = Box2D.Dynamics.b2Fixture
   ,b2World = Box2D.Dynamics.b2World
   ,b2MassData = Box2D.Collision.Shapes.b2MassData
   ,b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
   ,b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
   ,b2DebugDraw = Box2D.Dynamics.b2DebugDraw
   ,b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef;

Simulator = function(physics_scene, canvas, scaling) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.pscene = physics_scene;
  this.step_interval = 1000/30;        // frequency of stepping the scene when playing in ms
  this.interaction_interval = 1000/30; // frequency of updating the mouse interaction in ms
  this.draw_position = true;           // displays the current position in world coordinates at the upper left
  this.draw_scale = scaling || 1;
  this.playing = false;
  this.drawing = true;
  this.init();
  this.draw();
}

/// Reset all intervals.
Simulator.prototype.release = function() {
  if (this.step_timer) clearInterval(this.step_timer);
  if (this.interaction_timer) clearInterval(this.interaction_timer);
  this.pscene.onWorldChange.removeListener(this.draw);
}

Simulator.prototype.pause = function() {
  if (!this.playing) return;
  clearInterval(this.step_timer);
  this.step_time = null;
  this.playing = false;
}

Simulator.prototype.play = function() {
  if (this.playing) return;
  var self = this;
  this.step_timer = setInterval(function() { self.pscene.step() }, this.step_interval);
  this.playing = true;
}

Simulator.prototype.reset = function() {
  this.pscene.reset();
}

Simulator.prototype.init = function() {
  var self = this;

  // setup debug draw
  this.dbgDraw = new b2DebugDraw();
  this.dbgDraw.SetSprite(this.canvas.getContext("2d"));
  this.dbgDraw.SetDrawScale(this.draw_scale);
  this.dbgDraw.SetXFormScale(0.1);
  this.dbgDraw.SetFillAlpha(0.5);
  this.dbgDraw.SetLineThickness(1.0);
  this.dbgDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);// | b2DebugDraw.e_centerOfMassBit);
  this.pscene.world.SetDebugDraw(this.dbgDraw);
  this.pscene.onWorldChange.addListener(function() { self.draw.apply(self) });

  // setup mouse interaction
  this.mouseDown = false;
  this.mouseDownTime = 0;
  this.mousePoint = new b2Vec2(0,0);
  this.canvas.addEventListener("mousemove", function() {
    self.handleMouseMove.apply(self, arguments);
  }, true);
  this.canvas.addEventListener("mousedown", function() {
    self.mouseDown = true; self.mouseDownTime = Date.now();
  }, true);
  this.canvas.addEventListener("mouseup", function() {
    self.handleMouseUp.apply(self, arguments)
  }, true);

  // setup timers
  this.interaction_timer = setInterval(function() {
    self.updateInteraction.apply(self);
  }, this.interaction_interval);

  // get position of canvas on screen and update on scrolling to get the mouse position relative to the canvas.
  this.canvas_position = this.getElementPosition(this.canvas);
  window.addEventListener("scroll", function() { self.canvas_position = self.getElementPosition(self.canvas) });
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


Simulator.prototype.handleMouseUp = function(evt) {
  this.mouseDown = false;
  if (this.mouseDownTime > 0) {
    var dt = Date.now() - this.mouseDownTime;
    if (dt < 100) this.reset();
    this.mouseDownTime = 0;
  }
  if (this.mouseJoint) {
    this.pscene.world.DestroyJoint(this.mouseJoint);
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
  this.pscene.world.QueryAABB(filter, aabb);

  return body;
}

/// Updates mouse joint target and creates it if neccessary.
/// If mouse button is not down, it will destroy the joint.
Simulator.prototype.updateInteraction = function() {
  if (this.mouseDown && !this.mouseJoint) {
    var body = this.getBodyAtMouse();
    if (body) {
      var md = new b2MouseJointDef();
      md.bodyA = this.pscene.world.GetGroundBody();
      md.bodyB = body;
      md.target = this.mousePoint;
      md.collideConnected = true;
      md.maxForce = 300.0 * body.GetMass();
      this.mouseJoint = this.pscene.world.CreateJoint(md);
      body.SetAwake(true);
    }
  }
  if (this.mouseJoint) {
    if (this.mouseDown) {
      this.mouseJoint.SetTarget(this.mousePoint);
    } else {
      this.pscene.world.DestroyJoint(this.mouseJoint);
      this.mouseJoint = null;
    }
  }
}

Simulator.prototype.draw = function() {
  if (!this.drawing) return;
  this.pscene.world.DrawDebugData();

  if (this.draw_position && this.mousePoint) {
   	this.ctx.fillStyle = "black";
    this.ctx.fillText('x='+this.mousePoint.x.toFixed(2) + " y=" + this.mousePoint.y.toFixed(2)
                      + " t=" + this.pscene.getTime().toFixed(2) , 5, 10);
	}
}
