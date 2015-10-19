'use strict';


var zero_vec3 = new THREE.Vector3(0.0,0.0,0.0);
var normal_x_vec3 = new THREE.Vector3(1,0,0);
var normal_y_vec3 = new THREE.Vector3(0,1,0);
var normal_z_vec3 = new THREE.Vector3(0,0,1);

var rayCasterManager = new RayCasterManager();

var rayMaterial = new  THREE.LineBasicMaterial({

	color:0xff0000,
})

var rayDistance = 99;

var edgeColor = 0x000000;
var edgeColorHit = 0xff0000;

var fps = 30;


var stats = new Stats();
stats.setMode(0);

stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';

document.body.appendChild( stats.domElement );



/*

Initialize UI

*/


function HandStatsContents(){

	this.handType = '';
	this.indexFinger = '';
	this.indexDirection = '';


}



var uiContent = new HandStatsContents();

var gui = new dat.GUI();
gui.add(uiContent, 'handType').listen();
gui.add(uiContent, 'indexFinger').listen();
gui.add(uiContent, 'indexDirection').listen();



/*

Initialize Scene, Camera, Renderer, Controls & Physics.

*/

//var clock =new THREE.Clock();
window.scene = new THREE.Scene();


window.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
window.camera.position.set(5,1,1.75);
window.camera.up.set(0,0,1);
window.camera.lookAt(zero_vec3);


scene.add(camera);

window.renderer = new THREE.WebGLRenderer({
	alpha: true,
	antialias: false,
	preserveDrawingBuffer: true,
})

window.renderer.setClearColor(0x7ec0EE,0.8);
window.renderer.setSize(window.innerWidth, window.innerHeight);
window.renderer.setViewport(0,0,window.innerWidth,window.innerHeight);
document.body.appendChild(window.renderer.domElement);
//




/*
--------------------------------------------
Controls
--------------------------------------------
*/


window.controller = new Leap.Controller({frameEventName: 'animationFrame'});

window.controls = new THREE.TrackballControls(window.camera, window.renderer.domElement);


/*
-------------------------
Initialize Light effects.
-------------------------

*/
var ambientLight = new THREE.AmbientLight(0x666666);
var pointLight = new THREE.PointLight(0xffffff,1,1000);
pointLight.position.set(0,0,200);
window.scene.add(pointLight);
window.scene.add(ambientLight);


/*
----------------
Intialize 3D Objects and the corresponding physics
-----------------
*/


var timeStep= 1/60;
var physicScene =  new PhysicScene();
physicScene.scene = window.scene;

var groundShape = new CANNON.Plane();
var groundBody = new CANNON.Body({ mass: 0, shape: groundShape});
var groundGeometry = new THREE.BoxGeometry(100,100,2);
var groundMaterial = new THREE.MeshNormalMaterial();
var groundMesh 	= new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.position.set(0,0,-2);

var ground = new MeshBody(groundMesh,groundBody, {rayCastable: false, syncable : false, collidable: false });
physicScene.addObject(ground);

var groundGrid = new THREE.GridHelper(1000,1);
groundGrid.rotation.x = Math.PI/2;
window.scene.add(groundGrid);

//initialize axis
var axis = new THREE.AxisHelper(1000);
window.scene.add(axis);

physicScene.setGravity(0,0,-9.8);

var cube = new BoxMeshBody({ x:0.5, y:0.5, z:0.5, material: new THREE.MeshBasicMaterial(0xff0000) }, 
						   { mass: 2 } , {});


cube.setPosition(0,0,2);
cube.body.angularVelocity.set(0,10,0);
cube.mesh.edges = new THREE.EdgesHelper(cube.mesh,edgeColor);
scene.add(cube.mesh.edges);

var cube2 =  new BoxMeshBody({ x:0.5, y:0.5, z:1, material: new THREE.MeshBasicMaterial(0xff3500) }, 
						   { mass: 3 }, {}
						   );

cube2.body.angularVelocity.set(0,10,0);
cube2.setPosition(0,0,4);
cube2.mesh.edges = new THREE.EdgesHelper(cube2.mesh,edgeColor);
scene.add(cube2.mesh.edges);

physicScene.addObject(cube);


physicScene.addObject(cube2);



window.addEventListener('resize',function(e){

 	  window.camera.aspect = window.innerWidth / window.innerHeight;
      window.camera.updateProjectionMatrix();
      window.renderer.setSize(window.innerWidth, window.innerHeight);
      window.renderer.render(scene, camera);

});



controller.use('handHold');
controller.use('transform',{

	effectiveParent: window.camera,
	quaternion: new THREE.Quaternion,
	position: new THREE.Vector3(0,-.5,-1.5),
	scale: 0.003,

});

controller.use('handEntry').use('screenPosition');
controller.use('riggedHand',{

	parent: window.scene,
	renderer: window.renderer,
	camera: window.camera,
	renderFn: function(){

		
		
	}

})


controller.use('boneHand',{

	scene:window.scene,
	renderer:window.renderer,
	camera:window.camera,
	arm:true,


});


var rays=[];



controller.on('riggedHand.meshAdded', function(handMesh,leapHand){

handMesh.material.opacity = 0.5;

});


controller.on('riggedHand.meshRemoved',function(handMesh,leapHand){

	
});



controller.on('frame',function (frame){

	//stats.begin();

	scene.updateMatrixWorld();
	
	rayCasterManager.removeAllRays(window.scene);

	for (var i = 0; i < frame.hands.length; i++){

		var hand = frame.hands[i];
		
		
		uiContent.handType = hand.type;
		uiContent.indexFinger=roundArray(hand.indexFinger.tipPosition);
		uiContent.indexDirection=roundArray(hand.indexFinger.direction);

		rayCasterManager.createRayCasterByFinger(hand.type+i+'index', hand.indexFinger, rayDistance, rayMaterial, window.scene);
		

	}

	var meshBodies = physicScene.getMeshBodies({rayCastable: true, syncable: true, collidable: true});


	for (var i = 0 ; i < meshBodies.length ; i++){

		var meshBody = meshBodies[i];

		var isHit = false;

		//console.log(meshBody.mesh);
		scene.remove(meshBody.mesh.edges);

		meshBody.mesh.edges = new THREE.EdgesHelper(meshBody.mesh,edgeColor);

		scene.add(meshBody.mesh.edges);

		for ( var rayName in rayCasterManager.rays){
			

			var ray_caster = rayCasterManager.rays[rayName];
			var intersect = ray_caster.intersectObject(meshBody.mesh)[0];
			

			if (intersect){
				//console.log(intersect);
				isHit = true ;

			} 

		}

		if(isHit == true ){

			

			scene.remove(meshBody.mesh.edges);
			//meshBody.mesh.material.color.set(0x000000) 
			meshBody.mesh.edges = new THREE.EdgesHelper(meshBody.mesh,edgeColorHit);

			
			meshBody.body.velocity.set(0,0,1);
			scene.add(meshBody.mesh.edges);
			
		}


	}

	
	//stats.end();
	
	

});


controller.connect();


function render(){

	stats.begin();
	requestAnimationFrame(render);

	physicScene.simulate(window.renderer,window.camera,1/fps);
	window.renderer.render(window.scene,window.camera);
	window.controls.update(1/fps);

	stats.end();


}

render();











