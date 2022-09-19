//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// TABS set to 2.
//
// ORIGINAL SOURCE:
// RotatingTranslatedTriangle.js (c) 2012 matsuda
// HIGHLY MODIFIED to make:
//
// JT_MultiShader.js  for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin

// Jack Tumblin's Project C -- step by step.

/* Show how to use 3 separate VBOs with different verts, attributes & uniforms. 
-------------------------------------------------------------------------------
	Create a 'VBObox' object/class/prototype & library to collect, hold & use all 
	data and functions we need to render a set of vertices kept in one Vertex 
	Buffer Object (VBO) on-screen, including:
	--All source code for all Vertex Shader(s) and Fragment shader(s) we may use 
		to render the vertices stored in this VBO;
	--all variables needed to select and access this object's VBO, shaders, 
		uniforms, attributes, samplers, texture buffers, and any misc. items. 
	--all variables that hold values (uniforms, vertex arrays, element arrays) we 
	  will transfer to the GPU to enable it to render the vertices in our VBO.
	--all user functions: init(), draw(), adjust(), reload(), empty(), restore().
	Put all of it into 'JT_VBObox-Lib.js', a separate library file.

USAGE:
------
1) If your program needs another shader program, make another VBObox object:
 (e.g. an easy vertex & fragment shader program for drawing a ground-plane grid; 
 a fancier shader program for drawing Gouraud-shaded, Phong-lit surfaces, 
 another shader program for drawing Phong-shaded, Phong-lit surfaces, and
 a shader program for multi-textured bump-mapped Phong-shaded & lit surfaces...)
 
 HOW:
 a) COPY CODE: create a new VBObox object by renaming a copy of an existing 
 VBObox object already given to you in the VBObox-Lib.js file. 
 (e.g. copy VBObox1 code to make a VBObox3 object).

 b) CREATE YOUR NEW, GLOBAL VBObox object.  
 For simplicity, make it a global variable. As you only have ONE of these 
 objects, its global scope is unlikely to cause confusions/errors, and you can
 avoid its too-frequent use as a function argument.
 (e.g. above main(), write:    var phongBox = new VBObox3();  )

 c) INITIALIZE: in your JS progam's main() function, initialize your new VBObox;
 (e.g. inside main(), write:  phongBox.init(); )

 d) DRAW: in the JS function that performs all your webGL-drawing tasks, draw
 your new VBObox's contents on-screen. 
 (NOTE: as it's a COPY of an earlier VBObox, your new VBObox's on-screen results
  should duplicate the initial drawing made by the VBObox you copied.  
  If that earlier drawing begins with the exact same initial position and makes 
  the exact same animated moves, then it will hide your new VBObox's drawings!
  --THUS-- be sure to comment out the earlier VBObox's draw() function call  
  to see the draw() result of your new VBObox on-screen).
  (e.g. inside drawAll(), add this:  
      phongBox.switchToMe();
      phongBox.draw();            )

 e) ADJUST: Inside the JS function that animates your webGL drawing by adjusting
 uniforms (updates to ModelMatrix, etc) call the 'adjust' function for each of your
VBOboxes.  Move all the uniform-adjusting operations from that JS function into the
'adjust()' functions for each VBObox. 

2) Customize the VBObox contents; add vertices, add attributes, add uniforms.
 ==============================================================================*/


// Global Variables  
//   (These are almost always a BAD IDEA, but here they eliminate lots of
//    tedious function arguments. 
//    Later, collect them into just a few global, well-organized objects!)
// ============================================================================
// for WebGL usage:--------------------
var gl;													// WebGL rendering context -- the 'webGL' object
																// in JavaScript with all its member fcns & data
var g_canvasID;									// HTML-5 'canvas' element ID#
eyeX = 6
eyeY = 8
eyeZ = 2
lookX = -6
lookY = -8
lookZ = -3

// For multiple VBOs & Shaders:-----------------
worldBox = new VBObox0();		  // Holds VBO & shaders for 3D 'world' ground-plane grid, etc;
gouraudBox = new VBObox1();		  // "  "  for first set of custom-shaded 3D parts
phongBox = new VBObox2();     // "  "  for second set of custom-shaded 3D parts
sphereBox = new VBObox3();   // spinning sphere
gridBox = new VBObox4();
ballBox = new VBObox5();
fishBox = new VBObox6();
fanBox = new VBObox7();
torBox = new VBObox8();


// For animation:---------------------
var g_lastMS = Date.now();			// Timestamp (in milliseconds) for our 
                                // most-recently-drawn WebGL screen contents.  
                                // Set & used by moveAll() fcn to update all
                                // time-varying params for our webGL drawings.
  // All time-dependent params (you can add more!)
var g_angleNow0  =  0.0; 			  // Current rotation angle, in degrees.
var g_angleRate0 = 45.0;				// Rotation angle rate, in degrees/second.
                                //---------------
var g_angleNow1  = 100.0;       // current angle, in degrees
var g_angleRate1 =  95.0;        // rotation angle rate, degrees/sec
var g_angleMax1  = 30.0;       // max, min allowed angle, in degrees
var g_angleMin1  =  -30.0;
                                //---------------
var g_angleNow2  =  0.0; 			  // Current rotation angle, in degrees.
var g_angleRate2 = -62.0;				// Rotation angle rate, in degrees/second.
var angle1 = 0;
var angle1rate = 45.0;

                                //---------------
var g_posNow0 =  0.0;           // current position
var g_posRate0 = 0.6;           // position change rate, in distance/second.
var g_posMax0 =  0.5;           // max, min allowed for g_posNow;
var g_posMin0 = -0.5;           
                                // ------------------
var g_posNow1 =  0.0;           // current position
var g_posRate1 = 0.5;           // position change rate, in distance/second.
var g_posMax1 =  1.0;           // max, min allowed positions
var g_posMin1 = -1.0;
//---------------
var g_angle02 = 0;
var g_angle02Rate = 10.0;

var g_angle03 = 0;
var g_angle03Rate = -30.0;

var g_angle01 = 0;                  
var g_angle01Rate = 45.0; 
// For mouse/keyboard:------------------------
var g_show0 = 1;								// 0==Show, 1==Hide VBO0 contents on-screen.
var g_show1 = 1;								// 	"					"			VBO1		"				"				" 
var g_show2 = 1;                //  "         "     VBO2    "       "       "
var g_show3 = 1;
var g_show4 = 1;
var g_show5 = 1;
var g_show6 = 1;
var g_show7 = 1;
var g_show8 = 1;

var g_light_left_right = 0;
var g_light_up_down = 0;

// GLOBAL CAMERA CONTROL:					// 
g_worldMat = new Matrix4();				// Changes CVV drawing axes to 'world' axes.
// (equivalently: transforms 'world' coord. numbers (x,y,z,w) to CVV coord. numbers)
// WHY?
// Lets mouse/keyboard functions set just one global matrix for 'view' and 
// 'projection' transforms; then VBObox objects use it in their 'adjust()'
// member functions to ensure every VBObox draws its 3D parts and assemblies
// using the same 3D camera at the same 3D position in the same 3D world).

function main() {
//=============================================================================
  // Retrieve the HTML-5 <canvas> element where webGL will draw our pictures:
  g_canvasID = document.getElementById('webgl');	
  // Create the the WebGL rendering context: one giant JavaScript object that
  // contains the WebGL state machine adjusted by large sets of WebGL functions,
  // built-in variables & parameters, and member data. Every WebGL function call
  // will follow this format:  gl.WebGLfunctionName(args);

  // Create the the WebGL rendering context: one giant JavaScript object that
  // contains the WebGL state machine, adjusted by big sets of WebGL functions,
  // built-in variables & parameters, and member data. Every WebGL func. call
  // will follow this format:  gl.WebGLfunctionName(args);
  //SIMPLE VERSION:  gl = getWebGLContext(g_canvasID); 
  // Here's a BETTER version:
  gl = g_canvasID.getContext("webgl", { preserveDrawingBuffer: true});
	// This fancier-looking version disables HTML-5's default screen-clearing, so 
	// that our drawMain() 
	// function will over-write previous on-screen results until we call the 
	// gl.clear(COLOR_BUFFER_BIT); function. )
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.clearColor(0.2, 0.2, 0.2, 1);	  // RGBA color for clearing <canvas>

  gl.enable(gl.DEPTH_TEST);

  /*
//----------------SOLVE THE 'REVERSED DEPTH' PROBLEM:------------------------
  // IF the GPU doesn't transform our vertices by a 3D Camera Projection Matrix
  // (and it doesn't -- not until Project B) then the GPU will compute reversed 
  // depth values:  depth==0 for vertex z == -1;   (but depth = 0 means 'near') 
  //		    depth==1 for vertex z == +1.   (and depth = 1 means 'far').
  //
  // To correct the 'REVERSED DEPTH' problem, we could:
  //  a) reverse the sign of z before we render it (e.g. scale(1,1,-1); ugh.)
  //  b) reverse the usage of the depth-buffer's stored values, like this:
  gl.enable(gl.DEPTH_TEST); // enabled by default, but let's be SURE.

  gl.clearDepth(0.0);       // each time we 'clear' our depth buffer, set all
                            // pixel depths to 0.0  (1.0 is DEFAULT)
  gl.depthFunc(gl.GREATER); // draw a pixel only if its depth value is GREATER
                            // than the depth buffer's stored value.
                            // (gl.LESS is DEFAULT; reverse it!)
  //------------------end 'REVERSED DEPTH' fix---------------------------------
*/  
window.addEventListener("keydown", myKeyDown, false);
window.addEventListener("keyup", myKeyUp, false);
  // Initialize each of our 'vboBox' objects: 
  worldBox.init(gl);		// VBO + shaders + uniforms + attribs for our 3D world,
                        // including ground-plane,                       
  gouraudBox.init(gl);		//  "		"		"  for 1st kind of shading & lighting
	phongBox.init(gl);    //  "   "   "  for 2nd kind of shading & lighting
  sphereBox.init(gl);    //  "   "   "  for 2nd kind of shading & lighting
  gridBox.init(gl);      //  "   "   "  for 2nd kind of shading & lighting
  ballBox.init(gl);      //  "   "   "  for 2nd kind of shading & lighting
  fishBox.init(gl);      //  "   "   "  for 2nd kind of shading & lighting
  fanBox.init(gl);       //  "   "   "  for 2nd kind of shading & lighting
  torBox.init(gl);       //  "   "   "  for 2nd kind of shading & lighting
	
setCamera();				// TEMPORARY: set a global camera used by ALL VBObox objects...
	
  gl.clearColor(0.2, 0.2, 0.2, 1);	  // RGBA color for clearing <canvas>
  
  // ==============ANIMATION=============
  // Quick tutorials on synchronous, real-time animation in JavaScript/HTML-5: 
  //    https://webglfundamentals.org/webgl/lessons/webgl-animation.html
  //  or
  //  	http://creativejs.com/resources/requestanimationframe/
  //		--------------------------------------------------------
  // Why use 'requestAnimationFrame()' instead of the simpler-to-use
  //	fixed-time setInterval() or setTimeout() functions?  Because:
  //		1) it draws the next animation frame 'at the next opportunity' instead 
  //			of a fixed time interval. It allows your browser and operating system
  //			to manage its own processes, power, & computing loads, and to respond 
  //			to on-screen window placement (to skip battery-draining animation in 
  //			any window that was hidden behind others, or was scrolled off-screen)
  //		2) it helps your program avoid 'stuttering' or 'jittery' animation
  //			due to delayed or 'missed' frames.  Your program can read and respond 
  //			to the ACTUAL time interval between displayed frames instead of fixed
  //		 	fixed-time 'setInterval()' calls that may take longer than expected.
  //------------------------------------
  var tick = function() {		    // locally (within main() only), define our 
                                // self-calling animation function. 
    requestAnimationFrame(tick, g_canvasID); // browser callback request; wait
                                // til browser is ready to re-draw canvas, then
    curLightDisplay();
    curShadeDisplay();
    timerAll();  // Update all time-varying params, and
    drawAll();                // Draw all the VBObox contents
    };
  //------------------------------------
  tick();                       // do it again!
  drawResize();                 
}

function timerAll() {
//=============================================================================
// Find new values for all time-varying parameters used for on-screen drawing
  // use local variables to find the elapsed time.
  var nowMS = Date.now();             // current time (in milliseconds)
  var elapsedMS = nowMS - g_lastMS;   // 
  g_lastMS = nowMS;                   // update for next webGL drawing.
  if(elapsedMS > 1000.0) {            
    // Browsers won't re-draw 'canvas' element that isn't visible on-screen 
    // (user chose a different browser tab, etc.); when users make the browser
    // window visible again our resulting 'elapsedMS' value has gotten HUGE.
    // Instead of allowing a HUGE change in all our time-dependent parameters,
    // let's pretend that only a nominal 1/30th second passed:
    elapsedMS = 1000.0/30.0;
    }
  // Find new time-dependent parameters using the current or elapsed time:
  // Continuous rotation:
  g_angleNow0 = g_angleNow0 + (g_angleRate0 * elapsedMS) / 1000.0;
  g_angleNow1 = g_angleNow1 + (g_angleRate1 * elapsedMS) / 1000.0;
  g_angleNow2 = g_angleNow2 + (g_angleRate2 * elapsedMS) / 1000.0;
  g_angleNow0 %= 360.0;   // keep angle >=0.0 and <360.0 degrees  
  g_angleNow1 %= 360.0;   
  g_angleNow2 %= 360.0;
  if(g_angleNow1 > g_angleMax1) { // above the max?
    g_angleNow1 = g_angleMax1;    // move back down to the max, and
    g_angleRate1 = -g_angleRate1; // reverse direction of change.
    }
  else if(g_angleNow1 < g_angleMin1) {  // below the min?
    g_angleNow1 = g_angleMin1;    // move back up to the min, and
    g_angleRate1 = -g_angleRate1;
    }
  // Continuous movement:
  g_posNow0 += g_posRate0 * elapsedMS / 1000.0;
  g_posNow1 += g_posRate1 * elapsedMS / 1000.0;
  // apply position limits
  if(g_posNow0 > g_posMax0) {   // above the max?
    g_posNow0 = g_posMax0;      // move back down to the max, and
    g_posRate0 = -g_posRate0;   // reverse direction of change
    }
  else if(g_posNow0 < g_posMin0) {  // or below the min? 
    g_posNow0 = g_posMin0;      // move back up to the min, and
    g_posRate0 = -g_posRate0;   // reverse direction of change.
    }
  if(g_posNow1 > g_posMax1) {   // above the max?
    g_posNow1 = g_posMax1;      // move back down to the max, and
    g_posRate1 = -g_posRate1;   // reverse direction of change
    }
  else if(g_posNow1 < g_posMin1) {  // or below the min? 
    g_posNow1 = g_posMin1;      // move back up to the min, and
    g_posRate1 = -g_posRate1;   // reverse direction of change.
    }

}

function drawAll() {
//=============================================================================
  // Clear on-screen HTML-5 <canvas> object:
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

var b4Draw = Date.now();
var b4Wait = b4Draw - g_lastMS;
gl.viewport(0, 
  0,													// (x,y) location(in pixels)
  g_canvasID.width, 				// viewport width, height.
  g_canvasID.height);

  var vpAspect = g_canvasID.width /	(g_canvasID.height);

	if(g_show0 == 1) {	// IF user didn't press HTML button to 'hide' VBO0:
	  worldBox.switchToMe();  // Set WebGL to render from this VBObox.
		worldBox.adjust();		  // Send new values for uniforms to the GPU, and
		// worldBox.draw();			  // draw our VBO's contents using our shaders.
  }
  if(g_show1 == 1) { // IF user didn't press HTML button to 'hide' VBO1:
    gouraudBox.switchToMe();  // Set WebGL to render from this VBObox.
  	gouraudBox.adjust();		  // Send new values for uniforms to the GPU, and
  	// gouraudBox.draw();			  // draw our VBO's contents using our shaders.
	  }
	if(g_show2 == 1) { // IF user didn't press HTML button to 'hide' VBO2:
	  phongBox.switchToMe();  // Set WebGL to render from this VBObox.
  	phongBox.adjust();		  // Send new values for uniforms to the GPU, and
  	// phongBox.draw();			  // draw our VBO's contents using our shaders.

  	}
  if(g_show3 == 1) { // IF user didn't press HTML button to 'hide' VBO1:
    sphereBox.switchToMe();  // Set WebGL to render from this VBObox.
    sphereBox.adjust(vpAspect);
    // sphereBox.draw();		  // Send new values for uniforms to the GPU, and
    }
  if(g_show4 == 1) {	// IF user didn't press HTML button to 'hide' VBO0:
    gridBox.switchToMe();  // Set WebGL to render from this VBObox.
    gridBox.adjust(vpAspect);
    gridBox.draw();		  // Send new values for uniforms to the GPU, and
    }
  if(g_show5 == 1) {	// IF user didn't press HTML button to 'hide' VBO0:
    ballBox.switchToMe();  // Set WebGL to render from this VBObox.
    ballBox.adjust(vpAspect,g_light_left_right,g_light_up_down);
    ballBox.draw();		  // Send new values for uniforms to the GPU, and
    }
  if(g_show6 == 1) {	// IF user didn't press HTML button to 'hide' VBO0:
    fishBox.switchToMe();  // Set WebGL to render from this VBObox.
    fishBox.adjust(vpAspect,g_light_left_right,g_light_up_down);
    // fishBox.draw();		  // Send new values for uniforms to the GPU, and
    }
  if(g_show7 == 1) {	// IF user didn't press HTML button to 'hide' VBO0:
    fanBox.switchToMe();  // Set WebGL to render from this VBObox.
    fanBox.adjust(vpAspect,g_light_left_right,g_light_up_down);
    // fishBox.draw();		  // Send new values for uniforms to the GPU, and
    }
  if(g_show8 == 1) {	// IF user didn't press HTML button to 'hide' VBO0:
    torBox.switchToMe();  // Set WebGL to render from this VBObox.
    torBox.adjust(vpAspect,g_show2,g_light_left_right,g_light_up_down);
    // fishBox.draw();		  // Send new values for uniforms to the GPU, and
    }
  

/* // ?How slow is our own code?  	
var aftrDraw = Date.now();
var drawWait = aftrDraw - b4Draw;
console.log("wait b4 draw: ", b4Wait, "drawWait: ", drawWait, "mSec");
*/
}

function setCamera() {
//============================================================================
// PLACEHOLDER:  sets a fixed camera at a fixed position for use by
// ALL VBObox objects.  REPLACE This with your own camera-control code.

	g_worldMat.setIdentity();
	g_worldMat.perspective(30.0,   // FOVY: top-to-bottom vertical image angle, in degrees
  										1.0,   // Image Aspect Ratio: camera lens width/height
                      1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
                      200.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)

  g_worldMat.lookAt( 5.0, 5.0, 3.0,	// center of projection
  								 0.0, 0.0, 0.0,	// look-at point 
  								 0.0, 0.0, 1.0);	// View UP vector.
	// READY to draw in the 'world' coordinate system.
//------------END COPY

}
function lightSwitch() {
  if (lightswitch == 0) {
    lightswitch = 1; 
    worldBox.init(gl);
    gouraudBox.init(gl);
    phongBox.init(gl);
    sphereBox.init(gl);
    gridBox.init(gl);
    ballBox.init(gl);
    fishBox.init(gl);
    fanBox.init(gl);
    torBox.init(gl);
  }
  else if (lightswitch == 1) {
    lightswitch = 0;
    worldBox.init(gl);
    gouraudBox.init(gl);
    phongBox.init(gl);
    sphereBox.init(gl);
    gridBox.init(gl);
    ballBox.init(gl);
    fishBox.init(gl);
    fanBox.init(gl);
    torBox.init(gl);
  }
}
function curLightDisplay() {
  if (lightswitch == 0) {
    document.getElementById('curLight').innerHTML= 
			'Phong Lighting';
  }
  if (lightswitch == 1) {
    document.getElementById('curLight').innerHTML= 
			'Blinn Phong Lighting';
  }
}

function shadeSwitch() {
  if (shadeswitch == 0) {
    shadeswitch = 1; 
    worldBox.init(gl);
    gouraudBox.init(gl);
    phongBox.init(gl);
    sphereBox.init(gl);
    gridBox.init(gl);
    ballBox.init(gl);
    fishBox.init(gl);
    fanBox.init(gl);
    torBox.init(gl);
    }
  else if (shadeswitch == 1) {
    shadeswitch = 0;
    worldBox.init(gl);
    gouraudBox.init(gl);
    phongBox.init(gl);
    sphereBox.init(gl);
    gridBox.init(gl);
    ballBox.init(gl);
    fishBox.init(gl);
    fanBox.init(gl);
    torBox.init(gl);
  }
}

function curShadeDisplay() {
  if (shadeswitch == 0) {
    document.getElementById('curShade').innerHTML= 
      'Gouraud Shading';
  }
  if (shadeswitch == 1) {
    document.getElementById('curShade').innerHTML= 
      'Phong Shading';
  }
}

function matSwitch() {
  //=============================================================================
  // Called when user presses HTML-5 button 'Show/Hide VBO2'.
    if(g_show2 != 1) g_show2 = 1;			// the first material
    else g_show2 = 0;									// the second material
    console.log('g_show2: '+g_show2);
  }

function lightLeft() {
  //=============================================================================
  // Called when user presses HTML-5 button 'Show/Hide VBO2'.
    if(g_light_left_right < 10){
      g_light_left_right += 1;
    }
  }

function lightRight() {
  //=============================================================================
  // Called when user presses HTML-5 button 'Show/Hide VBO2'.
    if(g_light_left_right > -10){
      g_light_left_right -= 1;
    }
  }

// function lightUp() {
//   //=============================================================================
//   // Called when user presses HTML-5 button 'Show/Hide VBO2'.
//     if(g_light_up_down < 10){
//       g_light_up_down += 1;
//     }
//   }

// function lightDown() {
//   //=============================================================================
//   // Called when user presses HTML-5 button 'Show/Hide VBO2'.
//     if(g_light_up_down > -10){
//       g_light_up_down -= 1;
//     }
//   }
  

var tempX = 0
var tempY = 0
var tempZ = 0

function perp() {
  x = lookX - eyeX
  y = lookY - eyeY
  var angle90 = Math.atan2(-x,y)
  tempX = -Math.cos(angle90)
  tempY = -Math.sin(angle90)
}

function par() {
  x = lookX - eyeX
  y = lookY - eyeY
  z = lookZ - eyeZ
  var angle90 = Math.atan2(y,x)
  var angle902 = Math.atan2(z,x)
  tempX = -Math.cos(angle90)
  tempY = -Math.sin(angle90)
  tempZ = Math.sin(angle902)
}
function keys(kev) {
  if (kev.code == "KeyA") {
    perp()
    eyeX = eyeX + tempX*0.33
    eyeY = eyeY + tempY*0.33
    lookX = lookX + tempX*0.33
    lookY = lookY + tempY*0.33
  }
  if (kev.code == "KeyD") {
    perp()
    eyeX = eyeX - tempX*0.33
    eyeY = eyeY - tempY*0.33
    lookX = lookX - tempX*0.33
    lookY = lookY - tempY*0.33
  }
  if (kev.code == "KeyW") {
    par()
    eyeX = eyeX - tempX*0.33
    eyeY = eyeY - tempY*0.33
    eyeZ = eyeZ + tempZ*0.33
    lookX = lookX - tempX*0.33
    lookY = lookY - tempY*0.33
  }
  if (kev.code == "KeyS") {
    par()
    eyeX = eyeX + tempX*0.33
    eyeY = eyeY + tempY*0.33
    eyeZ = eyeZ - tempZ*0.33
    lookX = lookX + tempX*0.33
    lookY = lookY + tempY*0.33
  }
  if (kev.code == "ArrowUp") {
    lookZ = lookZ + 0.33
  }
  if (kev.code == "ArrowLeft") {
    perp()
    lookX = lookX + tempX*0.33
    lookY = lookY + tempY*0.33

  }
  if (kev.code == "ArrowDown") {
    lookZ = lookZ - 0.33

  }
  if (kev.code == "ArrowRight") {
    perp()
    lookX = lookX - tempX*0.33
    lookY = lookY - tempY*0.33
  }
  
}
function myKeyDown(kev) {

  keys(kev)
  //===============================================================================
  // Called when user presses down ANY key on the keyboard;
  //
  // For a light, easy explanation of keyboard events in JavaScript,
  // see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
  // For a thorough explanation of a mess of JavaScript keyboard event handling,
  // see:    http://javascript.info/tutorial/keyboard-events
  //
  // NOTE: Mozilla deprecated the 'keypress' event entirely, and in the
  //        'keydown' event deprecated several read-only properties I used
  //        previously, including kev.charCode, kev.keyCode. 
  //        Revised 2/2019:  use kev.key and kev.code instead.
  //
  // Report EVERYTHING in console:
  console.log(  "--kev.code:",    kev.code,   "\t\t--kev.key:",     kev.key, 
        "\n--kev.ctrlKey:", kev.ctrlKey,  "\t--kev.shiftKey:",kev.shiftKey,
        "\n--kev.altKey:",  kev.altKey,   "\t--kev.metaKey:", kev.metaKey);
  
  // and report EVERYTHING on webpage:
    
    
    switch(kev.code) {
      case "KeyP":
        console.log("Pause/unPause!\n");                // print on console,
      
        if(g_isRun==true) {
        g_isRun = false;    // STOP animation
        }
        else {
        g_isRun = true;     // RESTART animation
        tick();
        }
        break;
      //------------------WASD navigation-----------------
      case "KeyA":
        console.log("a/A key: Strafe LEFT!\n");
        
        break;
        case "KeyD":
        console.log("d/D key: Strafe RIGHT!\n");
        
        break;
      case "KeyS":
        console.log("s/S key: Move BACK!\n");
        
        break;
      case "KeyW":
        console.log("w/W key: Move FWD!\n");
        
        break;
      //----------------Arrow keys------------------------
      case "ArrowLeft": 	
        console.log(' left-arrow.');
        // and print on webpage in the <div> element with id='Result':
      
        break;
      case "ArrowRight":
        console.log('right-arrow.');
      
      break;
      case "ArrowUp":		
        console.log('   up-arrow.');
      
        break;
      case "ArrowDown":
        console.log(' down-arrow.');
      
      break;	
    default:
    console.log("UNUSED!");
      
    break;
    }
  }
    
  function myKeyUp(kev) {
//===============================================================================
// Called when user releases ANY key on the keyboard; captures scancodes well

  console.log('myKeyUp()--keyCode='+kev.keyCode+' released.');
}
  
  
function drawResize() {
  //==============================================================================
  // Called when user re-sizes their browser window , because our HTML file
  // contains:  <body onload="main()" onresize="winResize()">

    //Make canvas fill the top 3/4 of our browser window:
    var xtraMargin = 16;    // keep a margin (otherwise, browser adds scroll-bars)
    g_canvasID.width = innerWidth - xtraMargin;
    g_canvasID.height = (innerHeight*0.7) - xtraMargin;
    // IMPORTANT!  Need a fresh drawing in the re-sized viewports.
    drawAll();   // Draw shapes
  }