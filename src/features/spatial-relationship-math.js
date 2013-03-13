/*******************************************************************************
Spatial Relation Analysis
29. Jun 2011, Erik Weitnauer

Javascript implementation of the algorithmus from Isabelle Bloch in her paper
"Fuzzy Relative Position Between Objects in Image Processing: A Morphological
Approach", IEEE Transactions on Pattern Analysis and Machine Intelligence,
pp. 657-664, July, 1999.

Copyright 2011 Erik Weitnauer (eweitnauer@gmail.com)
You may use this code for any purpose, just include this copyright notice. The
code is distributed without any warranty.
*******************************************************************************/

function beta_right(dx,dy) {
  // arccos([dx, dy] * [1, 0] / length([dx,dy]))
  if (dx == 0 && dy == 0) return 0;
  else return Math.acos(dx/Math.sqrt(dx*dx+dy*dy)); // right of
}

function beta_left(dx,dy) {
  // arccos([dx, dy] * [-1, 0] / length([dx,dy]))
  if (dx == 0 && dy == 0) return 0;
  else return Math.acos(-dx/Math.sqrt(dx*dx+dy*dy)); // left of
}

function beta_above(dx,dy) {
  // arccos([dx, dy] * [0, -1] / length([dx,dy]))
  if (dx == 0 && dy == 0) return 0;
  else return Math.acos(-dy/Math.sqrt(dx*dx+dy*dy)); // above
}

function beta_below(dx,dy) {
  // arccos([dx, dy] * [0, 1] / length([dx,dy]))
  if (dx == 0 && dy == 0) return 0;
  else return Math.acos(dy/Math.sqrt(dx*dx+dy*dy)); // below
}

function dir_membership(val) {
  return Math.max(0, 1-2*val/Math.PI);
}

function dist_euklid(dx, dy) {
  return Math.sqrt(dx*dx + dy*dy);
}

/// use a sigmoid function which is 0.5 at a distance of 3 pixels
function near_membership(val) {
  return 1-1/(1+Math.exp(0.2*(20-val)));
}

/// use a sigmoid function which is 0.5 at a distance of 6 pixels
function far_membership(val) {
  if (val == 0) return 0;
  return 1/(1+Math.exp((60-val)));
}

/// identity function -- returns the passed value
function f_id(val) {
  return val;
}

rel_func = {'right': beta_right, 'left': beta_left,
            'above': beta_above, 'below': beta_below,
            'near': dist_euklid, 'far': dist_euklid};
mem_func = {'right': dir_membership, 'left': dir_membership,
            'above': dir_membership, 'below': dir_membership,
            'near': near_membership, 'far': far_membership};

function spatial_membership_fast(R, f_rel, f_mem) {
  var t_start = Date.now();
  var N = R.N, M = R.M;
  // we will store points with best direction in 'O' first
  var O = Matrix.construct(M, N, null);
  // initialize
  for (var i=0;i<M;i++) for (var j=0;j<N;j++) {
    // is this a point in the reference object?
    if (R[i][j] == 1) O[i][j] = [i,j,0];
  }
  var pass = function(i,j) {
    var current = O[i][j];
    var check = function(ref) {
      var rel = f_rel(j-ref[1], i-ref[0]);
      if (current == 0 || rel <= current[2]) {
        current = [ref[0], ref[1], rel];
      }
    }
    if (i>0) {
      if (j>0 && O[i-1][j-1]) check(O[i-1][j-1]);
      if (O[i-1][j]) check(O[i-1][j]);
      if (j<N-1 && O[i-1][j+1]) check(O[i-1][j+1]);
    }
    if (i<M-1) {
      if (j>0 && O[i+1][j-1]) check(O[i+1][j-1]);
      if (O[i+1][j]) check(O[i+1][j]);
      if (j<N-1 && O[i+1][j+1]) check(O[i+1][j+1]);
    }
    if (j>0 && O[i][j-1]) check(O[i][j-1]);
    if (j<N-1 && O[i][j+1]) check(O[i][j+1]);
    // take the best reference point
    O[i][j] = current;
  }

  // first pass: forward iteration over O
  for (var i=0;i<M;i++) for (var j=0;j<N;j++) pass(i,j);
  // second pass: backward iteration over O
  for (var i=M-1;i>=0;i--) for (var j=N-1;j>=0;j--) pass(i,j);

  // translate O reference points to memberships
  for (var i=0;i<M;i++) for (var j=0;j<N;j++) {
    if (R[i][j]==1) O[i][j] = -1;
    else if (O[i][j]) O[i][j] = f_mem(O[i][j][2])
    else O[i][j] = -1;
  }
  console.log('spatial_membership_fast: ' + (Date.now()-t_start) + ' ms.');
  return O;
}

/// Same as naive implementation, but much faster O(width * height). Not exact.
function spatial_membership_faster(R, f_rel, f_mem, all) {
  var t_start = Date.now();
  var N = R.N, N1 = R.N-1, M = R.M, M1 = R.M-1;
  // we will store points with best direction in 'O' first
  var O = Matrix.construct(M, N, 0);
  // initialize
  for (var i=0;i<M;i++) for (var j=0;j<N;j++) {
    // is this a point in the reference object?
    O[i][j] = (R[i][j] == 1) ? [i,j,0] : [-1,-1,Infinity];
  }
  var pass = function(i,j,forward) {
    var current = O[i][j];
    var changed = false;
    var check = function(ref) {
      if (ref[0] == -1) return;
      var rel = f_rel(j-ref[1], i-ref[0]);
      if (rel <= current[2]) {
        current[0] = ref[0]; current[1] = ref[1]; current[2] = rel;
        changed = true;
      }
    }
    if (all) {
      if (j>0 && i>0) check(O[i-1][j-1]);
      if (i>0) check(O[i-1][j]);
      if (j<N1 && i>0) check(O[i-1][j+1]);
      if (j>0 && i<M1) check(O[i+1][j-1]);
      if (i<M1) check(O[i+1][j]);
      if (j<N1 && i<M1) check(O[i+1][j+1]);
      if (j>0) check(O[i][j-1]);
      if (j<N1) check(O[i][j+1]);
      // take the best reference point
      O[i][j] = current;
    } else {
      // use 4-neighborhood in the right direction
      if (forward) {
        if (i>0) check(O[i-1][j]);
        if (j>0) check(O[i][j-1]);
        if (changed) O[i][j] = current; // take the best reference point
      } else {
        if (i<M1) check(O[i+1][j]);
        if (j<N1) check(O[i][j+1]);
        if (changed) O[i][j] = current; // take the best reference point
      }
    }
  }

  // first pass: forward iteration over O
  var y0 = R.bounding_box ? Math.max(0, R.bounding_box.y0-1) : 0;
  var x0 = R.bounding_box ? Math.max(0, R.bounding_box.x0-1) : 0;
  for (var i=y0;i<M;i++) for (var j=x0;j<N;j++) pass(i,j,true);
  // second pass: backward iteration over O
  for (var i=M1;i>=0;i--) for (var j=N1;j>=0;j--) pass(i,j, false);
  // third pass: forward iteration
  for (var i=0;i<M;i++) for (var j=0;j<N;j++) pass(i,j,true);

  // translate O reference points to memberships
  for (var i=0;i<M;i++) for (var j=0;j<N;j++) {
    if (R[i][j]==1) O[i][j] = -1;
    else if (O[i][j][2] != Infinity) O[i][j] = f_mem(O[i][j][2])
    else O[i][j] = -1;
  }
  console.log('spatial_membership_faster: ' + (Date.now()-t_start) + ' ms.');
  return O;
}

/// TODO: Use rotation & translation of A relative to R!

/// Calculates the membership of the object in the matrix A when placed at
/// 'x', 'y' and rotated by `rot` in the membership landscape defined by the matrix R.
/// Points in 'set' that are -1 are ignored. E.g., all points of the reference
/// object can be marked as -1.
/// Returns three measures [necessity, average, possibility].
calcObjectMembership = function(R, A, x, y, rot) {
  var t_start = Date.now();
  var nec = null;
  var avg = 0;
  var num = 0;
  var pos = null;
  // iterate over img one time
  for (var i=0;i<A.M;i++) for (var j=0;j<A.N;j++) {
    if (!A[i][j]) continue; // skip points not in Object
    var ri = Math.round(i+y), rj = Math.round(j+x);
    if (rj>=R.N || rj<0) continue; // skip points outside 'R'
    if (ri>=R.M || ri<0) continue; // skip points outside 'R'
    var val = R[ri][rj];
    if (val == -1) continue; // skip points that overlap with reference Object
    if (nec === null) nec = val;
    else nec = Math.min(nec, val);
    avg += val;
    num++;
    if (pos === null) pos = val;
    else pos = Math.max(pos, val);
  }
  avg /= num;

  console.log('calcObjectMembership: ' + (Date.now()-t_start) + ' ms.');
  return [nec, avg, pos];
}
