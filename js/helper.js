
/*

---------------------------------------------------------

Helper class developped by Zhongshi Xi

Dependencies : three.js , cannon.js


-----------------------------------------------------------

*/



function isInArray(array, object){

 if (array.indexOf(object)>=0) return true;

 	return false;

}

function isInDict(dict_array,key){

	if (dict_array[key] !== undefined) return true;

	return false;

}

function addToArrayNoDup(array,object){

	if (!isInArray(array, object)){

		array.push(object);

	}

}

function removeFromArrayNoDup(array,object){

	if (isInArray(array,object)){

		array.splice(array.indexof(object),1);

	}

}


//Round all float numbers in an array.
function roundArray(float_array,round_to){

	var round =function (array,round_num){

		if(!round_num) var round_num = 2;

		for (var i= 0; i<array.length; i++ ){

			array[i] =  array[i].toFixed(round_num);

		}
	}


	var newArray = float_array.slice();

	round(newArray,round_to);

	//console.log(newArray);

	return newArray;

}


//Rotate a THREE.Object3D locally around an axis.
function rotateLocal(obj3D,axis,degree){

    var rotateMatrix = new THREE.Matrix4();

    rotateMatrix.makeRotationAxis(axis.normalize(),degree*Math.PI/180);

    obj3D.matrix.multiply(rotateMatrix);

    obj3D.rotation.setFromRotationMatrix(obj3D.matrix);


}




function createRayMesh(origin,direction,distance,material){

	var d= direction.clone();

	d.multiplyScalar(distance);

	var geometry = new THREE.Geometry();

	geometry.vertices.push(origin,d);

	return new THREE.Line(geometry,material);

}


function createRayByFinger(rayCaster,finger,distance,material){

	var dip_pos = new THREE.Vector3().fromArray(finger.dipPosition);
	var dip_dir = new THREE.Vector3().fromArray(finger.direction);

	rayCaster.set(dip_pos, dip_dir);

	return createRayMesh(dip_pos, dip_dir, distance, material);

}


//Manager to manage THREE.Raycaster objects and its visual representation.
function RayCasterManager(){

	this.rays = {};

}

RayCasterManager.prototype.addRayCaster = function (rayName){


	var rayCaster = this.rays[rayName];

	if (!rayCaster){

		var rayCaster = new THREE.Raycaster();

		this.rays[rayName] = rayCaster;

		rayCaster.mesh = null ;
	}

	return rayCaster;

}

RayCasterManager.prototype.createRayCasterByFinger = function (rayName, finger, distance, material, scene){


	var rayCaster = this.addRayCaster(rayName);

	if (scene) scene.remove(rayCaster.mesh);


	var tip_pos = new THREE.Vector3().fromArray(finger.tipPosition);
	var tip_dir = new THREE.Vector3().fromArray(finger.direction);


	rayCaster.set(tip_pos, tip_dir);

	rayCaster.mesh = createRayMesh(tip_pos,tip_dir.normalize(),distance,material);

	if (scene) scene.add(rayCaster.mesh);




}


RayCasterManager.prototype.removeRayCasterMesh = function (rayName, scene){

	var ray = this.rays[rayName];

	if (ray){

		if (scene && ray.mesh) scene.remove(ray.mesh);

		ray.mesh = null;

	}

}

RayCasterManager.prototype.removeAllRayCasterMesh = function(rayName, scene){



}

RayCasterManager.prototype.removeRay = function (rayName, scene){

	var ray = this.rays[rayName];

	if (ray){

		if (scene && ray.mesh) scene.remove(ray.mesh);

		ray.mesh = null;

		delete this.rays[rayName];

	}

}

RayCasterManager.prototype.removeAllRays = function (scene){

	for (var key in this.rays){

		this.removeRay(key,scene);

	}

}



//Customized wrapper to associate a THREE.Mesh with a CANNON.Body.
function MeshBody(mesh, body, options){

	this.mesh = mesh;
	this.body = body;
	this.edges = null;

	console.log(this.mesh);
	

	if (options.collidable === undefined ) this.collidable = true;

	if (options.syncable === undefined ) this.syncable = true;

	if (options.rayCastable === undefined ) this.rayCastable = true;


	
	this.sync();
}

MeshBody.prototype.constructor = MeshBody;

MeshBody.prototype.sync = function (){

	if (this.syncable){

		if (this.collidable){

			this.mesh.position.copy(this.body.position);
			this.mesh.quaternion.copy(this.body.quaternion);

		}else{

			this.body.position.copy(this.mesh.position);
	    	this.body.quaternion.copy(this.mesh.quaternion);
		}
	}

}

MeshBody.prototype.setPosition = function (x,y,z){

	this.mesh.position.set(x,y,z);
	this.body.position.set(x,y,z);

}


//Cube Mesh and Body
function BoxMeshBody(meshOptions,bodyOptions,otherOptions){

	var len_x = meshOptions.x;
	var len_y = meshOptions.y;
	var len_z = meshOptions.z;
	var material = meshOptions.material;

	
	
	var geo = new THREE.BoxGeometry(len_x,len_y,len_z);
	var mesh = new THREE.Mesh(geo,material);
	
	

	var shape = new CANNON.Box( new CANNON.Vec3( len_x/2, len_y/2, len_z/2) );
	var body = new CANNON.Body(bodyOptions);


	body.addShape(shape);


	MeshBody.call(this,mesh,body,otherOptions);


}

BoxMeshBody.prototype = Object.create(MeshBody.prototype);
BoxMeshBody.prototype.constructor = BoxMeshBody;


//A scene that associates CANNON.World and THREE.Scene.
function PhysicScene(world,scene){

	this.meshBodies = [];

	if (!world){

		this.world = new CANNON.World();
		this.world.broadphase = new CANNON.NaiveBroadphase();
		this.world.solver.iterations = 10;
		

	}else{

		this.world = world;
	}

	if (!scene){
		this.scene = new THREE.Scene();
		
	}else{
		this.scene = scene;
	}

	
}

PhysicScene.prototype.setGravity = function (x,y,z){

	this.world.gravity.set(x,y,z);

}


PhysicScene.prototype.addObject = function (meshBody){


	if (!isInArray(this.meshBodies,meshBody)){

		this.meshBodies.push(meshBody);

		this.world.addBody(meshBody.body);

		this.scene.add(meshBody.mesh);

	}



}

PhysicScene.prototype.removeObject = function(meshBody){


	if (isInArray(this.meshBodies,meshBody)){

		this.world.removeBody(meshBody.body);
		this.scene.remove(meshBody.mesh);
	}

}


PhysicScene.prototype.getMeshBodies = function(filterOptions){

	var meshBodyArray = [];

	//console.log(this.meshBodies);

	for (var i = 0 ; i < this.meshBodies.length ;i++){

		var mesh_body = this.meshBodies[i];

		if (mesh_body.rayCastable === filterOptions.rayCastable) addToArrayNoDup(meshBodyArray,mesh_body);

		if (mesh_body.syncable === filterOptions.syncable) addToArrayNoDup(meshBodyArray,mesh_body);

		if (mesh_body.collidable === filterOptions.collidable) addToArrayNoDup(meshBodyArray, mesh_body);
		
	}

	return meshBodyArray;

}


PhysicScene.prototype.simulate = function (renderer,camera,delta){

	this.world.step(delta);

	for (var i = 0 ; i < this.meshBodies.length ;i++){

		this.meshBodies[i].sync();

	}

	renderer.render(this.scene,camera);

}







