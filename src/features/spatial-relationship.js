//#import geom.js/Matrix.js

/// Get the degree of membership (0...1) to one of the relations 'left', 'right',
/// 'above', 'below', 'near' or 'far'. Both R (reference) and A (target)
/// must be shapes with a function 'renderOnCanvas' and with a position (x, y).
var getMembership = function(R, A, rel, res) {
  var sp_scale = res/2/100; // scene (100) has to fit in twice horizontally and vertically
  if (!A.body_matrix) A.body_matrix = calcBodyMatrix(A, res);
  if (!R.spatial_maps) R.spatial_maps = {};
  if (!R.spatial_maps[rel]) R.spatial_maps[rel] = calcSpatialMembershipMap(R, rel, res);
  return calcObjectMembership(R.spatial_maps[rel]
                             ,A.body_matrix
                             ,sp_scale*(A.x - R.x)
                             ,sp_scale*(A.y - R.y)
                             ,A.rot-R.rot);
}

/// Draws the passed shape onto a canvas of size (res/2 x res/2) and returns a matrix
/// that will be 1 at it center and at all positions where the shape is drawn on the canvas.
var calcBodyMatrix = function(shape, res) {
  console.log(res);
  var sp_scale = res/2/100; // scene (100) has to fit in twice horizontally and vertically
  var w=res, h=res;
  var bb = shape.bounding_box();
  if (Math.ceil(bb.width * sp_scale) % 2 != res%2) w = res-1;
  if (Math.ceil(bb.height * sp_scale) % 2 != res%2) h = res-1;

  /// create offscreen canvas if not created yet
  var can = d3.select('canvas#spatial')[0][0] || createCanvas('spatial', w, h);
  var ctx = can.getContext("2d");
  ctx.fillStyle = "black";
  ctx.clearRect(0,0,can.width,can.height);

  /// now draw the object onto the canvas
  ctx.save();


  ctx.translate(w/2, h/2);
  ctx.scale(sp_scale, sp_scale);
  ctx.translate(-shape.x || 0, -shape.y || 0); // center it
  shape.renderOnCanvas(ctx, false, true);
  ctx.restore();

  // make sure we have at least a single pixel
  var B = canvas_to_matrix(can);
  B[Math.floor(h/2)][Math.floor(w/2)] = 1;

  return B;
}

/// Creates and returns a matrix such that each canvas pixel with alpha==0
/// is translated into zero, all others to one.
/// The matrix gets a 'bounding_box' attribute {x0,x1,y0,y1} that surrounds
/// all non-zero entries in the matrix.
var canvas_to_matrix = function(can) {
  var width = can.width, height = can.height;
  var img = can.getContext("2d").getImageData(0, 0, width, height).data;
  var M = Matrix.construct(height, width, 0);
  var xmin = width, xmax = 0, ymin = height, ymax = 0;
  for (var j=0; j<height; j++) for (var i=0; i<width; i++) {
    if (img[4*(j*width+i)+3] > 0) {
      M[j][i] = 1;
      xmin = Math.min(xmin, i);
      xmax = Math.max(xmax, i);
      ymin = Math.min(ymin, j);
      ymax = Math.max(ymax, j);
    }
  }
  M.bounding_box = {x0:xmin, y0:ymin, x1:xmax, y1: ymax};
  return M;
}

/// rel must be one of 'left', 'right', 'above', 'below', 'near', 'far'.
/// R must have a function 'renderOnCanvas'
var calcSpatialMembershipMap = function(R, rel, res) {
  if (!R.body_matrix) R.body_matrix = calcBodyMatrix(R, res);
  return spatial_membership_fast(R.body_matrix, rel_func[rel], mem_func[rel]);
}

var createCanvas = function(id, w, h) {
  return d3.select("body")
           .append('canvas')
           .attr('id', id)
           .attr('width', w)
           .attr('height', h)
           .style('width', '300px')
           .style('height', '300px')[0][0];
}

/// Draws the matrix `A` onto a canvas with side length `size` using w and h
/// as the number of cells in x and y direction. If w and h are not set, A.N and
/// A.M are used.
draw_matrix = function(A, size) {
  size = size || 300;
  w = A.N; h = A.M;
  var cell = size / Math.max(w, h);
  var can = d3.select('canvas#debug')[0][0] || createCanvas('debug', size, size);
  var ctx = can.getContext("2d");
  ctx.fillStyle = 'black';
  ctx.fillRect(0,0,size,size);
  var dx = Math.floor((w-A.N)/2), dy = Math.floor((h-A.M)/2);
  for (var i=0; i<A.M; i++) for (var j=0; j<A.N; j++) {
     var val = Math.floor(A[i][j]*255);
     ctx.fillStyle = A[i][j] == -1 ? 'red' : 'rgb(' + val + ',' + val + ',' + val + ')';
     ctx.fillRect((j+dx)*cell, (i+dy)*cell, cell+1, cell+1);
  }
}

draw_R = function(R, size) {

}

/// Render matrix on canvas. Use for debugging.
matrix_to_canvas = function(A) {
  var w = A.N; var h = A.M;
  var can = d3.select('canvas#spatial')[0][0] || createCanvas('spatial', res);
  var ctx = can.getContext("2d");
  var image = ctx.getImageData(0,0,w,h);
  var imgData = image.data;
  for (var i=0;i<h;i++) for (var j=0;j<w;j++) {
    var idx = 4*(i*w+j);
    if (A[i][j] == -1) {
      imgData[idx] = 255;
      imgData[idx+1] = 0;
      imgData[idx+2] = 0;
    } else {
      var val = Math.floor(A[i][j]*255);
      imgData[idx] = val;
      imgData[idx+1] = val;
      imgData[idx+2] = val;
    }
    imgData[idx+3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}
