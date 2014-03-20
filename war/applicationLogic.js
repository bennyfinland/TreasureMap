
// Variables used by display algorithms
var tabLinks = new Array(); // Array containing links to menu tabs
var contentDivs = new Array(); // Array of element references containing tab content
var canvas; // HTML5 canvas element
var context; // Context of the canvas
var body; // Body elements of the HTML file
var dark = false; // Boolean describing the amount of ambient light
var transformables; // Array containing references to elements that are affected by ambient light

// Variables used by data calculation algorithms
var lastTime = 0; // Last measured time in milliseconds
var thisTime = 0; // Current time in milliseconds
var accelerationx; // Variable holding values for x axis acceleration
var accelerationy; // Variable holding values for y axis acceleration
var velocityx; // Variable holding values for x axis velocity
var velocityy; // Variable holding values for y axis velocity
var positionx = new Array(); // Variable holding values for x axis position
var positiony = new Array(); // Variable holding values for y axis position
var samples = 0; // Current amount of samples read
var samplesNeeded = 6; // Samples taken to calculate an average acceleration
var stopThreshold = 0; // Amount of zero samples needed to decide a stop state
var countx = 0; // Amount of zero samples read on x axis
var county = 0; // Amount of zero samples read on y axis
var calibrationx = 0; // Calibration value of x axis
var calibrationy = 0; // Calibration value of y axis
var calibrating; // Boolean describing if the calibration is in process
var calCount; // Current number of calibration samples
var reqCalCount = 1000; // Number of calibration samples needed
var states = {rdy: "Ready", cal: "Calibrating", run: "Running"}; // Array containing different application states 
var checkStop = true; // Boolean controlling whether a stop check is conducted

window.onload= initTabs;

// Initializes the tab structure and logic used in the UI
function initTabs(){
	
	var tabListItems = document.getElementById('tabs').childNodes;
	for(var i = 0; i<tabListItems.length; i++){
		if(tabListItems[i].nodeName == "LI"){
			var tabLink = getFirstChildWithTagName(tabListItems[i], 'A');
			var id = getHash(tabLink.getAttribute('href'));
			tabLinks[id] = tabLink;
			contentDivs[id] = document.getElementById( id );
		}
	}
	var i = 0;

	for (var id in tabLinks){
		tabLinks[id].onclick = showTab;
		tabLinks[id].onfocus = function() {this.blur()};
		if(i == 0) 
			tabLinks[id].className = 'selected';
		i++;
	}
	var i = 0;

	for (var id in contentDivs){
		if (i != 0) contentDivs[id].className = 'tabContent hide';
		i++;
	}
}
// Use jQuery ready function to make sure the page elements are properly loaded
$(document).ready(initApplication);

function initApplication(){		

	// Initializes variables and prepares the application logic
	window.addEventListener("devicelight", lightListener, false);
	window.addEventListener("deviceorientation", orientationListener, true);
	
	canvas = document.getElementById("canvas");
	context = canvas.getContext("2d");
	var offset; // Offset of the context
	offset = canvas.height;
	context.translate(0, offset);
	context.scale(1,-1);
	contentArea = document.getElementById("contentArea");
	body = document.getElementById("pageContainer");
	
	setLightSensitives();
	
	document.getElementById("statusText").innerHTML = states.rdy;
	resetValues();		
	displayData();
}

// Initializes the array containing elemts that react to ambient light
function setLightSensitives(){
	transformables = new Array("ul", "li", "a.selected", "div.tabContent", "#controlPanel", "#body", "#pageContainer", "#canvas", "#mainHeader");
}

// Function triggered every time a change in ambient light is registered.
// Changes properties of elements that are defined to be light sensitive.
function lightListener(lightEvent){
	
	var currentLux = lightEvent.value; // Contains ambient light sensor data

	if (currentLux > 10) {
		if(dark){
			dark = false;
			toggleDarkness();
			document.body.style.background = "#E6E6E6";
		}
	}else{
		if(!dark){
			toggleDarkness();
			dark = true;
			document.body.style.background = "#070d0d";
		}
	}
}

// Uses jQuery to toggle "dark" class on and off for defined elements
function toggleDarkness(){
	
	for(var i=0; i<transformables.length; i++){
		$(transformables[i]).toggleClass("dark");
	}
}

// Highlights the selected tab in the ui and dims all others.
// Also shows the selected content div and hides all others.
function showTab() {
	var selectedId = getHash( this.getAttribute('href') );

	for ( var id in contentDivs ) {
		if ( id == selectedId ) {
			tabLinks[id].className = 'selected';
			contentDivs[id].className = 'tabContent';
		} else {
			tabLinks[id].className = '';
			contentDivs[id].className = 'tabContent hide';
		}
	}

	// Stop the browser following the link
	return false;
}

// Returns the first child of an element with defined tagname
function getFirstChildWithTagName( element, tagName ) {
	for ( var i = 0; i < element.childNodes.length; i++ ) {
		if ( element.childNodes[i].nodeName == tagName ) return element.childNodes[i];
	}
}

// Returns url string after the '#' character
function getHash( url ) {
	var hashPos = url.lastIndexOf('#');
	return url.substring(hashPos + 1);
}

function orientationListener(oEvent){
	
	document.getElementById("orienta").innerHTML = oEvent.alpha.toFixed(3);
	document.getElementById("orientb").innerHTML = oEvent.beta.toFixed(3);
	document.getElementById("orientg").innerHTML = oEvent.gamma.toFixed(3);
}

// Triggers when accelerometer data is read.
// When triggered for the first time a calibration process is started.
// Reads samples from sensor until desired amount is reached and calculates the position.
function deviceMotionHandler(eventData) {
	
	var acceleration = eventData.acceleration; // Acceleration data read from sensor
	
	if(calibrating == true){
		calibrationx += acceleration.x;
		calibrationy += acceleration.y;
		calCount++;
		if(calCount == reqCalCount){
			calibrating = false;
			calibrationx /= calCount;
			calibrationy /= calCount;
			updateStatus();
		}
	}
	else{
		if(checkStop)
			checkZeroMovement(acceleration.x, acceleration.y);
		
		accelerationx[1] += acceleration.x;
		accelerationy[1] += acceleration.y;

		samples++;

		if(samples == samplesNeeded){
			if(countx < stopThreshold){
				accelerationx[1] = (accelerationx[1] / samplesNeeded) - calibrationx;
				document.getElementById("zerox").innerHTML = "false";
			}
			else{	// x axis is considered to be stationary and variables are changed to zero
				accelerationx[0] = 0;
				accelerationx[1] = 0;
				velocityx[0]=0;
				velocityx[1]=0;
				document.getElementById("zerox").innerHTML = "true";
			}
			if(county < stopThreshold){
				accelerationy[1] = (accelerationy[1] / samplesNeeded) - calibrationy;
				document.getElementById("zeroy").innerHTML = "false";
			}
			else{	// y axis is considered to be stationary and variables are changed to zero
				accelerationy[0] = 0; 
				accelerationy[1] = 0; 
				velocityy[0]=0;
				velocityy[1]=0;
				document.getElementById("zeroy").innerHTML = "true";
			}
			
			calculatePosition();
			checkBorders();
			updatePosition();
			samples = 0;
			countx = 0;
			county = 0;
		}
		displayData();
	}   
}

// Displays sensor and calculations data 
function displayData(){
	document.getElementById("accx").innerHTML = accelerationx[1].toFixed(3);
	document.getElementById("accy").innerHTML = accelerationy[1].toFixed(3); 
	document.getElementById("velox").innerHTML = velocityx[1].toFixed(3);
	document.getElementById("veloy").innerHTML = velocityy[1].toFixed(3);
	
	if(positionx[1] != null && positiony[1] != null){
		document.getElementById("positionx").innerHTML = positionx[1].toFixed(3);
		document.getElementById("positiony").innerHTML = positiony[1].toFixed(3);
	}
}

// Checks if the read sensor data can be considered a zero for either axis
function checkZeroMovement(datax, datay){
	
	var maxThreshold = 0.08;
	var minThreshold = -0.08;
	
	if ((datax < maxThreshold) && (datax > minThreshold)){ 
		countx++;
	}
	else { 
		countx = 0;
	} 

	if ((datay < maxThreshold) && (datay > minThreshold)){
		county++;
	}
	else{
		county = 0;
	} 
}

// Performs a double integration calculation to the accleration to get current position
function calculatePosition(){
	
	var dt = getDeltaTime(); // Time from last calculation
	velocityx[1] = velocityx[0] + (accelerationx[0] + accelerationx[1] / (2 * dt));
	positionx[1] = positionx[0] + (velocityx[0] + velocityx[1] / (2 * dt));
	
	velocityy[1] = velocityy[0] + (accelerationy[0] + accelerationy[1] / (2 * dt));
	positiony[1] = positiony[0] + (velocityy[0] + velocityy[1] / (2 * dt));
	
	storeData();
}

// Returns the amount of time passed since last calculation (in milliseconds)
function getDeltaTime(){
	
	lastTime = thisTime;
	thisTime = (new Date()).getTime();
	var result = thisTime - lastTime;
	return result;
}

// Stores the calculated data
function storeData(){
	//Store acceleration data
	accelerationx[0] = accelerationx[1];
	accelerationy[0] = accelerationy[1];
	
	//Store velocity data
	velocityx[0] = velocityx[1];
	velocityy[0] = velocityy[1];
	
	//Store position data
	positionx[0] = positionx[1];
	positiony[0] = positiony[1];
}

// Checks if the position has reached borders of the canvas and prevents 
// it going any further
function checkBorders(){
	
	if(positionx[1] > canvas.width)
		positionx[1] = canvas.width;
	if(positionx[1] < 0)
		positionx[1] = 0;
	if(positiony[1] > canvas.height)
		positiony[1] = canvas.height
	if(positiony[1] < 0)
		positiony[1] = 0;
}

// Draws a circle on the canvas in the point defined by position variables.
function updatePosition(){
	
	// If tracing is enabled in the options menu, the previous positions of the circle
	// are left to the screen.
	if(document.getElementById("traceBox").checked == false)
		context.clearRect(0, 0, canvas.width, canvas.height);
		
	context.beginPath();
	context.arc(positionx[1],positiony[1],5,0,2*Math.PI);
	
	// Circle color reacts to ambient light
	if(dark == true)
		context.fillStyle="white";
	else
		context.fillStyle="black";
	
	context.fill();	
}

// Checks if the stop state filter is enabled in the options menu
function changeStopStatus(){
	
	if(document.getElementById("stopBox").checked)
		checkStop = true;
	else
		checkStop = false;
}

// Checks if the calibration procedure is enabled in the options menu
function changeCalibrationStatus(){
	
	if(document.getElementById("calibrationBox").checked)
		calibrating = true;
	else
		calibrating = false;
}

// Displays the state of the application
function updateStatus(){
	if(calibrating == true)
		document.getElementById("statusText").innerHTML = states.cal;		
	else
		document.getElementById("statusText").innerHTML = states.run;		
}

// Starts the application by registering a movement listener which gets triggered
// by change in sensor data. 
function start(){
	
	if(document.getElementById("statusText").innerHTML != states.run){
		changeCalibrationStatus();
		updateStatus();	
		window.addEventListener('devicemotion', deviceMotionHandler, false);
	}else
		alert("Application is already running");
}

// Class the value reseting functin
function reset(){
	window.removeEventListener('devicemotion', deviceMotionHandler, false);
	resetValues();
	document.getElementById("statusText").innerHTML = states.rdy;
}

// Sets all data variables into their initial state
function resetValues(){
	
	accelerationx = new Array(0,0);
	accelerationy = new Array(0,0);
	velocityx = new Array(0,0);
	velocityy = new Array(0,0);
	positionx[0] = canvas.width / 2;
	positiony[0] = canvas.height / 2;
	context.clearRect(0, 0, canvas.width, canvas.height);	
	calibrating = document.getElementById("calibrationBox").checked;
	calCount = 0;
	
	if(samplesNeeded >= 3)
		stopThreshold = samplesNeeded / 3;
	else
		stopThreshold = 1;	
}

