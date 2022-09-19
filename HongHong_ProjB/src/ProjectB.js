//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// BasicShapes.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//		--converted from 2D to 4D (x,y,z,w) vertices
//		--extend to other attributes: color, surface normal, etc.
//		--demonstrate how to keep & use MULTIPLE colored shapes in just one
//			Vertex Buffer Object(VBO). 
//		--create several canonical 3D shapes borrowed from 'GLUT' library:
//		--Demonstrate how to make a 'stepped spiral' tri-strip,  and use it
//			to build a cylinder, sphere, and torus.
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variables
var modelMatrix
var u_ModelMatrix
var g_canvas = document.getElementById('webgl');  // Retrieve HTML <canvas> element
var gl
var n
var currentAngle = 0.0
var ANGLE_STEP = 45.0;		// Rotation angle rate (degrees/second)
var ANGLE_STEP_FISH = 20.0;	
var ANGLE_STEP_TAIL = 30.0;
var ANGLE_STEP_TAILN = -50.0;
var ANGLE_STEP_GRASS = 45.0;
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
													// (x,y,z,w)position + (r,g,b)color
													// Later, see if you can add:
													// (x,y,z) surface normal + (tx,ty) texture addr.
// for animation
var headAngle = 0.0;
var tailAngle = 0.0;
var tailAngleN = 0.0;
var grassAngle = 0.0;

// for mouse-controlled interaction
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  

var qNew = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
var qTot = new Quaternion(0,0,0,1);	// 'current' orientation (made from qNew)
var quatMatrix = new Matrix4();	

// for world axes:
axes = [
	0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// X axis line (origin: gray)
	2.0,  0.0,  0.0, 1.0,		1.0,  0.3,  0.3,	// 						 (endpoint: red)
	
	0.0,  0.0,  0.0, 1.0,    0.3,  0.3,  0.3,	// Y axis line (origin: white)
	0.0,  2.0,  0.0, 1.0,		0.3,  1.0,  0.3,	//						 (endpoint: green)

	0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// Z axis line (origin:white)
	0.0,  0.0,  2.0, 1.0,		0.3,  0.3,  1.0,	//	
]
// for view point:
eyeX = 6
eyeY = 6.0
eyeZ = 3.0
lookX = -6
lookY = -8
lookZ = -5
slider = document.getElementById("myEyeXRange");//near
// eyeX = slider.value; // Display the default slider value

// // Update the current slider value (each time you drag the slider handle)
// slider.oninput = function() {
// 	eyeX = this.value;
//   }

// for key interaction
var angle1 = 0
var angle1rate = 45.0
var g_last = 0.0;
var press = -1;
var theta = 0.0;

function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // 
  n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
//	gl.depthFunc(gl.LESS);			 // WebGL default setting: (default)
	gl.enable(gl.DEPTH_TEST); 	 

	// for mouse-controlled interaction:
	canvas.onmousedown	=	function(ev){myMouseDown( ev, gl, canvas) }; 
	canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, canvas) };
	canvas.onmouseup = 		function(ev){myMouseUp( ev, gl, canvas)};

	// for key interaction:
	window.addEventListener("keydown", myKeyDown, false);
    window.addEventListener("keyup", myKeyUp, false);
	 
//==============================================================================
// STEP 4:   REMOVE This "reversed-depth correction"
//       when you apply any of the 3D camera-lens transforms: 
//      (e.g. Matrix4 member functions 'perspective(), frustum(), ortho() ...)
//======================REVERSED-DEPTH Correction===============================
/*
  //  b) reverse the usage of the depth-buffer's stored values, like this:
  gl.enable(gl.DEPTH_TEST); // enabled by default, but let's be SURE.
  gl.clearDepth(0.0);       // each time we 'clear' our depth buffer, set all
                            // pixel depths to 0.0  (1.0 is DEFAULT)
  gl.depthFunc(gl.GREATER); // draw a pixel only if its depth value is GREATER
                            // than the depth buffer's stored value.
                            // (gl.LESS is DEFAULT; reverse it!)
*/
//=====================================================================

  // Get handle to graphics system's storage location of u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  // Create a local version of our model matrix in JavaScript 
  modelMatrix = new Matrix4();
//   var viewMatrix = new Matrix4();
//   var projMatrix = new Matrix4();
//   var mvpMatrix = new Matrix4();

  // Create, init current rotation angle value in JavaScript
//   var currentAngle = 0.0;
//   projMatrix.setPerspective(42.0, 1.0, 1.0, 1000.0);
//   viewMatrix.setLookAt(5, 5, 3, -1, -2, -0.5, 0, 0, 1);

//-----------------  
  // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
	var now1 = Date.now();
	var now2 = Date.now();
	var now3 = Date.now();
	var now4 = Date.now();
    currentAngle = animate(currentAngle);  // Update the rotation angle
	headAngle = animateFish(headAngle, now1);  // Update the rotation angle
	tailAngle = animateFishTail(tailAngle, now2);  // Update the rotation angle
	tailAngleN = animateFishTailN(tailAngleN, now3);
	grassAngle = animateGrass(grassAngle, now4);
	/*
	function animateFish(angle, now){
    var elapsed = now - g_last1;
    g_last1 = now;
    
    // Update the current rotation angle (adjusted by the elapsed time)
    //  limit the angle to move smoothly between +20 and -85 degrees:
    if(angle >   20.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
    if(angle <  -45.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
    
    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle %= 360;
  }
	*/
    drawAll(gl, n, currentAngle, headAngle, tailAngle, tailAngleN, grassAngle, modelMatrix, u_ModelMatrix);   // Draw shapes
    // report current angle on console
    //console.log('currentAngle=',currentAngle);
    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
  };
  tick();							// start (and continue) animation: draw current image
  drawResize();
    
}

function initVertexBuffer(gl) {
//==============================================================================
// Create one giant vertex buffer object (VBO) that holds all vertices for all
// shapes.
 
 	// Make each 3D shape in its own array of vertices:
  makeCylinder();					// create, fill the cylVerts array
  makeSphere();						// create, fill the sphVerts array
  makeTorus();						// create, fill the torVerts array
  makeFish();						// create, fill the fishVerts array
  makeGrass();						// create, fill the grassVerts array
  makeGroundGrid();				// create, fill the gndVerts array
  
  // how many floats total needed to store all shapes?
	var mySiz = (cylVerts.length + sphVerts.length + 
							 torVerts.length + gndVerts.length+
							 fishHeadVerts.length+fishBody1Verts.length+
							 fishBody2Verts.length+fishBody3Verts.length+fishTailVerts.length+
							 fishHandVerts.length+axes.length+ grassVerts.length);						

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);
	// Copy all shapes into one big Float32 array:
  var colorShapes = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
	cylStart = 0;							// we stored the cylinder first.
  for(i=0,j=0; j< cylVerts.length; i++,j++) {
  	colorShapes[i] = cylVerts[j];
		}
		sphStart = i;						// next, we'll store the sphere;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
		}
		torStart = i;						// next, we'll store the torus;
	for(j=0; j< torVerts.length; i++, j++) {
		colorShapes[i] = torVerts[j];
		}
		gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		colorShapes[i] = gndVerts[j];
		}
		fishStart = i;						// next we'll store the fish;
	for(j=0; j<fishHeadVerts.length; i++,j++) {
		colorShapes[i] = fishHeadVerts[j];
	}
		fishBody1Start = i;
	for(j=0; j<fishBody1Verts.length; i++,j++) {
		colorShapes[i] = fishBody1Verts[j];
	}
		fishBody2Start = i;
	for(j=0; j<fishBody2Verts.length; i++,j++) {
		colorShapes[i] = fishBody2Verts[j];
	}
		fishBody3Start = i;
	for(j=0; j<fishBody3Verts.length; i++,j++) {
		colorShapes[i] = fishBody3Verts[j];
	}
		fishTailStart = i;
	for(j=0; j<fishTailVerts.length; i++,j++) {
		colorShapes[i] = fishTailVerts[j];
	}
		fishHandStart = i;
	for(j=0; j<fishHandVerts.length; i++,j++) {
		colorShapes[i] = fishHandVerts[j];
	}
		axesStart = i;							// we stored the cylinder first.
    for(j=0; j< axes.length; i++,j++) {
    	colorShapes[i] = axes[j];
    }
		grassStart = i;
	for(j=0; j< grassVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = grassVerts[j];
		}
  // Create a buffer object on the graphics hardware:
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

  // Use handle to specify how to retrieve **POSITION** data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * floatsPerVertex, // Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve **COLOR** data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  
  									// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}

// simple & quick-- 
// I didn't use any arguments such as color choices, # of verts,slices,bars, etc.
// YOU can improve these functions to accept useful arguments...
//
function makeDiamond() {
//==============================================================================
// Make a diamond-like shape from two adjacent tetrahedra, aligned with Z axis.

	// YOU write this one...
	
}

function makePyramid() {
//==============================================================================
// Make a 4-cornered pyramid from one OpenGL TRIANGLE_STRIP primitive.
// All vertex coords are +/1 or zero; pyramid base is in xy plane.

  	// YOU write this one...
}


function makeCylinder() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([0.2, 0.2, 0.2]);	// dark gray
 var topColr = new Float32Array([0.4, 0.7, 0.4]);	// light green
 var botColr = new Float32Array([0.5, 0.5, 1.0]);	// light blue
 var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.6;		// radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 

	// Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {	
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] = 1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = topColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);			// x
			cylVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
			//	 can simplify cos(2*PI * (v-1)/(2*capVerts))
			cylVerts[j+2] = 1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=topColr[0]; 
			cylVerts[j+5]=topColr[1]; 
			cylVerts[j+6]=topColr[2];			
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{		
				cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				cylVerts[j+2] = 1.0;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=topColr[0]; 
				cylVerts[j+5]=topColr[1]; 
				cylVerts[j+6]=topColr[2];			
		}
		else		// position all odd# vertices along the bottom cap:
		{
				cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				cylVerts[j+2] =-1.0;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=botColr[0]; 
				cylVerts[j+5]=botColr[1]; 
				cylVerts[j+6]=botColr[2];			
		}
	}
	// Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			cylVerts[j+2] =-1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];		
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] =-1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = botColr[]
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];
		}
	}
}

function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray
  var equColr = new Float32Array([0.3, 0.7, 0.3]);	// Equator:    bright green
  var botColr = new Float32Array([0.9, 0.9, 0.9]);	// South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.
										
	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices; 
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))  
				sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				sphVerts[j+2] = cos0;		
				sphVerts[j+3] = 1.0;			
			}
			else { 	// put odd# vertices around the slice's lower edge;
							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
				sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				sphVerts[j+2] = cos1;																				// z
				sphVerts[j+3] = 1.0;																				// w.		
			}
			if(s==0) {	// finally, set some interesting colors for vertices:
				sphVerts[j+4]=topColr[0]; 
				sphVerts[j+5]=topColr[1]; 
				sphVerts[j+6]=topColr[2];	
				}
			else if(s==slices-1) {
				sphVerts[j+4]=botColr[0]; 
				sphVerts[j+5]=botColr[1]; 
				sphVerts[j+6]=botColr[2];	
			}
			else {
					sphVerts[j+4]=Math.random();// equColr[0]; 
					sphVerts[j+5]=Math.random();// equColr[1]; 
					sphVerts[j+6]=Math.random();// equColr[2];					
			}
		}
	}
}

function makeTorus() {
//==============================================================================
// 		Create a torus centered at the origin that circles the z axis.  
// Terminology: imagine a torus as a flexible, cylinder-shaped bar or rod bent 
// into a circle around the z-axis. The bent bar's centerline forms a circle
// entirely in the z=0 plane, centered at the origin, with radius 'rbend'.  The 
// bent-bar circle begins at (rbend,0,0), increases in +y direction to circle  
// around the z-axis in counter-clockwise (CCW) direction, consistent with our
// right-handed coordinate system.
// 		This bent bar forms a torus because the bar itself has a circular cross-
// section with radius 'rbar' and angle 'phi'. We measure phi in CCW direction 
// around the bar's centerline, circling right-handed along the direction 
// forward from the bar's start at theta=0 towards its end at theta=2PI.
// 		THUS theta=0, phi=0 selects the torus surface point (rbend+rbar,0,0);
// a slight increase in phi moves that point in -z direction and a slight
// increase in theta moves that point in the +y direction.  
// To construct the torus, begin with the circle at the start of the bar:
//					xc = rbend + rbar*cos(phi); 
//					yc = 0; 
//					zc = -rbar*sin(phi);			(note negative sin(); right-handed phi)
// and then rotate this circle around the z-axis by angle theta:
//					x = xc*cos(theta) - yc*sin(theta) 	
//					y = xc*sin(theta) + yc*cos(theta)
//					z = zc
// Simplify: yc==0, so
//					x = (rbend + rbar*cos(phi))*cos(theta)
//					y = (rbend + rbar*cos(phi))*sin(theta) 
//					z = -rbar*sin(phi)
// To construct a torus from a single triangle-strip, make a 'stepped spiral' 
// along the length of the bent bar; successive rings of constant-theta, using 
// the same design used for cylinder walls in 'makeCyl()' and for 'slices' in 
// makeSphere().  Unlike the cylinder and sphere, we have no 'special case' 
// for the first and last of these bar-encircling rings.
//
var rbend = 1.0;										// Radius of circle formed by torus' bent bar
var rbar = 0.5;											// radius of the bar we bent to form torus
var barSlices = 23;									// # of bar-segments in the torus: >=3 req'd;
																		// more segments for more-circular torus
var barSides = 13;										// # of sides of the bar (and thus the 
																		// number of vertices in its cross-section)
																		// >=3 req'd;
																		// more sides for more-circular cross-section
// for nice-looking torus with approx square facets, 
//			--choose odd or prime#  for barSides, and
//			--choose pdd or prime# for barSlices of approx. barSides *(rbend/rbar)
// EXAMPLE: rbend = 1, rbar = 0.5, barSlices =23, barSides = 11.

	// Create a (global) array to hold this torus's vertices:
 torVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));
//	Each slice requires 2*barSides vertices, but 1st slice will skip its first 
// triangle and last slice will skip its last triangle. To 'close' the torus,
// repeat the first 2 vertices at the end of the triangle-strip.  Assume 7

var phi=0, theta=0;										// begin torus at angles 0,0
var thetaStep = 2*Math.PI/barSlices;	// theta angle between each bar segment
var phiHalfStep = Math.PI/barSides;		// half-phi angle between each side of bar
																			// (WHY HALF? 2 vertices per step in phi)
	// s counts slices of the bar; v counts vertices within one slice; j counts
	// array elements (Float32) (vertices*#attribs/vertex) put in torVerts array.
	for(s=0,j=0; s<barSlices; s++) {		// for each 'slice' or 'ring' of the torus:
		for(v=0; v< 2*barSides; v++, j+=7) {		// for each vertex in this slice:
			if(v%2==0)	{	// even #'d vertices at bottom of slice,
				torVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) * 
																						 Math.cos((s)*thetaStep);
							  //	x = (rbend + rbar*cos(phi)) * cos(theta)
				torVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
																						 Math.sin((s)*thetaStep);
								//  y = (rbend + rbar*cos(phi)) * sin(theta) 
				torVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
								//  z = -rbar  *   sin(phi)
				torVerts[j+3] = 1.0;		// w
			}
			else {				// odd #'d vertices at top of slice (s+1);
										// at same phi used at bottom of slice (v-1)
				torVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) * 
																						 Math.cos((s+1)*thetaStep);
							  //	x = (rbend + rbar*cos(phi)) * cos(theta)
				torVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
																						 Math.sin((s+1)*thetaStep);
								//  y = (rbend + rbar*cos(phi)) * sin(theta) 
				torVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
								//  z = -rbar  *   sin(phi)
				torVerts[j+3] = 1.0;		// w
			}
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
		}
	}
	// Repeat the 1st 2 vertices of the triangle strip to complete the torus:
			torVerts[j  ] = rbend + rbar;	// copy vertex zero;
						  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
			torVerts[j+1] = 0.0;
							//  y = (rbend + rbar*cos(phi==0)) * sin(theta==0) 
			torVerts[j+2] = 0.0;
							//  z = -rbar  *   sin(phi==0)
			torVerts[j+3] = 1.0;		// w
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
			j+=7; // go to next vertex:
			torVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
						  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
			torVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
							//  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep) 
			torVerts[j+2] = 0.0;
							//  z = -rbar  *   sin(phi==0)
			torVerts[j+3] = 1.0;		// w
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
}

function makeFish() {
	// Create a (global) array to hold all of this cylinder's vertices;
	// fishVerts = new Float32Array((36) * floatsPerVertex);
	fishHeadVerts = new Float32Array([
	// head 8 nodes
	-0.25,  0.0,  2.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 1
	-0.25,  -0.25, 2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 3
	0.0,  -0.25, 2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 4

	-0.25,  0.0,  2.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 1
	0.0,  0.0,  2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 2
	0.0,  -0.25, 2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 4

	-0.25,  0.0,  2.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 1
	-0.25,  0.0,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 5
	0.0,  0.0,  2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 2

	0.0,  0.0,  2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 2
	0.0,  0.0,  -2.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 6
	-0.25,  0.0,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 5

	0.0,  0.0,  2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 2
	0.0,  0.0,  -2.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 6
	0.0,  -0.25,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 8

	0.0,  0.0,  2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 2
	0.0,  -0.25, 2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 4 
	0.0,  -0.25,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 8

	-0.25,  0.0,  2.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 1
	-0.25,  0.0,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 5
	-0.25,  -0.25,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 7

	-0.25,  0.0,  2.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 1
	-0.25,  -0.25, 2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 3
	-0.25,  -0.25,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 7

	-0.25,  0.0,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 5
	-0.25,  -0.25,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 7
	0.0,  -0.25,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 8

	-0.25,  0.0,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 5
	0.0,  0.0,  -2.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 6
	0.0,  -0.25,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 8

	-0.25,  -0.25, 2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 3
	-0.25,  -0.25,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 7
	0.0,  -0.25, 2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 4 

	0.0,  -0.25, 2.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 4
	0.0,  -0.25,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 8
	-0.25,  -0.25,  -2.0, 1.0, 	0.0,  1.0,  1.0, 	// Node 7
	])
	fishBody1Verts = new Float32Array([
	// body part 1 8 nodes

	0.0, -0.25, 0.25, 1.0,  0.0,  1.0,  1.0,  // Node 11
	0.0, 0.25, -0.25, 1.0,   0.0,  1.0,  1.0,  // Node 10
	0.0, 0.25, 0.25, 1.0,    0.0,  1.0,  1.0,  // Node 9

	0.0, 0.25, -0.25, 1.0,   0.0,  1.0,  1.0,  // Node 10
	0.0, -0.25, 0.25, 1.0,  0.0,  1.0,  1.0,  // Node 11
	0.0, -0.25, -0.25, 1.0,  0.0,  1.0,  1.0,  // Node 12

	0.0, 0.25, 0.25, 1.0,    0.0,  1.0,  1.0,  // Node 9
	0.0, 0.25, -0.25, 1.0,   0.0,  1.0,  1.0,  // Node 10
	-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14

	-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14
	-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
	0.0, 0.25, 0.25, 1.0,    0.0,  1.0,  1.0,  // Node 9

	0.0, 0.25, 0.25, 1.0,    0.0,  1.0,  1.0,  // Node 9
	-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
	-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15

	-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
	0.0, -0.25, 0.25, 1.0,  0.0,  1.0,  1.0,  // Node 11
	0.0, 0.25, 0.25, 1.0,    0.0,  1.0,  1.0,  // Node 9

	0.0, -0.25, 0.25, 1.0,  0.0,  1.0,  1.0,  // Node 11
	-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
	0.0, -0.25, -0.25, 1.0,  0.0,  1.0,  1.0,  // Node 12

	0.0, -0.25, -0.25, 1.0,  0.0,  1.0,  1.0,  // Node 12
	-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
	-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16

	
	-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16
	-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14
	0.0, 0.25, -0.25, 1.0,   0.0,  1.0,  1.0,  // Node 10

	0.0, 0.25, -0.25, 1.0,   0.0,  1.0,  1.0,  // Node 10
	0.0, -0.25, -0.25, 1.0,  0.0,  1.0,  1.0,  // Node 12
	-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16

	-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
	-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14
	-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16

	-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16
    -3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
	-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13

	// body part 3 8 nodes
	])

	fishBody2Verts = new Float32Array([
	// body part 2 12 nodes
	// // node 17
	// -4.0, 0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	// // node 18
	// -4.0, 0.75, -0.75, 1.0,  0.0,  0.0,  1.0,
	// // node 19
	// -5.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  
	// // node 20
	// -5.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,
	// node 21
	// -4.0, -0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	// node 22
	// -5.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,
	// face a
	-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14
	-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
	-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15

	-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
	-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16
	-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14

	// face b
	// // 13 14 18 
	-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
	-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14
	// node 18
	-4.0, 0.75, -0.75, 1.0,  0.0,  0.0,  1.0,

	// 17 13 18
	// node 17
	-4.0, 0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
	// node 18
	-4.0, 0.75, -0.75, 1.0,  0.0,  0.0,  1.0,

	// 17 18 19
	// node 17
	-4.0, 0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	// node 18
	-4.0, 0.75, -0.75, 1.0,  0.0,  0.0,  1.0,
	// node 19
	-5.0, 0.5, 0.5, 1.0,   0.0,  1.0,  1.0,

	// 18 20 19
	// node 18
	-4.0, 0.75, -0.75, 1.0,  0.0,  0.0,  1.0,
	// node 20
	-5.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,
	// node 19
	-5.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  

	// face c
	// 15 13 21
	// node 15
	-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
	// node 13
	-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
	// node 21
	-4.0, -0.75, 0.75, 1.0,  0.0,  0.0,  1.0,


	// 13 17 21
	// node 13
	-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
	// node 17
	-4.0, 0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	// node 21
	-4.0, -0.75, 0.75, 1.0,  0.0,  0.0,  1.0,

	// 21 17 19
	// node 21
	-4.0, -0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	// node 17
	-4.0, 0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	// node 19
	-5.0, 0.5, 0.5, 1.0,   0.0,  1.0,  1.0,

	// 19 22 21
	// node 19
	-5.0, 0.5, 0.5, 1.0,   0.0,  1.0,  1.0,
	// node 22
	-5.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,
	// node 21
	-4.0, -0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	

	// // node 24
	// -5.0, -0.5, -0.5, 1.0,    0.0,  1.0,  1.0,
	// // node 23
	// -4.0, -0.75, -0.75, 1.0,  0.0,  0.0,  1.0,
	// 16 18 14
	// face d
	// node 16
	-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,
	// node 18
	-4.0, 0.75, -0.75, 1.0,  0.0,  0.0,  1.0,
	// node 14
	-3.0, 0.5, -0.5, 1.0,    0.0,  1.0,  1.0,

	// 23 18 16
	// node 23
	-4.0, -0.75, -0.75, 1.0,  0.0,  0.0,  1.0,
	// node 18
	-4.0, 0.75, -0.75, 1.0,  0.0,  0.0,  1.0,
	// node 16
	-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,

	// 24 18 23
	// node 24
	-5.0, -0.5, -0.5, 1.0,    0.0,  1.0,  1.0,
	// node 18
	-4.0, 0.75, -0.75, 1.0,  0.0,  0.0,  1.0,
	// node 23
	-4.0, -0.75, -0.75, 1.0,  0.0,  0.0,  1.0,

	// 24 20 18
	// node 24
	-5.0, -0.5, -0.5, 1.0,    0.0,  1.0,  1.0,
	// node 20
	-5.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,
	// node 18
	-4.0, 0.75, -0.75, 1.0,  0.0,  0.0,  1.0,
	
	// face e
	// 21 16 15 
	-4.0, -0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,
	-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,
	// 21 23 16
	-4.0, -0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	-4.0, -0.75, -0.75, 1.0,  0.0,  0.0,  1.0,
	-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,
	// 21 24 23
	-4.0, -0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	-5.0, -0.5, -0.5, 1.0,    0.0,  1.0,  1.0,
	-4.0, -0.75, -0.75, 1.0,  0.0,  0.0,  1.0,	
	// 21 22 24
	-4.0, -0.75, 0.75, 1.0,  0.0,  0.0,  1.0,
	-5.0, -0.5, 0.5, 1.0,   0.0,  1.0,  1.0,
	-5.0, -0.5, -0.5, 1.0,    0.0,  1.0,  1.0,

	// face f
	// 19 20 24
	-5.0, 0.5, 0.5, 1.0,   0.0,  1.0,  1.0,
	-5.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,
	-5.0, -0.5, -0.5, 1.0,    0.0,  1.0,  1.0,
	// 19 24 22
	-5.0, 0.5, 0.5, 1.0,   0.0,  1.0,  1.0,
	-5.0, -0.5, -0.5, 1.0,    0.0,  1.0,  1.0,
	-5.0, -0.5, 0.5, 1.0,   0.0,  1.0,  1.0,
	])

	fishBody3Verts = new Float32Array([
		// same as body1
		0.0, -0.25, 0.25, 1.0,  0.0,  1.0,  1.0,  // Node 11
		0.0, 0.25, -0.25, 1.0,   0.0,  1.0,  1.0,  // Node 10
		0.0, 0.25, 0.25, 1.0,    0.0,  1.0,  1.0,  // Node 9
	
		0.0, 0.25, -0.25, 1.0,   0.0,  1.0,  1.0,  // Node 10
		0.0, -0.25, 0.25, 1.0,  0.0,  1.0,  1.0,  // Node 11
		0.0, -0.25, -0.25, 1.0,  0.0,  1.0,  1.0,  // Node 12
	
		0.0, 0.25, 0.25, 1.0,    0.0,  1.0,  1.0,  // Node 9
		0.0, 0.25, -0.25, 1.0,   0.0,  1.0,  1.0,  // Node 10
		-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14
	
		-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14
		-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
		0.0, 0.25, 0.25, 1.0,    0.0,  1.0,  1.0,  // Node 9
	
		0.0, 0.25, 0.25, 1.0,    0.0,  1.0,  1.0,  // Node 9
		-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
		-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
	
		-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
		0.0, -0.25, 0.25, 1.0,  0.0,  1.0,  1.0,  // Node 11
		0.0, 0.25, 0.25, 1.0,    0.0,  1.0,  1.0,  // Node 9
	
		0.0, -0.25, 0.25, 1.0,  0.0,  1.0,  1.0,  // Node 11
		-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
		0.0, -0.25, -0.25, 1.0,  0.0,  1.0,  1.0,  // Node 12
	
		0.0, -0.25, -0.25, 1.0,  0.0,  1.0,  1.0,  // Node 12
		-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
		-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16
	
		
		-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16
		-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14
		0.0, 0.25, -0.25, 1.0,   0.0,  1.0,  1.0,  // Node 10
	
		0.0, 0.25, -0.25, 1.0,   0.0,  1.0,  1.0,  // Node 10
		0.0, -0.25, -0.25, 1.0,  0.0,  1.0,  1.0,  // Node 12
		-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16
	
		-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
		-3.0, 0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 14
		-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16
	
		-3.0, -0.5, -0.5, 1.0,   0.0,  1.0,  1.0,  // Node 16
		-3.0, -0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 15
		-3.0, 0.5, 0.5, 1.0,    0.0,  1.0,  1.0,  // Node 13
	])
	fishTailVerts = new Float32Array([
	0.0,  0.0, 0.0, 1.0,  0.0,  1.0,  1.0,//1
	-0.25, 0.0, 0.25, 1.0,  0.0,  1.0,  1.0,//2
	-0.25, 0.0, -0.25, 1.0,  0.0,  1.0,  1.0,//3

	//2 4 3
	-0.25, 0.0, 0.25, 1.0,  0.0,  1.0,  1.0,//2
	-0.25, 1.0, 0.0, 1.0,  0.0,  1.0,  1.0,//4
	-0.25, 0.0, -0.25, 1.0,  0.0,  1.0,  1.0,//3

	// 1 4 2
	0.0,  0.0, 0.0, 1.0,  0.0,  1.0,  1.0,//1
	-0.25, 1.0, 0.0, 1.0,  0.0,  1.0,  1.0,//4
	-0.25, 0.0, 0.25, 1.0,  0.0,  1.0,  1.0,//2

	// 1 3 4
	0.0,  0.0, 0.0, 1.0,  0.0,  1.0,  1.0,//1
	-0.25, 0.0, -0.25, 1.0,  0.0,  1.0,  1.0,//3
	-0.25, 1.0, 0.0, 1.0,  0.0,  1.0,  1.0,//4
	])

	fishHandVerts = new Float32Array([
		// // 1
		// 0.25, 0, -0.25, 1.0, 0.0,  1.0,  1.0,//1
		// // 2
		// 0.25, 0, 0.25, 1.0, 0.0,  1.0,  1.0,//2
		// // 3
		// -0.25, 0, 0.25, 1.0, 0.0,  1.0,  1.0,//3
		// // 4
		// -0.25, 0, -0.25, 1.0, 0.0,  1.0,  1.0,//4
		// // 5
		// 0.0, 1, 0.0, 1.0, 0.0,  1.0,  1.0,//5

		// 2 4 1
		0.25, 0, 0.25, 1.0, 0.0,  1.0,  1.0,//2
		-0.25, 0, -0.25, 1.0, 0.0,  1.0,  1.0,//4
		0.25, 0, -0.25, 1.0, 0.0,  1.0,  1.0,//1
		//4 2 3
		-0.25, 0, -0.25, 1.0, 0.0,  1.0,  1.0,//4
		0.25, 0, 0.25, 1.0, 0.0,  1.0,  1.0,//2
		-0.25, 0, 0.25, 1.0, 0.0,  1.0,  1.0,//3

		// 2 5 3
		0.25, 0, 0.25, 1.0, 0.0,  1.0,  1.0,
		0.0, 1, 0.0, 1.0, 0.0,  1.0,  1.0,
		-0.25, 0, 0.25, 1.0, 0.0,  1.0,  1.0,
		// 3 5 4 
		-0.25, 0, 0.25, 1.0, 0.0,  1.0,  1.0,
		0.0, 1, 0.0, 1.0, 0.0,  1.0,  1.0,
		-0.25, 0, -0.25, 1.0, 0.0,  1.0,  1.0,
		// 4 5 1
		-0.25, 0, -0.25, 1.0, 0.0,  1.0,  1.0,
		0.0, 1, 0.0, 1.0, 0.0,  1.0,  1.0,
		0.25, 0, -0.25, 1.0, 0.0,  1.0,  1.0,
		// 1 5 2
		0.25, 0, -0.25, 1.0, 0.0,  1.0,  1.0,
		0.0, 1, 0.0, 1.0, 0.0,  1.0,  1.0,
		0.25, 0, 0.25, 1.0, 0.0,  1.0,  1.0,
	])

	colorTailVerts = new Float32Array([
			0.0,  0.0, 0.0, 1.0,  1.0,  0.0,  0.0,//1
			-0.25, 0.0, 0.25, 1.0,  1.0,  0.0,  0.0,//2
			-0.25, 0.0, -0.25, 1.0,  1.0,  0.0,  0.0,//3
		
			//2 4 3
			-0.25, 0.0, 0.25, 1.0, 1.0,  0.0,  0.0,//2
			-0.25, 1.0, 0.0, 1.0,  1.0,  0.0,  0.0,//4
			-0.25, 0.0, -0.25, 1.0,  1.0,  0.0,  0.0,//3
		
			// 1 4 2
			0.0,  0.0, 0.0, 1.0,  1.0,  0.0,  0.0,//1
			-0.25, 1.0, 0.0, 1.0,  1.0,  0.0,  0.0,//4
			-0.25, 0.0, 0.25, 1.0,  1.0,  0.0,  0.0,//2
		
			// 1 3 4
			0.0,  0.0, 0.0, 1.0,  1.0,  0.0,  0.0,//1
			-0.25, 0.0, -0.25, 1.0, 1.0,  0.0,  0.0,//3
			-0.25, 1.0, 0.0, 1.0,  1.0,  0.0,  0.0,//4
		])

}

function makeGrass() {
	grassVerts = new Float32Array([

	-0.5,  1.0,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 1
	0.5,  1.0,  0.0, 1.0, 		1.0,  0.0,  0.0,	// Node 2
   -0.5,  1.0, -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 11

   -0.5,  1.0, -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 11
	0.5,  1.0,  -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 22
	0.5,  1.0,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 2

	0.5,  1.0,  0.0, 1.0, 		1.0,  0.0,  0.0,	// Node 2
	1.0,  0.5,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 3
	0.5,  1.0,  -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 22

	0.5,  1.0,  -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 22
	1.0,  0.5,  -3.0, 1.0, 		1.0,  0.0,  0.0,	// Node 33
	1.0,  0.5,  0.0, 1.0, 		1.0,  0.0,  0.0,	// Node 3

	1.0,  0.5,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 3
	1.0,  -0.5,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 4
	1.0,  0.5,  -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 33
  
	1.0,  0.5,  -3.0, 1.0, 		1.0,  0.0,  0.0,	// Node 33
	1.0,  -0.5, -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 44
	1.0,  -0.5,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 4

	1.0,  -0.5,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 4
	0.5,  -1.0,  0.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 5
	0.5,  -1.0, -3.0, 1.0, 		0.0,  0.0,  1.0,	// Node 55

	0.5,  -1.0, -3.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 55
	1.0,  -0.5, -3.0, 1.0, 	0.0,  0.0,  1.0,	// Node 44
	1.0,  -0.5,  0.0, 1.0, 		0.0,  0.0,  1.0,	// Node 4
  
	0.5,  -1.0,  0.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 5
	-0.5, -1.0,  0.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 6
	-0.5, -1.0, -3.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 66

	-0.5, -1.0, -3.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 66
	0.5,  -1.0, -3.0, 1.0, 		1.0,  1.0,  0.0, 	// Node 55
	0.5,  -1.0,  0.0, 1.0, 		1.0,  1.0,  0.0, 	// Node 5

	-0.5, -1.0,  0.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 6
	-1.0, -0.5,  0.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 7
	-1.0, -0.5, -3.0, 1.0, 		0.0,  1.0,  1.0, 	// Node 77

	-1.0, -0.5, -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 77
	-0.5, -1.0, -3.0, 1.0, 		1.0,  0.0,  0.0,	// Node 66
	-0.5, -1.0,  0.0, 1.0, 		1.0,  0.0,  0.0,	// Node 6

	-1.0, -0.5,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 7
	-1.0,  0.5,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 8
  -1.0,  0.5, -3.0, 1.0, 		1.0,  0.0,  0.0,	// Node 88

	-1.0,  0.5, -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 88
  -1.0, -0.5, -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 77
	-1.0, -0.5,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 7

	-1.0,  0.5,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 8
  -0.5,  1.0,  0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 1
	-0.5,  1.0, -3.0, 1.0, 		1.0,  0.0,  0.0,	// Node 11

	-1.0,  0.5, -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 88
  -0.5,  1.0, -3.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 11
	-1.0,  0.5,  0.0, 1.0, 		1.0,  0.0,  0.0,	// Node 8
	])
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;		
	var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
 	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
 	
	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}


function drawAll(gl, n, currentAngle, headAngle, tailAngle, tailAngleN, grassAngle, modelMatrix, u_ModelMatrix) {
	// Clear <canvas>  colors AND the depth buffer
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	modelMatrix.setIdentity(); 

	// modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
   
	gl.viewport(0, 
		0,													// (x,y) location(in pixels)
	  g_canvas.width/2, 				// viewport width, height.
	  g_canvas.height);
  
  // STEP 2: add in a 'perspective()' function call here to define 'camera lens':
	modelMatrix.setPerspective(	35,   // FOVY: top-to-bottom vertical image angle, in degrees
							  1.0,   // Image Aspect Ratio: camera lens width/height
								 1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
								  1000.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
  
	modelMatrix.lookAt(eyeX,eyeY,eyeZ,
								lookX,lookY,lookZ,
											0,0,1)
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

	pushMatrix(modelMatrix);     // SAVE world coord system;
	drawScene(gl, n, currentAngle, headAngle, tailAngle, tailAngleN, grassAngle, modelMatrix, u_ModelMatrix);
	// ======================================================================
	modelMatrix = popMatrix(modelMatrix)

	gl.viewport(g_canvas.width/2, 0,g_canvas.width/2,g_canvas.height);


	modelMatrix.setOrtho(-3, 3, -3, 3, 0, 33.3);

	modelMatrix.lookAt(eyeX,eyeY,eyeZ,
						lookX,lookY,lookZ,
						0,0,1)


	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

	drawScene(gl, n, currentAngle, headAngle, tailAngle, tailAngleN, grassAngle, modelMatrix, u_ModelMatrix);

}

function drawScene(gl, n, currentAngle, headAngle, tailAngle, tailAngleN, grassAngle, modelMatrix, u_ModelMatrix) {
//==============================================================================
// Draw the world coord:
	pushMatrix(modelMatrix);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.LINES, axesStart/floatsPerVertex, axes.length/floatsPerVertex);

  //===========================================================
  //
  pushMatrix(modelMatrix);     // SAVE world coord system;
    	//-------Draw Spinning Cylinder:
    modelMatrix.translate(-1.5,-2.0, 0.0);  // 'set' means DISCARD old matrix,
    						// (drawing axes centered in CVV), and then make new
    						// drawing axes moved to the lower-left corner of CVV. 
    modelMatrix.scale(0.2, 0.2, 0.2);
    						// if you DON'T scale, cyl goes outside the CVV; clipped!
    modelMatrix.rotate(currentAngle, 0, 1, 0);  // spin around y axis.
  	// Drawing:
    // Pass our current matrix to the vertex shaders:
	// mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Draw the cylinder's vertices, and no other vertices:
    gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
    							cylStart/floatsPerVertex, // start at this vertex number, and
    							cylVerts.length/floatsPerVertex);	// draw this many vertices.
  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //  

	pushMatrix(modelMatrix);
		//--------Draw Spinning Sphere
		modelMatrix.translate( 1.5, 2.0, 0.0); // 'set' means DISCARD old matrix,
								// (drawing axes centered in CVV), and then make new
								// drawing axes moved to the lower-left corner of CVV.
							// to match WebGL display canvas.
		modelMatrix.scale(0.6, 0.6, 0.6);
		modelMatrix.scale(1,1,-1);
								// Make it smaller:
		// modelMatrix.rotate(currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
		quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w);	// Quaternion-->Matrix
        modelMatrix.concat(quatMatrix);	// apply that matrix.
		
		// Drawing:		
		// Pass our current matrix to the vertex shaders:
		// mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				// Draw just the sphere's vertices
		gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
									sphStart/floatsPerVertex,	// start at this vertex number, and 
									sphVerts.length/floatsPerVertex);	// draw this many vertices.
		// gl.drawArrays(gl.LINES, axesStart/floatsPerVertex, axes.length/floatsPerVertex);
   modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  
  //===========================================================
  //  
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
  //--------Draw Spinning torus
    modelMatrix.translate(-1.0, 0.0, 0.0);	// 'set' means DISCARD old matrix,
  
    modelMatrix.scale(0.3, 0.3, 0.3);
    						// Make it smaller:
    modelMatrix.rotate(currentAngle, 0, 1, 1);  // Spin on YZ axis
  	// Drawing:		
  	// Pass our current matrix to the vertex shaders:
	//   mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    		// Draw just the torus's vertices
    gl.drawArrays(gl.TRIANGLES, 				// use this drawing primitive, and
    						  torStart/floatsPerVertex,	// start at this vertex number, and
    						  torVerts.length/floatsPerVertex);	// draw this many vertices.
  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //==========================================================================================
  // 

  pushMatrix(modelMatrix);  // SAVE world drawing coords.

  
  modelMatrix.translate(0.8, 0.0, 1.0);
  modelMatrix.rotate(90, 1, 0, 0);
  modelMatrix.scale(1.5,1.5,1.5);
  modelMatrix.scale(1,1,-1);
//   gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
// 	gl.drawArrays(gl.LINES, axesStart/floatsPerVertex, axes.length/floatsPerVertex);
  
  // for mouse-controlled interaction
//   quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w);	// Quaternion-->Matrix
//   modelMatrix.concat(quatMatrix);	// apply that matrix.
  
  
  //--------Draw fish-----------------
  // Draw the fish head + body1 + eye
  pushMatrix(modelMatrix);
  modelMatrix.translate(0.8, 0.0, 0.0);
  modelMatrix.rotate(headAngle,0,1,0);
  
  // Draw the fish head
  pushMatrix(modelMatrix);
  
  modelMatrix.translate(0.5,-0.5, 0.0);  // 'set' means DISCARD old matrix,
  modelMatrix.scale(0.5, 0.2, 0.16);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
							  fishStart/floatsPerVertex, // start at this vertex number, and
							  fishHeadVerts.length/floatsPerVertex);	// draw this many vertices.
							  
  modelMatrix = popMatrix();

  // Draw the fish body1
  pushMatrix(modelMatrix);
  
  modelMatrix.translate(0.45,-0.54, 0.0);  // 'set' means DISCARD old matrix,
// modelMatrix.translate(0.5,-0.5, 0.0);
  modelMatrix.scale(0.11, 0.2, 0.2);
//   modelMatrix.rotate(swimAngle,0,1,0);
//   modelMatrix.rotate(currentAngle, 0, 0, 1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
							fishBody1Start/floatsPerVertex, // start at this vertex number, and
							fishBody1Verts.length/floatsPerVertex);	// draw this many vertices.

modelMatrix = popMatrix();

// Draw the fish eye
// draw the fish eye left
pushMatrix(modelMatrix);
modelMatrix.translate(0.45,-0.55, -0.3);  // 'set' means DISCARD old matrix,
	modelMatrix.scale(0.04, 0.04, 0.04);
//   modelMatrix.rotate(8, 0, 0, 1);
//   modelMatrix.rotate(90, 1, 0, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	//   		// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
								sphStart/floatsPerVertex,	// start at this vertex number, and 
								sphVerts.length/floatsPerVertex);	// draw this many vertices.
modelMatrix = popMatrix();

// draw the fish eye right
pushMatrix(modelMatrix);
modelMatrix.translate(0.45,-0.55, 0.3);  // 'set' means DISCARD old matrix,
	modelMatrix.scale(0.04, 0.04, 0.04);
//   modelMatrix.rotate(8, 0, 0, 1);
//   modelMatrix.rotate(90, 1, 0, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	//   		// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
								sphStart/floatsPerVertex,	// start at this vertex number, and 
								sphVerts.length/floatsPerVertex);	// draw this many vertices.
modelMatrix = popMatrix();
modelMatrix = popMatrix();

// Draw the fish body 2
pushMatrix(modelMatrix);

modelMatrix.translate(1.5,-0.54, 0.0);  // 'set' means DISCARD old matrix,
  modelMatrix.scale(0.2, 0.2, 0.2);

//   modelMatrix.rotate(currentAngle, 0, 0, 1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
							fishBody2Start/floatsPerVertex, // start at this vertex number, and
							fishBody2Verts.length/floatsPerVertex);	// draw this many vertices.
// 3d axes			
pushMatrix(modelMatrix);
modelMatrix.translate(-4.0,0.0, 0.0)
modelMatrix.scale(2.0, 2.0, 2.0);
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.LINES, axesStart/floatsPerVertex, axes.length/floatsPerVertex);
modelMatrix = popMatrix();

modelMatrix = popMatrix();

// Draw the fish body3+tail
pushMatrix(modelMatrix);
modelMatrix.translate(0.8, 0.0, 0.0);  // 'set' means DISCARD old matrix,
modelMatrix.rotate(tailAngle,0,1,0);

// Draw the fish body 3
pushMatrix(modelMatrix);

modelMatrix.translate(-0.62,-0.54, 0.0);  // 'set' means DISCARD old matrix,
  modelMatrix.scale(0.12, 0.2, 0.2);
  modelMatrix.rotate(180, 0, 0, 1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
							fishBody3Start/floatsPerVertex, // start at this vertex number, and
							fishBody3Verts.length/floatsPerVertex);	// draw this many vertices.
modelMatrix = popMatrix();

// tail move part
pushMatrix(modelMatrix);
modelMatrix.translate(-0.6,-0.5, 0.0);  // 'set' means DISCARD old matrix,
modelMatrix.rotate(tailAngleN,0,1,0);
pushMatrix(modelMatrix);
modelMatrix.scale(0.5, 0.5, 0.5);
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.LINES, axesStart/floatsPerVertex, axes.length/floatsPerVertex);
modelMatrix = popMatrix();
// Draw the fish tail up
pushMatrix(modelMatrix);
// modelMatrix.translate(-0.6,-0.5, 0.0);  // 'set' means DISCARD old matrix,
  modelMatrix.scale(0.6, 0.4, 0.3);
//   modelMatrix.rotate(45, 0, 1, 0);
  modelMatrix.rotate(30, 0, 0, 1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
				fishTailStart/floatsPerVertex, // start at this vertex number, and
				fishTailVerts.length/floatsPerVertex);	// draw this many vertices.
// if(norm) 
// gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
// 				fishTailStart/floatsPerVertex, // start at this vertex number, and
// 				fishTailVerts.length/floatsPerVertex);	// draw this many vertices.
//   else 
//   gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
// 				colorTailStart/floatsPerVertex, // start at this vertex number, and
// 				colorTailVerts.length/floatsPerVertex);	// draw this many vertices.

modelMatrix = popMatrix();

// Draw the fish tail down
pushMatrix(modelMatrix);
// modelMatrix.translate(-0.6,-0.5, 0.0);  // 'set' means DISCARD old matrix,
  modelMatrix.scale(0.5, 0.3, 0.3);
  modelMatrix.rotate(120, 0, 0, 1);
//   modelMatrix.rotate(60, 1, 0, 0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
				  fishTailStart/floatsPerVertex, // start at this vertex number, and
				  fishTailVerts.length/floatsPerVertex);	// draw this many vertices.
//   if(norm) 
//   gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
// 				  fishTailStart/floatsPerVertex, // start at this vertex number, and
// 				  fishTailVerts.length/floatsPerVertex);	// draw this many vertices.
// 	else 
// 	gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
// 				  colorTailStart/floatsPerVertex, // start at this vertex number, and
// 				  colorTailVerts.length/floatsPerVertex);	// draw this many vertices.
modelMatrix = popMatrix();

modelMatrix = popMatrix();

modelMatrix = popMatrix();

// Draw the fish wing
pushMatrix(modelMatrix);
modelMatrix.translate(0.8,-0.45, 0.0);  // 'set' means DISCARD old matrix,
  modelMatrix.scale(0.7, 0.3, 0.3);
  modelMatrix.rotate(8, 0, 0, 1);
//   modelMatrix.rotate(60, 1, 0, 0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
//   if(norm) 
  gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
				  fishTailStart/floatsPerVertex, // start at this vertex number, and
				  fishTailVerts.length/floatsPerVertex);	// draw this many vertices.
	// else 
	// gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
	// 			  colorTailStart/floatsPerVertex, // start at this vertex number, and
	// 			  colorTailVerts.length/floatsPerVertex);	// draw this many vertices.
modelMatrix = popMatrix();

// Draw the fish hand left
pushMatrix(modelMatrix);
modelMatrix.translate(0.8,-0.55, -0.12);  // 'set' means DISCARD old matrix,
  modelMatrix.scale(0.3, 0.2, 0.2);
//   modelMatrix.rotate(8, 0, 0, 1);
  modelMatrix.rotate(90, -1, 0, 0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
							fishHandStart/floatsPerVertex, // start at this vertex number, and
							fishHandVerts.length/floatsPerVertex);	// draw this many vertices.
modelMatrix = popMatrix();

// draw the fish hand right
pushMatrix(modelMatrix);
modelMatrix.translate(0.8,-0.55, 0.12);  // 'set' means DISCARD old matrix,
  modelMatrix.scale(0.3, 0.2, 0.2);
//   modelMatrix.rotate(8, 0, 0, 1);
  modelMatrix.rotate(90, 1, 0, 0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
							fishHandStart/floatsPerVertex, // start at this vertex number, and
							fishHandVerts.length/floatsPerVertex);	// draw this many vertices.
modelMatrix = popMatrix();
modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
//=============================================================================================================
// grass part
pushMatrix(modelMatrix);
modelMatrix.translate(0.0, -2.0, 0.5);
modelMatrix.scale(0.2, 0.2, 0.2);	
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
								grassStart/floatsPerVertex, // start at this vertex number, and
								grassVerts.length/floatsPerVertex);	// draw this many vertices.
modelMatrix.translate(0.0, 0.0, 0.4);
		pushMatrix(modelMatrix); // 3
		modelMatrix.scale(0.5, 0.5, 0.5);	
		modelMatrix.rotate(180,1,0,0);
		// modelMatrix.rotate(10.0,0,1,0);
		modelMatrix.rotate(grassAngle,0,1,0);
	
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
									grassStart/floatsPerVertex, // start at this vertex number, and
									grassVerts.length/floatsPerVertex);	// draw this many vertices.
		modelMatrix.translate(0.0, 0.0, -3.0);
			pushMatrix(modelMatrix); // 3
			modelMatrix.scale(0.5, 0.5, 0.5);
			// modelMatrix.rotate(-80,1,0,0);
			// modelMatrix.rotate(10.0,0,1,0);
			modelMatrix.rotate(grassAngle,0,1,0);

			gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
			gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
										grassStart/floatsPerVertex, // start at this vertex number, and
										grassVerts.length/floatsPerVertex);	// draw this many vertices.
			modelMatrix.translate(0.0, 0.0, -3.0);
				pushMatrix(modelMatrix); // 3
				modelMatrix.scale(0.5, 0.5, 0.5);
				// modelMatrix.rotate(180,1,0,0);	
				// modelMatrix.rotate(-80,1,0,0);
				// modelMatrix.rotate(10.0,0,1,0);
				modelMatrix.rotate(grassAngle,0,1,0);

				gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
				gl.drawArrays(gl.TRIANGLES,				// use this drawing primitive, and
											grassStart/floatsPerVertex, // start at this vertex number, and
											grassVerts.length/floatsPerVertex);	// draw this many vertices.
				modelMatrix = popMatrix();
			modelMatrix = popMatrix();
		modelMatrix = popMatrix();
modelMatrix = popMatrix();

  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
  	//---------Draw Ground Plane, without spinning.
  	// position it.
  	modelMatrix.translate( 0.4, -0.4, 0.0);	
  	modelMatrix.scale(0.1, 0.1, 0.1);				// shrink by 10X:

  	// Drawing:
  	// Pass our current matrix to the vertex shaders:
	//   mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES, 								// use this drawing primitive, and
    						  gndStart/floatsPerVertex,	// start at this vertex number, and
    						  gndVerts.length/floatsPerVertex);	// draw this many vertices.
  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  
  //===========================================================
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();
var g_last1 = Date.now();
var g_last2 = Date.now();
var g_last3 = Date.now();
var g_last4 = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;    
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
//  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
//  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

function animateFish(angle, now){
    var elapsed = now - g_last1;
    g_last1 = now;
    
    // Update the current rotation angle (adjusted by the elapsed time)
    //  limit the angle to move smoothly between +20 and -85 degrees:
    if(angle >   20.0 && ANGLE_STEP_FISH > 0) ANGLE_STEP_FISH = -ANGLE_STEP_FISH;
    if(angle <  -20.0 && ANGLE_STEP_FISH < 0) ANGLE_STEP_FISH = -ANGLE_STEP_FISH;
    
    var newAngle = angle + (ANGLE_STEP_FISH * elapsed) / 800.0;
    return newAngle %= 360;
  }

function animateFishTail(angle, now){
    var elapsed = now - g_last2;
    g_last2 = now;
    
    // Update the current rotation angle (adjusted by the elapsed time)
    //  limit the angle to move smoothly between +20 and -85 degrees:
    if(angle >   30.0 && ANGLE_STEP_TAIL > 0) ANGLE_STEP_TAIL = -ANGLE_STEP_TAIL;
    if(angle <  -30.0 && ANGLE_STEP_TAIL < 0) ANGLE_STEP_TAIL = -ANGLE_STEP_TAIL;
    
    var newAngle = angle + (ANGLE_STEP_TAIL * elapsed) / 500.0;
    return newAngle %= 360;
  }

function animateFishTailN(angle, now){
    var elapsed = now - g_last3;
    g_last3 = now;
    
    // Update the current rotation angle (adjusted by the elapsed time)
    //  limit the angle to move smoothly between +20 and -85 degrees:
    if(angle >   50.0 && ANGLE_STEP_TAILN > 0) ANGLE_STEP_TAILN = -ANGLE_STEP_TAILN;
    if(angle <  -50.0 && ANGLE_STEP_TAILN < 0) ANGLE_STEP_TAILN = -ANGLE_STEP_TAILN;
    
    var newAngle = angle + (ANGLE_STEP_TAILN * elapsed) / 480.0;
    return newAngle %= 360;
  }

function animateGrass(angle, now){
    var elapsed = now - g_last4;
    g_last4 = now;
    
    // Update the current rotation angle (adjusted by the elapsed time)
    //  limit the angle to move smoothly between +20 and -85 degrees:
    if(angle >   45.0 && ANGLE_STEP_GRASS > 0) ANGLE_STEP_GRASS = -ANGLE_STEP_GRASS;
    if(angle <  -45.0 && ANGLE_STEP_GRASS < 0) ANGLE_STEP_GRASS = -ANGLE_STEP_GRASS;
    
    var newAngle = angle + (ANGLE_STEP_GRASS * elapsed) / 1000.0;
    return newAngle %= 360;
  }

//===================for webgl====================================================
function drawResize() {
	//==============================================================================
	// Called when user re-sizes their browser window , because our HTML file
	// contains:  <body onload="main()" onresize="winResize()">
	
		//Report our current browser-window contents:
	
		console.log('g_Canvas width,height=', g_canvas.width, g_canvas.height);		
	 	console.log('Browser window: innerWidth,innerHeight=', innerWidth, innerHeight);	
																	// http://www.w3schools.com/jsref/obj_window.asp
	
		//Make canvas fill the top 3/4 of our browser window:
		var xtraMargin = 16;    // keep a margin (otherwise, browser adds scroll-bars)
		g_canvas.width = innerWidth - xtraMargin;
		g_canvas.height = (innerHeight*0.7) - xtraMargin;
		// IMPORTANT!  Need a fresh drawing in the re-sized viewports.
    drawAll(gl, n, currentAngle, headAngle, tailAngle, tailAngleN, grassAngle, modelMatrix, u_ModelMatrix);   // Draw shapes
}
//===================mouse control================================================
function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
	
	// Convert to Canonical View Volume (CVV) coordinates too:
	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							(canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
								(canvas.height/2);
//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
	
	isDrag = true;											// set our mouse-dragging flag
	xMclik = x;													// record where mouse-dragging began
	yMclik = y;
};
	
	
function myMouseMove(ev, gl, canvas) {
	if(isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
	
	// Convert to Canonical View Volume (CVV) coordinates too:
	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							(canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
								(canvas.height/2);

	// find how far we dragged the mouse:
	xMdragTot += (x - xMclik);					// Accumulate change-in-mouse-position,&
	yMdragTot += (y - yMclik);
	// AND use any mouse-dragging we found to update quaternions qNew and qTot.
	dragQuat(x - xMclik, y - yMclik);
	
	xMclik = x;												
	yMclik = y;

	};
	
function myMouseUp(ev, gl, canvas) {
	var rect = ev.target.getBoundingClientRect();
	var xp = ev.clientX - rect.left;
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge

	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							(canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
								(canvas.height/2);

	
	isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	xMdragTot += (x - xMclik);
	yMdragTot += (y - yMclik);

	dragQuat(x - xMclik, y - yMclik);

	};
	
function dragQuat(xdrag, ydrag) {
//==============================================================================
// Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
// We find a rotation axis perpendicular to the drag direction, and convert the 
// drag distance to an angular rotation amount, and use both to set the value of 
// the quaternion qNew.  We then combine this new rotation with the current 
// rotation stored in quaternion 'qTot' by quaternion multiply.  Note the 
// 'draw()' function converts this current 'qTot' quaternion to a rotation 
// matrix for drawing. 
	var qTmp = new Quaternion(0,0,0,1);
	
	var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);
	// console.log('xdrag,ydrag=',xdrag.toFixed(5),ydrag.toFixed(5),'dist=',dist.toFixed(5));
	qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0.0, dist*150.0);
	// (why add tiny 0.0001? To ensure we never have a zero-length rotation axis)
							// why axis (x,y,z) = (-yMdrag,+xMdrag,0)? 
							// -- to rotate around +x axis, drag mouse in -y direction.
							// -- to rotate around +y axis, drag mouse in +x direction.
							
	qTmp.multiply(qNew,qTot);			// apply new rotation to current rotation. 
	//--------------------------
	// IMPORTANT! Why qNew*qTot instead of qTot*qNew? (Try it!)
	// ANSWER: Because 'duality' governs ALL transformations, not just matrices. 
	// If we multiplied in (qTot*qNew) order, we would rotate the drawing axes
	// first by qTot, and then by qNew--we would apply mouse-dragging rotations
	// to already-rotated drawing axes.  Instead, we wish to apply the mouse-drag
	// rotations FIRST, before we apply rotations from all the previous dragging.
	//------------------------
	// IMPORTANT!  Both qTot and qNew are unit-length quaternions, but we store 
	// them with finite precision. While the product of two (EXACTLY) unit-length
	// quaternions will always be another unit-length quaternion, the qTmp length
	// may drift away from 1.0 if we repeat this quaternion multiply many times.
	// A non-unit-length quaternion won't work with our quaternion-to-matrix fcn.
	// Matrix4.prototype.setFromQuat().
//	qTmp.normalize();						// normalize to ensure we stay at length==1.0.
	qTot.copy(qTmp);
	// show the new quaternion qTot on our webpage in the <div> element 'QuatValue'

        };
//=================for key interaction================================================
function myKeyDown(ev) {

	// keys(ev)
    var xd = eyeX - lookX;
    var yd = eyeY - lookY;
    var zd = eyeZ - lookZ;

    var lxy = Math.sqrt(xd * xd + yd * yd);

    var l = Math.sqrt(xd * xd + yd * yd + zd * zd);


    switch (ev.keyCode) {      // keycodes !=ASCII, but are very consistent for 
        //  nearly all non-alphanumeric keys for nearly all keyboards in all countries.
        case 74: // J
            if (press == -1) theta = -Math.acos(xd / lxy) -1.5 + 0.1;
            else theta = theta + 0.1;
            lookX = eyeX + lxy * Math.cos(theta);
            lookY = eyeY + lxy * Math.sin(theta);
            press = 1;
            break;
        case 73: // I
            lookZ = lookZ + 0.1;
            break;
        case 76: // L
            if (press == -1) theta = -Math.acos(xd / lxy) -1.5 - 0.1;
            else theta = theta - 0.1;
            lookX = eyeX + lxy * Math.cos(theta);
            lookY = eyeY + lxy * Math.sin(theta);
            press = 1;
            break;
        case 75: // k
            lookZ = lookZ - 0.1;
            break;

        case 87:    // W
            lookX = lookX - 0.1 * (xd / l);
            lookY = lookY - 0.1 * (yd / l);
            lookZ = lookZ - 0.1 * (zd / l);

            eyeX = eyeX - 0.1 * (xd / l);
            eyeY = eyeY - 0.1 * (yd / l);
            eyeZ = eyeZ - 0.1 * (zd / l);
            break;

        case 83:    // S
            lookX = lookX + 0.1 * (xd / l);
            lookY = lookY + 0.1 * (yd / l);
            lookZ = lookZ + 0.1 * (zd / l);

            eyeX = eyeX + 0.1 * (xd / l);
            eyeY = eyeY + 0.1 * (yd / l);
            eyeZ = eyeZ + 0.1 * (zd / l);

            break;

        case 68: // D
            eyeX = eyeX - 0.1 * yd / lxy;
            eyeY = eyeY + 0.1 * xd / lxy;
            lookX -= 0.1 * yd / lxy;
            lookY += 0.1 * xd / lxy;

            break;
        case 65: // jA
            eyeX = eyeX + 0.1 * yd / lxy;
            eyeY = eyeY - 0.1 * xd / lxy;
            lookX += 0.1 * yd / lxy;
            lookY -= 0.1 * xd / lxy;

            break;


        }

  }
  
function myKeyUp(ev) {
	  console.log('myKeyUp()--keyCode='+ev.keyCode+' released.');
  }
//==================HTML Button Callbacks
function nextShape() {
	shapeNum += 1;
	if(shapeNum >= shapeMax) shapeNum = 0;
}

function spinDown() {
 ANGLE_STEP -= 25; 
}

function spinUp() {
  ANGLE_STEP += 25; 
}

function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }
}
 