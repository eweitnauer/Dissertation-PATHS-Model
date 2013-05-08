var
  b2BodyDef = Box2D.Dynamics.b2BodyDef
 ,b2Body = Box2D.Dynamics.b2Body
 ,b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
 ,b2Vec2 = Box2D.Common.Math.b2Vec2
 ,b2FixtureDef = Box2D.Dynamics.b2FixtureDef;

Box2DAdapter = function() {
  var self = this;
  this.rel_curve_error_margin = 0.08;  // unit: fraction of object diameter
  this.linear_damping = 0.35;   // Set for each body. Box2D uses the formula
  this.angular_damping = 0.35;  // angularVelocity *= b2Math.Clamp(1.0 - dt * angularDamping, 0.0, 1.0)
                                // A value of 0.35 will therefore lead to halving of the speed every
                                // two seconds in case of an update rate of 60 Hz.
  this.cd_settings = {
    max_vertices: 32
  , preprocess: true
  , pre_order_vertices: true
  , pre_merge_vertices_min_dist: 0.01 // in units
  , pre_remove_vertices_max_error: 0 // in units
  , postprocess: false
  , post_move_vertices_inside_dist: 0.02
  , debug_text: false
  };
}

/** Iterates through the passed scene's shapes and creates b2Bodys from them. Polygon shapes
    must be centered at the origin and have x, y properties to denote their position. Each
    shape must have the movable property set to true, if it is dynamic object. The
    b2Bodys are added to the passed b2World and also written to the 'phys_obj' attribute of
    their respective shape. To the b2Bodys, an attribute 'master_obj' is set to the shape for
    which it the b2Body was created. The scale that was used to create the objects is written
    to them as phys_scale attribute. A method synch_to_phys to synch the x, y and rot attribute
    with their b2Body is added.
    Parameters:
      world                  b2World
      scene                  an SVGScene object with an Array of Polygons and Circles */
Box2DAdapter.prototype.loadScene = function(world, scene) {
  // get friction, restitution and scale from the properties read from the SVG
  var friction = scene.friction;
  var restitution = scene.restitution;
  var scale = 1/scene.pixels_per_unit;

  var self = this;
  var first = true;
  // // add the frame
  // var frame = new Polygon([[0,0],[100*scale, 0],[100*scale, 100*scale],[0, 100*scale]]);
  // frame.closed = true;
  // self.createBody(world, frame, false, 0, 0, 0, 1, friction, restitution);

  // now add all other shapes
  scene.shapes.forEach(function(shape) {
    var stroke_width = 1;
    var reg_float = /^[0-9]*\.?[0-9]+/;
    if (reg_float.test(shape.style['stroke-width'])) {
      stroke_width = Number(reg_float.exec(shape.style['stroke-width'])[0]);
    }
    var target_width = Box2D.Common.b2Settings.b2_linearSlop;
    var _shape = shape.copy();
    // We now scale the shape according to the scenes' pixel per unit scale factor
    // It is important that objects that are stacked onto each other are also stacked exacty only each
    // other in the physics simulation. Box2D has a threshold b2_linearSlop used for collision and
    // constraint resolution. The border width of the shapes should be equal to this value. We will grow /
    // shrink the movable shapes and their borders so this is fulfilled.
    var bb = shape.bounding_box();
    var scale_x = (bb.width + stroke_width) / (bb.width + target_width);
    var scale_y = (bb.height + stroke_width) / (bb.height + target_width);
    if (_shape instanceof Polygon) {
      _shape.pts.forEach(function(p) { p.Scale(scale) });
      if (shape.movable) {
        console.log('scale', scale_x, scale_y);
        _shape.pts.forEach(function(p) { p.x *= scale_x; p.y *= scale_y });
      } else if (shape.id == "_") {
         // if its the ground, move it up a bit
         _shape.pts.forEach(function(p) { p.y += (target_width-stroke_width)*scale/4 });
      }
    } else if (_shape instanceof Circle) {
      // since the b2Circle_shape as no additional collision radius as the polygon,
      // we will grow the circle to make it the same size as its SVG source,
      // which means we need to include half of its stroke-width
      _shape.r = (_shape.r+stroke_width/2) * scale;
    } else throw("Unknown object type.");
    shape.phys_scale = scale;
    /// Method that sets x, y and rot attributes of the scene object according to
    /// the state of its b2Body.
    shape.synch_to_phys = function() {
      this.x = this.phys_obj.GetPosition().x / this.phys_scale;
      this.y = this.phys_obj.GetPosition().y / this.phys_scale;
      this.rot = this.phys_obj.GetAngle();
    }
    shape.phys_obj = self.createBody(world, _shape, shape.movable, shape.x*scale, shape.y*scale,
                                     0.0, 1.0, friction, restitution);
    shape.phys_obj.master_obj = shape;
    shape.rot = 0;
  });
}

/// Creates a Box2D body according to the passed geometric and dynamic
/// information. The body is added to the world and returned.
/** Params:
  *   world: b2World
  *   shape: Polygon
  *   is_dynamic: bool
  *   x, y, angle, density, friction, restitution: number
  */
Box2DAdapter.prototype.createBody = function(world, shape, is_dynamic, x, y,
    angle, density, friction, restitution)
{
  // create the body
  var bodyDef = new b2BodyDef();
  if (is_dynamic) bodyDef.type = b2Body.b2_dynamicBody;
  bodyDef.position.Set(x,y);
  bodyDef.angle = angle;
  bodyDef.angularDamping = this.angular_damping;
  bodyDef.linearDamping = this.linear_damping;
  var body = world.CreateBody(bodyDef);

  // shape information
  var fixture_proto = {density: density, friction: friction, restitution: restitution};
  this.add_fixture(shape, body, fixture_proto, is_dynamic);

  return body;
}

/// Creates Box2D shapes from the passed polygon shape and adds it to the body.
/** If the body is dynamic, the polygon is decomposed into convex parts with no
  * more than 'max_polygon_vertices' vertices. For each of these parts a
  * b2PolygonShape is put into a fixture based on the passed fixture prototype.
  * The fixtures are then assigned to the body.
  *
  * If the body is not dynamic, either a single b2LoopShape (in case the polygon
  * is closed) or several b2EdgeShapes (one for every edge in case the polygon
  * is not closed) are used to create the fixtures. This is not possible in the
  * dynamic case, since b2LoopShapes and b2EdgeShapes are not allowed to be
  * dynamic in Box2D.
  * Params:
  *   shape: Polygon or Circle
  *   body: b2Body (to which the shape is added as fixture)
  *   fixture_proto: object (all properties are copied into the new fixture)
  *   is_dynamic: bool
  */
Box2DAdapter.prototype.add_fixture = function(shape, body, fixture_proto, is_dynamic) {
  if (shape instanceof Circle) {
    // shape is a circle
    var b2shape = new b2CircleShape(shape.r);
    var to_add = new b2FixtureDef();
    obj_extend(to_add, fixture_proto);
    to_add.shape = b2shape;
    body.CreateFixture(to_add);
  } else if (shape instanceof Polygon) {
    var poly = shape;
    // it is a polygon, we need to create different Box2D shape types for
    // dynamic and static case
    if (is_dynamic) {
      // do convex decomposition and add a b2PolygonShape for each piece
      var convex_polys = poly.convex_decomposition(this.cd_settings);
      convex_polys.forEach(function(p) {
        var b2shape = b2PolygonShape.AsVector(p.pts);
        var to_add = new b2FixtureDef();
        obj_extend(to_add, fixture_proto);
        to_add.shape = b2shape;
        body.CreateFixture(to_add);
      });
    } else {
      // simplify the poly a bit
      //poly.merge_vertices({min_dist: this.cd_settings.pre_merge_vertices_min_dist})
      // there are no working versions of b2EdgeShape or b2LoopShape in Box2D.js
      // so we use Polygons with 2 points instead
      // body is going to be static
      var N = poly.pts.length;
      if (N<2) return;
      for(var i=0; i<N; ++i) {
        if (i==N-1 && !poly.closed) break;
        var j = (i==N-1) ? 0 : i+1;
        var b2shape = b2PolygonShape.AsVector([new b2Vec2(poly.pts[i].x, poly.pts[i].y),
                                             new b2Vec2(poly.pts[j].x, poly.pts[j].y)]);
        var to_add = new b2FixtureDef();
        obj_extend(to_add, fixture_proto);
        to_add.shape = b2shape;
        body.CreateFixture(to_add);
      }
    }
  } else throw("Unkown shape type!");
}

obj_extend = function(target, src) {
  for (x in src) {
    if (src.hasOwnProperty(x)) target[x] = src[x];
  }
}

obj_extended = function(src1, src2) {
  var target = {};
  for (x in src1) {
    if (src1.hasOwnProperty(x)) target[x] = src1[x];
  }
  for (x in src2) {
    if (src2.hasOwnProperty(x)) target[x] = src2[x];
  }
  return target;
}
