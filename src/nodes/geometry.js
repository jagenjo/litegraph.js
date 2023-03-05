(function(global) {
    var LiteGraph = global.LiteGraph;

	var view_matrix = new Float32Array(16);
	var projection_matrix = new Float32Array(16);
	var viewprojection_matrix = new Float32Array(16);
	var model_matrix = new Float32Array(16);
	var global_uniforms = {
		u_view: view_matrix,
		u_projection: projection_matrix,
		u_viewprojection: viewprojection_matrix,
		u_model: model_matrix 
	};

	LiteGraph.LGraphRender = {
		onRequestCameraMatrices: null //overwrite with your 3D engine specifics, it will receive (view_matrix, projection_matrix,viewprojection_matrix) and must be filled
	};

	function generateGeometryId() {
		return (Math.random() * 100000)|0;
	}

	function LGraphPoints3D() {

		this.addInput("obj", "");
		this.addInput("radius", "number");

		this.addOutput("out", "geometry");
		this.addOutput("points", "[vec3]");
		this.properties = {
			radius: 1,
			num_points: 4096,
			generate_normals: true,
			regular: false,
			mode: LGraphPoints3D.SPHERE,
			force_update: false
		};

		this.points = new Float32Array( this.properties.num_points * 3 );
		this.normals = new Float32Array( this.properties.num_points * 3 );
		this.must_update = true;
		this.version = 0;

		var that = this;
		this.addWidget("button","update",null, function(){ that.must_update = true; });

		this.geometry = {
			vertices: null,
			_id: generateGeometryId()
		}

		this._old_obj = null;
		this._last_radius = null;
	}

	global.LGraphPoints3D = LGraphPoints3D;

	LGraphPoints3D.RECTANGLE = 1;
	LGraphPoints3D.CIRCLE = 2;

	LGraphPoints3D.CUBE = 10;
	LGraphPoints3D.SPHERE = 11;
	LGraphPoints3D.HEMISPHERE = 12;
	LGraphPoints3D.INSIDE_SPHERE = 13;

	LGraphPoints3D.OBJECT = 20;
	LGraphPoints3D.OBJECT_UNIFORMLY = 21;
	LGraphPoints3D.OBJECT_INSIDE = 22;

	LGraphPoints3D.MODE_VALUES = { "rectangle":LGraphPoints3D.RECTANGLE, "circle":LGraphPoints3D.CIRCLE, "cube":LGraphPoints3D.CUBE, "sphere":LGraphPoints3D.SPHERE, "hemisphere":LGraphPoints3D.HEMISPHERE, "inside_sphere":LGraphPoints3D.INSIDE_SPHERE, "object":LGraphPoints3D.OBJECT, "object_uniformly":LGraphPoints3D.OBJECT_UNIFORMLY, "object_inside":LGraphPoints3D.OBJECT_INSIDE };

	LGraphPoints3D.widgets_info = {
		mode: { widget: "combo", values: LGraphPoints3D.MODE_VALUES }
	};

	LGraphPoints3D.title = "list of points";
	LGraphPoints3D.desc = "returns an array of points";

	LGraphPoints3D.prototype.onPropertyChanged = function(name,value)
	{
		this.must_update = true;
	}

	LGraphPoints3D.prototype.onExecute = function() {

		var obj = this.getInputData(0);
		if( obj != this._old_obj || (obj && obj._version != this._old_obj_version) )
		{
			this._old_obj = obj;
			this.must_update = true;
		}

		var radius = this.getInputData(1);
		if(radius == null)
			radius = this.properties.radius;
		if( this._last_radius != radius )
		{
			this._last_radius = radius;
			this.must_update = true;
		}

		if(this.must_update || this.properties.force_update )
		{
			this.must_update = false;
			this.updatePoints();
		}

		this.geometry.vertices = this.points;
		this.geometry.normals = this.normals;
		this.geometry._version = this.version;

		this.setOutputData( 0, this.geometry );
	}

	LGraphPoints3D.prototype.updatePoints = function() {
		var num_points = this.properties.num_points|0;
		if(num_points < 1)
			num_points = 1;

		if(!this.points || this.points.length != num_points * 3)
			this.points = new Float32Array( num_points * 3 );

		if(this.properties.generate_normals)
		{
			if (!this.normals || this.normals.length != this.points.length)
				this.normals = new Float32Array( this.points.length );
		}
		else
			this.normals = null;

		var radius = this._last_radius || this.properties.radius;
		var mode = this.properties.mode;

		var obj = this.getInputData(0);
		this._old_obj_version = obj ? obj._version : null;

		this.points = LGraphPoints3D.generatePoints( radius, num_points, mode, this.points, this.normals, this.properties.regular, obj );

		this.version++;
	}

	//global
	LGraphPoints3D.generatePoints = function( radius, num_points, mode, points, normals, regular, obj )
	{
		var size = num_points * 3;
		if(!points || points.length != size)
			points = new Float32Array( size );
		var temp = new Float32Array(3);
		var UP = new Float32Array([0,1,0]);

		if(regular)
		{
			if( mode == LGraphPoints3D.RECTANGLE)
			{
				var side = Math.floor(Math.sqrt(num_points));
				for(var i = 0; i < side; ++i)
				for(var j = 0; j < side; ++j)
				{
					var pos = i*3 + j*3*side;
					points[pos] = ((i/side) - 0.5) * radius * 2;
					points[pos+1] = 0;
					points[pos+2] = ((j/side) - 0.5) * radius * 2;
				}
				points = new Float32Array( points.subarray(0,side*side*3) );
				if(normals)
				{
					for(var i = 0; i < normals.length; i+=3)
						normals.set(UP, i);
				}
			}
			else if( mode == LGraphPoints3D.SPHERE)
			{
				var side = Math.floor(Math.sqrt(num_points));
				for(var i = 0; i < side; ++i)
				for(var j = 0; j < side; ++j)
				{
					var pos = i*3 + j*3*side;
					polarToCartesian( temp, (i/side) * 2 * Math.PI, ((j/side) - 0.5) * 2 * Math.PI, radius );
					points[pos] = temp[0];
					points[pos+1] = temp[1];
					points[pos+2] = temp[2];
				}
				points = new Float32Array( points.subarray(0,side*side*3) );
				if(normals)
					LGraphPoints3D.generateSphericalNormals( points, normals );
			}
			else if( mode == LGraphPoints3D.CIRCLE)
			{
				for(var i = 0; i < size; i+=3)
				{
					var angle = 2 * Math.PI * (i/size);
					points[i] = Math.cos( angle ) * radius;
					points[i+1] = 0;
					points[i+2] = Math.sin( angle ) * radius;
				}
				if(normals)
				{
					for(var i = 0; i < normals.length; i+=3)
						normals.set(UP, i);
				}
			}
		}
		else //non regular
		{
			if( mode == LGraphPoints3D.RECTANGLE)
			{
				for(var i = 0; i < size; i+=3)
				{
					points[i] = (Math.random() - 0.5) * radius * 2;
					points[i+1] = 0;
					points[i+2] = (Math.random() - 0.5) * radius * 2;
				}
				if(normals)
				{
					for(var i = 0; i < normals.length; i+=3)
						normals.set(UP, i);
				}
			}
			else if( mode == LGraphPoints3D.CUBE)
			{
				for(var i = 0; i < size; i+=3)
				{
					points[i] = (Math.random() - 0.5) * radius * 2;
					points[i+1] = (Math.random() - 0.5) * radius * 2;
					points[i+2] = (Math.random() - 0.5) * radius * 2;
				}
				if(normals)
				{
					for(var i = 0; i < normals.length; i+=3)
						normals.set(UP, i);
				}
			}
			else if( mode == LGraphPoints3D.SPHERE)
			{
				LGraphPoints3D.generateSphere( points, size, radius );
				if(normals)
					LGraphPoints3D.generateSphericalNormals( points, normals );
			}
			else if( mode == LGraphPoints3D.HEMISPHERE)
			{
				LGraphPoints3D.generateHemisphere( points, size, radius );
				if(normals)
					LGraphPoints3D.generateSphericalNormals( points, normals );
			}
			else if( mode == LGraphPoints3D.CIRCLE)
			{
				LGraphPoints3D.generateInsideCircle( points, size, radius );
				if(normals)
					LGraphPoints3D.generateSphericalNormals( points, normals );
			}
			else if( mode == LGraphPoints3D.INSIDE_SPHERE)
			{
				LGraphPoints3D.generateInsideSphere( points, size, radius );
				if(normals)
					LGraphPoints3D.generateSphericalNormals( points, normals );
			}
			else if( mode == LGraphPoints3D.OBJECT)
			{
				LGraphPoints3D.generateFromObject( points, normals, size, obj, false );
			}
			else if( mode == LGraphPoints3D.OBJECT_UNIFORMLY)
			{
				LGraphPoints3D.generateFromObject( points, normals, size, obj, true );
			}
			else if( mode == LGraphPoints3D.OBJECT_INSIDE)
			{
				LGraphPoints3D.generateFromInsideObject( points, size, obj );
				//if(normals)
				//	LGraphPoints3D.generateSphericalNormals( points, normals );
			}
			else
				console.warn("wrong mode in LGraphPoints3D");
		}

		return points;
	}

	LGraphPoints3D.generateSphericalNormals = function(points, normals)
	{
		var temp = new Float32Array(3);
		for(var i = 0; i < normals.length; i+=3)
		{
			temp[0] = points[i];
			temp[1] = points[i+1];
			temp[2] = points[i+2];
			vec3.normalize(temp,temp);
			normals.set(temp,i);
		}
	}

	LGraphPoints3D.generateSphere = function (points, size, radius)
	{
		for(var i = 0; i < size; i+=3)
		{
			var r1 = Math.random();
			var r2 = Math.random();
			var x = 2 * Math.cos( 2 * Math.PI * r1 ) * Math.sqrt( r2 * (1-r2) );
			var y = 1 - 2 * r2;
			var z = 2 * Math.sin( 2 * Math.PI * r1 ) * Math.sqrt( r2 * (1-r2) );
			points[i] = x * radius;
			points[i+1] = y * radius;
			points[i+2] = z * radius;
		}			
	}

	LGraphPoints3D.generateHemisphere = function (points, size, radius)
	{
		for(var i = 0; i < size; i+=3)
		{
			var r1 = Math.random();
			var r2 = Math.random();
			var x = Math.cos( 2 * Math.PI * r1 ) * Math.sqrt(1 - r2*r2 );
			var y = r2;
			var z = Math.sin( 2 * Math.PI * r1 ) * Math.sqrt(1 - r2*r2 );
			points[i] = x * radius;
			points[i+1] = y * radius;
			points[i+2] = z * radius;
		}
	}

	LGraphPoints3D.generateInsideCircle = function (points, size, radius)
	{
		for(var i = 0; i < size; i+=3)
		{
			var r1 = Math.random();
			var r2 = Math.random();
			var x = Math.cos( 2 * Math.PI * r1 ) * Math.sqrt(1 - r2*r2 );
			var y = r2;
			var z = Math.sin( 2 * Math.PI * r1 ) * Math.sqrt(1 - r2*r2 );
			points[i] = x * radius;
			points[i+1] = 0;
			points[i+2] = z * radius;
		}
	}

	LGraphPoints3D.generateInsideSphere = function (points, size, radius)
	{
		for(var i = 0; i < size; i+=3)
		{
			var u = Math.random();
			var v = Math.random();
			var theta = u * 2.0 * Math.PI;
			var phi = Math.acos(2.0 * v - 1.0);
			var r = Math.cbrt(Math.random()) * radius;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);
			points[i] = r * sinPhi * cosTheta;
			points[i+1] = r * sinPhi * sinTheta;
			points[i+2] = r * cosPhi;
		}	
	}

	function findRandomTriangle( areas, f )
	{
		var l = areas.length;
		var imin = 0;
		var imid = 0;
		var imax = l;

		if(l == 0)
			return -1;
		if(l == 1)
			return 0;
		//dichotomic search
		while (imax >= imin)
		{
			imid = ((imax + imin)*0.5)|0;
			var t = areas[ imid ];
			if( t == f )
				return imid; 
			if( imin == (imax - 1) )
				return imin;
			if (t < f)
				imin = imid;
			else         
				imax = imid;
		}
		return imid;		
	}

	LGraphPoints3D.generateFromObject = function( points, normals, size, obj, evenly )
	{
		if(!obj)
			return;

		var vertices = null;
		var mesh_normals = null;
		var indices = null;
		var areas = null;
		if( obj.constructor === GL.Mesh )
		{
			vertices = obj.vertexBuffers.vertices.data;
			mesh_normals = obj.vertexBuffers.normals ? obj.vertexBuffers.normals.data : null;
			indices = obj.indexBuffers.indices ? obj.indexBuffers.indices.data : null;
			if(!indices)
				indices = obj.indexBuffers.triangles ? obj.indexBuffers.triangles.data : null;
		}
		if(!vertices)
			return null;
		var num_triangles = indices ? indices.length / 3 : vertices.length / (3*3);
		var total_area = 0; //sum of areas of all triangles

		if(evenly)
		{
			areas = new Float32Array(num_triangles); //accum
			for(var i = 0; i < num_triangles; ++i)
			{
				if(indices)
				{
					a = indices[i*3]*3;
					b = indices[i*3+1]*3;
					c = indices[i*3+2]*3;
				}
				else
				{
					a = i*9;
					b = i*9+3;
					c = i*9+6;
				}
				var P1 = vertices.subarray(a,a+3);
				var P2 = vertices.subarray(b,b+3);
				var P3 = vertices.subarray(c,c+3);
				var aL = vec3.distance( P1, P2 );
				var bL = vec3.distance( P2, P3 );
				var cL = vec3.distance( P3, P1 );
				var s = (aL + bL+ cL) / 2;
				total_area += Math.sqrt(s * (s - aL) * (s - bL) * (s - cL));
				areas[i] = total_area;
			}			
			for(var i = 0; i < num_triangles; ++i) //normalize
				areas[i] /= total_area;
		}

		for(var i = 0; i < size; i+=3)
		{
			var r = Math.random();
			var index = evenly ? findRandomTriangle( areas, r ) : Math.floor(r * num_triangles );
			//get random triangle
			var a = 0;
			var b = 0;
			var c = 0;
			if(indices)
			{
				a = indices[index*3]*3;
				b = indices[index*3+1]*3;
				c = indices[index*3+2]*3;
			}
			else
			{
				a = index*9;
				b = index*9+3;
				c = index*9+6;
			}
			var s = Math.random();
			var t = Math.random();
			var sqrt_s = Math.sqrt(s);
			var af = 1 - sqrt_s;
			var bf = sqrt_s * ( 1 - t);
			var cf = t * sqrt_s;
			points[i] = af * vertices[a] + bf*vertices[b] + cf*vertices[c];
			points[i+1] = af * vertices[a+1] + bf*vertices[b+1] + cf*vertices[c+1];
			points[i+2] = af * vertices[a+2] + bf*vertices[b+2] + cf*vertices[c+2];
			if(normals && mesh_normals)
			{
				normals[i] = af * mesh_normals[a] + bf*mesh_normals[b] + cf*mesh_normals[c];
				normals[i+1] = af * mesh_normals[a+1] + bf*mesh_normals[b+1] + cf*mesh_normals[c+1];
				normals[i+2] = af * mesh_normals[a+2] + bf*mesh_normals[b+2] + cf*mesh_normals[c+2];
				var N = normals.subarray(i,i+3);
				vec3.normalize(N,N);
			}
		}
	}

	LGraphPoints3D.generateFromInsideObject = function( points, size, mesh )
	{
		if(!mesh || mesh.constructor !== GL.Mesh)
			return;

		var aabb = mesh.getBoundingBox();
		if(!mesh.octree)
			mesh.octree = new GL.Octree( mesh );
		var octree = mesh.octree;
		var origin = vec3.create();
		var direction = vec3.fromValues(1,0,0);
		var temp = vec3.create();
		var i = 0;
		var tries = 0;
		while(i < size && tries < points.length * 10) //limit to avoid problems
		{
			tries += 1
			var r = vec3.random(temp); //random point inside the aabb
			r[0] = (r[0] * 2 - 1) * aabb[3] + aabb[0];
			r[1] = (r[1] * 2 - 1) * aabb[4] + aabb[1];
			r[2] = (r[2] * 2 - 1) * aabb[5] + aabb[2];
			origin.set(r);
			var hit = octree.testRay( origin, direction, 0, 10000, true, GL.Octree.ALL );
			if(!hit || hit.length % 2 == 0) //not inside
				continue;
			points.set( r, i );
			i+=3;
		}
	}

	LiteGraph.registerNodeType( "geometry/points3D", LGraphPoints3D );



	function LGraphPointsToInstances() {
		this.addInput("points", "geometry");
		this.addOutput("instances", "[mat4]");
		this.properties = {
			mode: 1,
			autoupdate: true
		};

		this.must_update = true;
		this.matrices = [];
		this.first_time = true;
	}

	LGraphPointsToInstances.NORMAL = 0;
	LGraphPointsToInstances.VERTICAL = 1;
	LGraphPointsToInstances.SPHERICAL = 2;
	LGraphPointsToInstances.RANDOM = 3;
	LGraphPointsToInstances.RANDOM_VERTICAL = 4;

	LGraphPointsToInstances.modes = {"normal":0,"vertical":1,"spherical":2,"random":3,"random_vertical":4};
	LGraphPointsToInstances.widgets_info = {
		mode: { widget: "combo", values: LGraphPointsToInstances.modes }
	};

	LGraphPointsToInstances.title = "points to inst";

	LGraphPointsToInstances.prototype.onExecute = function()
	{
		var geo = this.getInputData(0);
		if( !geo )
		{
			this.setOutputData(0,null);
			return;
		}

		if( !this.isOutputConnected(0) )
			return;

		var has_changed = (geo._version != this._version || geo._id != this._geometry_id);

		if( has_changed && this.properties.autoupdate || this.first_time )
		{
			this.first_time = false;
			this.updateInstances( geo );
		}

		this.setOutputData( 0, this.matrices );
	}

	LGraphPointsToInstances.prototype.updateInstances = function( geometry )
	{
		var vertices = geometry.vertices;
		if(!vertices)
			return null;
		var normals = geometry.normals;

		var matrices = this.matrices;
		var num_points = vertices.length / 3;
		if( matrices.length != num_points)
			matrices.length = num_points;
		var identity = mat4.create();
		var temp = vec3.create();
		var zero = vec3.create();
		var UP = vec3.fromValues(0,1,0);
		var FRONT = vec3.fromValues(0,0,-1);
		var RIGHT = vec3.fromValues(1,0,0);
		var R = quat.create();

		var front = vec3.create();
		var right = vec3.create();
		var top = vec3.create();

		for(var i = 0; i < vertices.length; i += 3)
		{
			var index = i/3;
			var m = matrices[index];
			if(!m)
				m = matrices[index] = mat4.create();
			m.set( identity );
			var point = vertices.subarray(i,i+3);

			switch(this.properties.mode)
			{
				case LGraphPointsToInstances.NORMAL: 
					mat4.setTranslation( m, point );
					if(normals)
					{
						var normal = normals.subarray(i,i+3);
						top.set( normal );
						vec3.normalize( top, top );
						vec3.cross( right, FRONT, top );
						vec3.normalize( right, right );
						vec3.cross( front, right, top );
						vec3.normalize( front, front );
						m.set(right,0);
						m.set(top,4);
						m.set(front,8);
						mat4.setTranslation( m, point );
					}
					break;
				case LGraphPointsToInstances.VERTICAL: 
					mat4.setTranslation( m, point );
					break;
				case LGraphPointsToInstances.SPHERICAL: 
					front.set( point );
					vec3.normalize( front, front );
					vec3.cross( right, UP, front );
					vec3.normalize( right, right );
					vec3.cross( top, front, right );
					vec3.normalize( top, top );
					m.set(right,0);
					m.set(top,4);
					m.set(front,8);
					mat4.setTranslation( m, point );
					break;
				case LGraphPointsToInstances.RANDOM:
					temp[0] = Math.random()*2 - 1;
					temp[1] = Math.random()*2 - 1;
					temp[2] = Math.random()*2 - 1;
					vec3.normalize( temp, temp );
					quat.setAxisAngle( R, temp, Math.random() * 2 * Math.PI );
					mat4.fromQuat(m, R);
					mat4.setTranslation( m, point );
					break;
				case LGraphPointsToInstances.RANDOM_VERTICAL:
					quat.setAxisAngle( R, UP, Math.random() * 2 * Math.PI );
					mat4.fromQuat(m, R);
					mat4.setTranslation( m, point );
					break;
			}
		}

		this._version = geometry._version;
		this._geometry_id = geometry._id;
	}

	LiteGraph.registerNodeType( "geometry/points_to_instances", LGraphPointsToInstances );


	function LGraphGeometryTransform() {
		this.addInput("in", "geometry,[mat4]");
		this.addInput("mat4", "mat4");
		this.addOutput("out", "geometry");
		this.properties = {};

		this.geometry = {
			type: "triangles",
			vertices: null,
			_id: generateGeometryId(),
			_version: 0
		};

		this._last_geometry_id = -1;
		this._last_version = -1;
		this._last_key = "";

		this.must_update = true;
	}

	LGraphGeometryTransform.title = "Transform";

	LGraphGeometryTransform.prototype.onExecute = function() {

		var input = this.getInputData(0);
		var model = this.getInputData(1);

		if(!input)
			return;

		//array of matrices
		if(input.constructor === Array)
		{
			if(input.length == 0)
				return;
			this.outputs[0].type = "[mat4]";
			if( !this.isOutputConnected(0) )
				return;

			if(!model)
			{
				this.setOutputData(0,input);
				return;
			}

			if(!this._output)
				this._output = new Array();
			if(this._output.length != input.length)
				this._output.length = input.length;
			for(var i = 0; i < input.length; ++i)
			{
				var m = this._output[i];
				if(!m)
					m = this._output[i] = mat4.create();
				mat4.multiply(m,input[i],model);
			}
			this.setOutputData(0,this._output);
			return;
		}

		//geometry
		if(!input.vertices || !input.vertices.length)
			return;
		var geo = input;
		this.outputs[0].type = "geometry";
		if( !this.isOutputConnected(0) )
			return;
		if(!model)
		{
			this.setOutputData(0,geo);
			return;
		}

		var key = typedArrayToArray(model).join(",");

		if( this.must_update || geo._id != this._last_geometry_id || geo._version != this._last_version || key != this._last_key )
		{
			this.updateGeometry(geo, model);
			this._last_key = key;
			this._last_version = geo._version;
			this._last_geometry_id = geo._id;
			this.must_update = false;
		}

		this.setOutputData(0,this.geometry);
	}

	LGraphGeometryTransform.prototype.updateGeometry = function(geometry, model) {
		var old_vertices = geometry.vertices;
		var vertices = this.geometry.vertices;
		if( !vertices || vertices.length != old_vertices.length )
			vertices = this.geometry.vertices = new Float32Array( old_vertices.length );
		var temp = vec3.create();

		for(var i = 0, l = vertices.length; i < l; i+=3)
		{
			temp[0] = old_vertices[i]; temp[1] = old_vertices[i+1]; temp[2] = old_vertices[i+2]; 
			mat4.multiplyVec3( temp, model, temp );
			vertices[i] = temp[0]; vertices[i+1] = temp[1]; vertices[i+2] = temp[2];
		}

		if(geometry.normals)
		{
			if( !this.geometry.normals || this.geometry.normals.length != geometry.normals.length )
				this.geometry.normals = new Float32Array( geometry.normals.length );
			var normals = this.geometry.normals;
			var normal_model = mat4.invert(mat4.create(), model);
			if(normal_model)
				mat4.transpose(normal_model, normal_model);
			var old_normals = geometry.normals;
			for(var i = 0, l = normals.length; i < l; i+=3)
			{
				temp[0] = old_normals[i]; temp[1] = old_normals[i+1]; temp[2] = old_normals[i+2]; 
				mat4.multiplyVec3( temp, normal_model, temp );
				normals[i] = temp[0]; normals[i+1] = temp[1]; normals[i+2] = temp[2];
			}
		}

		this.geometry.type = geometry.type;
		this.geometry._version++;
	}

	LiteGraph.registerNodeType( "geometry/transform", LGraphGeometryTransform );


	function LGraphGeometryPolygon() {
		this.addInput("sides", "number");
		this.addInput("radius", "number");
		this.addOutput("out", "geometry");
		this.properties = { sides: 6, radius: 1, uvs: false }

		this.geometry = {
			type: "line_loop",
			vertices: null,
			_id: generateGeometryId()
		};
		this.geometry_id = -1;
		this.version = -1;
		this.must_update = true;

		this.last_info = { sides: -1, radius: -1 };
	}

	LGraphGeometryPolygon.title = "Polygon";

	LGraphGeometryPolygon.prototype.onExecute = function() {

		if( !this.isOutputConnected(0) )
			return;

		var sides = this.getInputOrProperty("sides");
		var radius = this.getInputOrProperty("radius");
		sides = Math.max(3,sides)|0;

		//update
		if( this.last_info.sides != sides || this.last_info.radius != radius )
			this.updateGeometry(sides, radius);

		this.setOutputData(0,this.geometry);
	}

	LGraphGeometryPolygon.prototype.updateGeometry = function(sides, radius) {
		var num = 3*sides;
		var vertices = this.geometry.vertices;
		if( !vertices || vertices.length != num )
			vertices = this.geometry.vertices = new Float32Array( 3*sides );
		var delta = (Math.PI * 2) / sides;
		var gen_uvs = this.properties.uvs;
		if(gen_uvs)
		{
			uvs = this.geometry.coords = new Float32Array( 3*sides );
		}


		for(var i = 0; i < sides; ++i)
		{
			var angle = delta * -i;
			var x = Math.cos( angle ) * radius;
			var y = 0;
			var z = Math.sin( angle ) * radius;
			vertices[i*3] = x;
			vertices[i*3+1] = y;
			vertices[i*3+2] = z;

			if(gen_uvs)
			{
				

			}
		}
		this.geometry._id = ++this.geometry_id;
		this.geometry._version = ++this.version;
		this.last_info.sides = sides;
		this.last_info.radius = radius;
	}

	LiteGraph.registerNodeType( "geometry/polygon", LGraphGeometryPolygon );


	function LGraphGeometryExtrude() {

		this.addInput("", "geometry");
		this.addOutput("", "geometry");
		this.properties = { top_cap: true, bottom_cap: true, offset: [0,100,0] };
		this.version = -1;

		this._last_geo_version = -1;
		this._must_update = true;
	}

	LGraphGeometryExtrude.title = "extrude";

	LGraphGeometryExtrude.prototype.onPropertyChanged = function(name, value)
	{
		this._must_update = true;
	}

	LGraphGeometryExtrude.prototype.onExecute = function()
	{
		var geo = this.getInputData(0);
		if( !geo || !this.isOutputConnected(0) )
			return;

		if(geo.version != this._last_geo_version || this._must_update)
		{
			this._geo = this.extrudeGeometry( geo, this._geo );
			if(this._geo)
				this._geo.version = this.version++;
			this._must_update = false;
		}

		this.setOutputData(0, this._geo);
	}

	LGraphGeometryExtrude.prototype.extrudeGeometry = function( geo )
	{
		//for every pair of vertices
		var vertices = geo.vertices;
		var num_points = vertices.length / 3;

		var tempA = vec3.create();
		var tempB = vec3.create();
		var tempC = vec3.create();
		var tempD = vec3.create();
		var offset = new Float32Array( this.properties.offset );

		if(geo.type == "line_loop")
		{
			var new_vertices = new Float32Array( num_points * 6 * 3 ); //every points become 6 ( caps not included )
			var npos = 0;
			for(var i = 0, l = vertices.length; i < l; i += 3)
			{
				tempA[0] = vertices[i]; tempA[1] = vertices[i+1]; tempA[2] = vertices[i+2];

				if( i+3 < l ) //loop
				{
					tempB[0] = vertices[i+3]; tempB[1] = vertices[i+4]; tempB[2] = vertices[i+5];
				}
				else
				{
					tempB[0] = vertices[0]; tempB[1] = vertices[1]; tempB[2] = vertices[2];
				}

				vec3.add( tempC, tempA, offset );
				vec3.add( tempD, tempB, offset );

				new_vertices.set( tempA, npos ); npos += 3;
				new_vertices.set( tempB, npos ); npos += 3;
				new_vertices.set( tempC, npos ); npos += 3;

				new_vertices.set( tempB, npos ); npos += 3;
				new_vertices.set( tempD, npos ); npos += 3;
				new_vertices.set( tempC, npos ); npos += 3;
			}
		}

		var out_geo = {
			_id: generateGeometryId(),
			type: "triangles",
			vertices: new_vertices
		};

		return out_geo;
	}

	LiteGraph.registerNodeType( "geometry/extrude", LGraphGeometryExtrude );


	function LGraphGeometryEval() {
		this.addInput("in", "geometry");
		this.addOutput("out", "geometry");

		this.properties = {
			code: "V[1] += 0.01 * Math.sin(I + T*0.001);",
			execute_every_frame: false
		};

		this.geometry = null;
		this.geometry_id = -1;
		this.version = -1;
		this.must_update = true;

		this.vertices = null;
		this.func = null;
	}

	LGraphGeometryEval.title = "geoeval";
	LGraphGeometryEval.desc = "eval code";

	LGraphGeometryEval.widgets_info = {
		code: { widget: "code" }
	};

	LGraphGeometryEval.prototype.onConfigure = function(o)
	{
		this.compileCode();
	}

	LGraphGeometryEval.prototype.compileCode = function()
	{
		if(!this.properties.code)
			return;

		try
		{
			this.func = new Function("V","I","T", this.properties.code); 
			this.boxcolor = "#AFA";
			this.must_update = true;
		}
		catch (err)
		{
			this.boxcolor = "red";
		}
	}

	LGraphGeometryEval.prototype.onPropertyChanged = function(name, value)
	{
		if(name == "code")
		{
			this.properties.code = value;
			this.compileCode();
		}
	}

	LGraphGeometryEval.prototype.onExecute = function() {
		var geometry = this.getInputData(0);
		if(!geometry)
			return;

		if(!this.func)
		{
			this.setOutputData(0,geometry);
			return;
		}

		if( this.geometry_id != geometry._id || this.version != geometry._version || this.must_update || this.properties.execute_every_frame )
		{
			this.must_update = false;
			this.geometry_id = geometry._id;
			if(this.properties.execute_every_frame)
				this.version++;
			else
				this.version = geometry._version;
			var func = this.func;
			var T = getTime();

			//clone
			if(!this.geometry)
				this.geometry = {};
			for(var i in geometry)
			{
				if(geometry[i] == null)
					continue;
				if( geometry[i].constructor == Float32Array )
					this.geometry[i] = new Float32Array( geometry[i] );
				else
					this.geometry[i] = geometry[i];
			}
			this.geometry._id = geometry._id;
			if(this.properties.execute_every_frame)
				this.geometry._version = this.version;
			else
				this.geometry._version = geometry._version + 1;

			var V = vec3.create();
			var vertices = this.vertices;
			if(!vertices || this.vertices.length != geometry.vertices.length)
				vertices = this.vertices = new Float32Array( geometry.vertices );
			else
				vertices.set( geometry.vertices );
			for(var i = 0; i < vertices.length; i+=3)
			{
				V[0] = vertices[i];
				V[1] = vertices[i+1];
				V[2] = vertices[i+2];
				func(V,i/3,T);
				vertices[i] = V[0];
				vertices[i+1] = V[1];
				vertices[i+2] = V[2];
			}
			this.geometry.vertices = vertices;
		}

		this.setOutputData(0,this.geometry);
	}

	LiteGraph.registerNodeType( "geometry/eval", LGraphGeometryEval );

/*
function LGraphGeometryDisplace() {
		this.addInput("in", "geometry");
		this.addInput("img", "image");
		this.addOutput("out", "geometry");

		this.properties = {
			grid_size: 1
		};

		this.geometry = null;
		this.geometry_id = -1;
		this.version = -1;
		this.must_update = true;

		this.vertices = null;
	}

	LGraphGeometryDisplace.title = "displace";
	LGraphGeometryDisplace.desc = "displace points";

	LGraphGeometryDisplace.prototype.onExecute = function() {
		var geometry = this.getInputData(0);
		var image = this.getInputData(1);
		if(!geometry)
			return;

		if(!image)
		{
			this.setOutputData(0,geometry);
			return;
		}

		if( this.geometry_id != geometry._id || this.version != geometry._version || this.must_update )
		{
			this.must_update = false;
			this.geometry_id = geometry._id;
			this.version = geometry._version;

			//copy
			this.geometry = {};
			for(var i in geometry)
				this.geometry[i] = geometry[i];
			this.geometry._id = geometry._id;
			this.geometry._version = geometry._version + 1;

			var grid_size = this.properties.grid_size;
			if(grid_size != 0)
			{
				var vertices = this.vertices;
				if(!vertices || this.vertices.length != this.geometry.vertices.length)
					vertices = this.vertices = new Float32Array( this.geometry.vertices );
				for(var i = 0; i < vertices.length; i+=3)
				{
					vertices[i] = Math.round(vertices[i]/grid_size) * grid_size;
					vertices[i+1] = Math.round(vertices[i+1]/grid_size) * grid_size;
					vertices[i+2] = Math.round(vertices[i+2]/grid_size) * grid_size;
				}
				this.geometry.vertices = vertices;
			}
		}

		this.setOutputData(0,this.geometry);
	}

	LiteGraph.registerNodeType( "geometry/displace", LGraphGeometryDisplace );
*/

	function LGraphConnectPoints() {
		this.addInput("in", "geometry");
		this.addOutput("out", "geometry");

		this.properties = {
			min_dist: 0.4,
			max_dist: 0.5,
			max_connections: 0,
			probability: 1
		};

		this.geometry_id = -1;
		this.version = -1;
		this.my_version = 1;
		this.must_update = true;
	}

	LGraphConnectPoints.title = "connect points";
	LGraphConnectPoints.desc = "adds indices between near points";

	LGraphConnectPoints.prototype.onPropertyChanged = function(name,value)
	{
		this.must_update = true;
	}

	LGraphConnectPoints.prototype.onExecute = function() {
		var geometry = this.getInputData(0);
		if(!geometry)
			return;

		if( this.geometry_id != geometry._id || this.version != geometry._version || this.must_update )
		{
			this.must_update = false;
			this.geometry_id = geometry._id;
			this.version = geometry._version;

			//copy
			this.geometry = {};
			for(var i in geometry)
				this.geometry[i] = geometry[i];
			this.geometry._id = generateGeometryId();
			this.geometry._version = this.my_version++;

			var vertices = geometry.vertices;
			var l = vertices.length;
			var min_dist = this.properties.min_dist;
			var max_dist = this.properties.max_dist;
			var probability = this.properties.probability;
			var max_connections = this.properties.max_connections;
			var indices = [];
			
			for(var i = 0; i < l; i+=3)
			{
				var x = vertices[i];
				var y = vertices[i+1];
				var z = vertices[i+2];
				var connections = 0;
				for(var j = i+3; j < l; j+=3)
				{
					var x2 = vertices[j];
					var y2 = vertices[j+1];
					var z2 = vertices[j+2];
					var dist = Math.sqrt( (x-x2)*(x-x2) + (y-y2)*(y-y2) + (z-z2)*(z-z2));
					if(dist > max_dist || dist < min_dist || (probability < 1 && probability < Math.random()) )
						continue;
					indices.push(i/3,j/3);
					connections += 1;
					if(max_connections && connections > max_connections)
						break;
				}
			}
			this.geometry.indices = this.indices = new Uint32Array(indices);
		}

		if(this.indices && this.indices.length)
		{
			this.geometry.indices = this.indices;
			this.setOutputData( 0, this.geometry );
		}
		else
			this.setOutputData( 0, null );
	}

	LiteGraph.registerNodeType( "geometry/connectPoints", LGraphConnectPoints );

    //Works with Litegl.js to create WebGL nodes
    if (typeof GL == "undefined") //LiteGL RELATED **********************************************
		return;

	function LGraphToGeometry() {
		this.addInput("mesh", "mesh");
		this.addOutput("out", "geometry");

		this.geometry = {};
		this.last_mesh = null;
	}

	LGraphToGeometry.title = "to geometry";
	LGraphToGeometry.desc = "converts a mesh to geometry";

	LGraphToGeometry.prototype.onExecute = function() {
		var mesh = this.getInputData(0);
		if(!mesh)
			return;

		if(mesh != this.last_mesh)
		{
			this.last_mesh = mesh;
			for(i in mesh.vertexBuffers)
			{
				var buffer = mesh.vertexBuffers[i];
				this.geometry[i] = buffer.data
			}
			if(mesh.indexBuffers["triangles"])
				this.geometry.indices = mesh.indexBuffers["triangles"].data;

			this.geometry._id = generateGeometryId();
			this.geometry._version = 0;
		}

		this.setOutputData(0,this.geometry);
		if(this.geometry)
			this.setOutputData(1,this.geometry.vertices);
	}

	LiteGraph.registerNodeType( "geometry/toGeometry", LGraphToGeometry );

	function LGraphGeometryToMesh() {
		this.addInput("in", "geometry");
		this.addOutput("mesh", "mesh");
		this.properties = {};
		this.version = -1;
		this.mesh = null;
	}

	LGraphGeometryToMesh.title = "Geo to Mesh";

	LGraphGeometryToMesh.prototype.updateMesh = function(geometry)
	{
		if(!this.mesh)
			this.mesh = new GL.Mesh();

		for(var i in geometry)
		{
			if(i[0] == "_")
				continue;

			var buffer_data = geometry[i];

			var info = GL.Mesh.common_buffers[i];
			if(!info && i != "indices") //unknown buffer
				continue;
			var spacing = info ? info.spacing : 3;
			var mesh_buffer = this.mesh.vertexBuffers[i];

			if(!mesh_buffer || mesh_buffer.data.length != buffer_data.length)
			{
				mesh_buffer = new GL.Buffer( i == "indices" ? GL.ELEMENT_ARRAY_BUFFER : GL.ARRAY_BUFFER, buffer_data, spacing, GL.DYNAMIC_DRAW );
			}
			else
			{
				mesh_buffer.data.set( buffer_data );
				mesh_buffer.upload(GL.DYNAMIC_DRAW);
			}

			this.mesh.addBuffer( i, mesh_buffer );
		}

		if(this.mesh.vertexBuffers.normals &&this.mesh.vertexBuffers.normals.data.length != this.mesh.vertexBuffers.vertices.data.length )
		{
			var n = new Float32Array([0,1,0]);
			var normals = new Float32Array( this.mesh.vertexBuffers.vertices.data.length );
			for(var i = 0; i < normals.length; i+= 3)
				normals.set( n, i );
			mesh_buffer = new GL.Buffer( GL.ARRAY_BUFFER, normals, 3 );
			this.mesh.addBuffer( "normals", mesh_buffer );
		}

		this.mesh.updateBoundingBox();
		this.geometry_id = this.mesh.id = geometry._id;
		this.version = this.mesh.version = geometry._version;
		return this.mesh;
	}

	LGraphGeometryToMesh.prototype.onExecute = function() {

		var geometry = this.getInputData(0);
		if(!geometry)
			return;
		if( this.version != geometry._version || this.geometry_id != geometry._id )
			this.updateMesh( geometry );
		this.setOutputData(0, this.mesh);
	}

	LiteGraph.registerNodeType( "geometry/toMesh", LGraphGeometryToMesh );

	function LGraphRenderMesh() {
		this.addInput("mesh", "mesh");
		this.addInput("mat4", "mat4");
		this.addInput("tex", "texture");

		this.properties = {
			enabled: true,
			primitive: GL.TRIANGLES,
			additive: false,
			color: [1,1,1],
			opacity: 1
		};

		this.color = vec4.create([1,1,1,1]);
		this.model_matrix = mat4.create();
		this.uniforms = {
			u_color: this.color,
			u_model: this.model_matrix
		};
	}

	LGraphRenderMesh.title = "Render Mesh";
	LGraphRenderMesh.desc = "renders a mesh flat";

	LGraphRenderMesh.PRIMITIVE_VALUES = { "points":GL.POINTS, "lines":GL.LINES, "line_loop":GL.LINE_LOOP,"line_strip":GL.LINE_STRIP, "triangles":GL.TRIANGLES, "triangle_fan":GL.TRIANGLE_FAN, "triangle_strip":GL.TRIANGLE_STRIP };

	LGraphRenderMesh.widgets_info = {
		primitive: { widget: "combo", values: LGraphRenderMesh.PRIMITIVE_VALUES },
		color: { widget: "color" }
	};

	LGraphRenderMesh.prototype.onExecute = function() {

		if(!this.properties.enabled)
			return;

		var mesh = this.getInputData(0);
		if(!mesh)
			return;

		if(!LiteGraph.LGraphRender.onRequestCameraMatrices)
		{
			console.warn("cannot render geometry, LiteGraph.onRequestCameraMatrices is null, remember to fill this with a callback(view_matrix, projection_matrix,viewprojection_matrix) to use 3D rendering from the graph");
			return;
		}

		LiteGraph.LGraphRender.onRequestCameraMatrices( view_matrix, projection_matrix,viewprojection_matrix );
		var shader = null;
		var texture = this.getInputData(2);
		if(texture)
		{
			shader = gl.shaders["textured"];
			if(!shader)
				shader = gl.shaders["textured"] = new GL.Shader( LGraphRenderPoints.vertex_shader_code, LGraphRenderPoints.fragment_shader_code, { USE_TEXTURE:"" });
		}
		else
		{
			shader = gl.shaders["flat"];
			if(!shader)
				shader = gl.shaders["flat"] = new GL.Shader( LGraphRenderPoints.vertex_shader_code, LGraphRenderPoints.fragment_shader_code );
		}

		this.color.set( this.properties.color );
		this.color[3] = this.properties.opacity;

		var model_matrix = this.model_matrix;
		var m = this.getInputData(1);
		if(m)
			model_matrix.set(m);
		else
			mat4.identity( model_matrix );

		this.uniforms.u_point_size = 1;
		var primitive = this.properties.primitive;

		shader.uniforms( global_uniforms );
		shader.uniforms( this.uniforms );

		if(this.properties.opacity >= 1)
			gl.disable( gl.BLEND );
		else
			gl.enable( gl.BLEND );
		gl.enable( gl.DEPTH_TEST );
		if( this.properties.additive )
		{
			gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
			gl.depthMask( false );
		}
		else
			gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

		var indices = "indices";
		if( mesh.indexBuffers.triangles )
			indices = "triangles";
		shader.draw( mesh, primitive, indices );
		gl.disable( gl.BLEND );
		gl.depthMask( true );
	}

	LiteGraph.registerNodeType( "geometry/render_mesh", LGraphRenderMesh );

	//**************************


	function LGraphGeometryPrimitive() {
		this.addInput("size", "number");
		this.addOutput("out", "mesh");
		this.properties = { type: 1, size: 1, subdivisions: 32 };

		this.version = (Math.random() * 100000)|0;
		this.last_info = { type: -1, size: -1, subdivisions: -1 };
	}

	LGraphGeometryPrimitive.title = "Primitive";

	LGraphGeometryPrimitive.VALID = { "CUBE":1, "PLANE":2, "CYLINDER":3, "SPHERE":4, "CIRCLE":5, "HEMISPHERE":6, "ICOSAHEDRON":7, "CONE":8, "QUAD":9 };
	LGraphGeometryPrimitive.widgets_info = {
		type: { widget: "combo", values: LGraphGeometryPrimitive.VALID }
	};

	LGraphGeometryPrimitive.prototype.onExecute = function() {

		if( !this.isOutputConnected(0) )
			return;

		var size = this.getInputOrProperty("size");

		//update
		if( this.last_info.type != this.properties.type || this.last_info.size != size || this.last_info.subdivisions != this.properties.subdivisions )
			this.updateMesh( this.properties.type, size, this.properties.subdivisions );

		this.setOutputData(0,this._mesh);
	}

	LGraphGeometryPrimitive.prototype.updateMesh = function(type, size, subdivisions)
	{
		subdivisions = Math.max(0,subdivisions)|0;

		switch (type)
		{
			case 1: //CUBE: 
				this._mesh = GL.Mesh.cube({size: size, normals:true,coords:true});
				break;
			case 2: //PLANE:
				this._mesh = GL.Mesh.plane({size: size, xz: true, detail: subdivisions, normals:true,coords:true});
				break;
			case 3: //CYLINDER:
				this._mesh = GL.Mesh.cylinder({size: size, subdivisions: subdivisions, normals:true,coords:true});
				break;
			case 4: //SPHERE:
				this._mesh = GL.Mesh.sphere({size: size, "long": subdivisions, lat: subdivisions, normals:true,coords:true});
				break;
			case 5: //CIRCLE:
				this._mesh = GL.Mesh.circle({size: size, slices: subdivisions, normals:true, coords:true});
				break;
			case 6: //HEMISPHERE:
				this._mesh = GL.Mesh.sphere({size: size, "long": subdivisions, lat: subdivisions, normals:true, coords:true, hemi: true});
				break;
			case 7: //ICOSAHEDRON:
				this._mesh = GL.Mesh.icosahedron({size: size, subdivisions:subdivisions });
				break;
			case 8: //CONE:
				this._mesh = GL.Mesh.cone({radius: size, height: size, subdivisions:subdivisions });
				break;
			case 9: //QUAD:
				this._mesh = GL.Mesh.plane({size: size, xz: false, detail: subdivisions, normals:true, coords:true });
				break;
		}

		this.last_info.type = type;
		this.last_info.size = size;
		this.last_info.subdivisions = subdivisions;
		this._mesh.version = this.version++;
	}

	LiteGraph.registerNodeType( "geometry/mesh_primitive", LGraphGeometryPrimitive );


	function LGraphRenderPoints() {
		this.addInput("in", "geometry");
		this.addInput("mat4", "mat4");
		this.addInput("tex", "texture");
		this.properties = {
			enabled: true,
			point_size: 0.1,
			fixed_size: false,
			additive: true,
			color: [1,1,1],
			opacity: 1
		};

		this.color = vec4.create([1,1,1,1]);

		this.uniforms = {
			u_point_size: 1,
			u_perspective: 1,
			u_point_perspective: 1,
			u_color: this.color
		};

		this.geometry_id = -1;
		this.version = -1;
		this.mesh = null;
	}

	LGraphRenderPoints.title = "renderPoints";
	LGraphRenderPoints.desc = "render points with a texture";

	LGraphRenderPoints.widgets_info = {
		color: { widget: "color" }
	};

	LGraphRenderPoints.prototype.updateMesh = function(geometry)
	{
		var buffer = this.buffer;
		if(!this.buffer || !this.buffer.data || this.buffer.data.length != geometry.vertices.length)
			this.buffer = new GL.Buffer( GL.ARRAY_BUFFER, geometry.vertices,3,GL.DYNAMIC_DRAW);
		else
		{
			this.buffer.data.set( geometry.vertices );
			this.buffer.upload(GL.DYNAMIC_DRAW);
		}

		if(!this.mesh)
			this.mesh = new GL.Mesh();

		this.mesh.addBuffer("vertices",this.buffer);
		this.geometry_id = this.mesh.id = geometry._id;
		this.version = this.mesh.version = geometry._version;
	}

	LGraphRenderPoints.prototype.onExecute = function() {

		if(!this.properties.enabled)
			return;

		var geometry = this.getInputData(0);
		if(!geometry)
			return;
		if(this.version != geometry._version || this.geometry_id != geometry._id )
			this.updateMesh( geometry );

		if(!LiteGraph.LGraphRender.onRequestCameraMatrices)
		{
			console.warn("cannot render geometry, LiteGraph.onRequestCameraMatrices is null, remember to fill this with a callback(view_matrix, projection_matrix,viewprojection_matrix) to use 3D rendering from the graph");
			return;
		}

		LiteGraph.LGraphRender.onRequestCameraMatrices( view_matrix, projection_matrix,viewprojection_matrix );
		var shader = null;

		var texture = this.getInputData(2);
		
		if(texture)
		{
			shader = gl.shaders["textured_points"];
			if(!shader)
				shader = gl.shaders["textured_points"] = new GL.Shader( LGraphRenderPoints.vertex_shader_code, LGraphRenderPoints.fragment_shader_code, { USE_TEXTURED_POINTS:"" });
		}
		else
		{
			shader = gl.shaders["points"];
			if(!shader)
				shader = gl.shaders["points"] = new GL.Shader( LGraphRenderPoints.vertex_shader_code, LGraphRenderPoints.fragment_shader_code, { USE_POINTS: "" });
		}

		this.color.set( this.properties.color );
		this.color[3] = this.properties.opacity;

		var m = this.getInputData(1);
		if(m)
			model_matrix.set(m);
		else
			mat4.identity( model_matrix );

		this.uniforms.u_point_size = this.properties.point_size;
		this.uniforms.u_point_perspective = this.properties.fixed_size ? 0 : 1;
		this.uniforms.u_perspective = gl.viewport_data[3] * projection_matrix[5];

		shader.uniforms( global_uniforms );
		shader.uniforms( this.uniforms );

		if(this.properties.opacity >= 1)
			gl.disable( gl.BLEND );
		else
			gl.enable( gl.BLEND );

		gl.enable( gl.DEPTH_TEST );
		if( this.properties.additive )
		{
			gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
			gl.depthMask( false );
		}
		else
			gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

		shader.draw( this.mesh, GL.POINTS );

		gl.disable( gl.BLEND );
		gl.depthMask( true );
	}

	LiteGraph.registerNodeType( "geometry/render_points", LGraphRenderPoints );

	LGraphRenderPoints.vertex_shader_code = '\
		precision mediump float;\n\
		attribute vec3 a_vertex;\n\
		varying vec3 v_vertex;\n\
		attribute vec3 a_normal;\n\
		varying vec3 v_normal;\n\
		#ifdef USE_COLOR\n\
			attribute vec4 a_color;\n\
			varying vec4 v_color;\n\
		#endif\n\
		attribute vec2 a_coord;\n\
		varying vec2 v_coord;\n\
		#ifdef USE_SIZE\n\
			attribute float a_extra;\n\
		#endif\n\
		#ifdef USE_INSTANCING\n\
			attribute mat4 u_model;\n\
		#else\n\
			uniform mat4 u_model;\n\
		#endif\n\
		uniform mat4 u_viewprojection;\n\
		uniform float u_point_size;\n\
		uniform float u_perspective;\n\
		uniform float u_point_perspective;\n\
		float computePointSize(float radius, float w)\n\
		{\n\
			if(radius < 0.0)\n\
				return -radius;\n\
			return u_perspective * radius / w;\n\
		}\n\
		void main() {\n\
			v_coord = a_coord;\n\
			#ifdef USE_COLOR\n\
				v_color = a_color;\n\
			#endif\n\
			v_vertex = ( u_model * vec4( a_vertex, 1.0 )).xyz;\n\
			v_normal = ( u_model * vec4( a_normal, 0.0 )).xyz;\n\
			gl_Position = u_viewprojection * vec4(v_vertex,1.0);\n\
			gl_PointSize = u_point_size;\n\
			#ifdef USE_SIZE\n\
				gl_PointSize = a_extra;\n\
			#endif\n\
			if(u_point_perspective != 0.0)\n\
				gl_PointSize = computePointSize( gl_PointSize, gl_Position.w );\n\
		}\
	';

	LGraphRenderPoints.fragment_shader_code = '\
		precision mediump float;\n\
		uniform vec4 u_color;\n\
		#ifdef USE_COLOR\n\
			varying vec4 v_color;\n\
		#endif\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		void main() {\n\
			vec4 color = u_color;\n\
			#ifdef USE_TEXTURED_POINTS\n\
				color *= texture2D(u_texture, gl_PointCoord.xy);\n\
			#else\n\
				#ifdef USE_TEXTURE\n\
				  color *= texture2D(u_texture, v_coord);\n\
				  if(color.a < 0.1)\n\
					discard;\n\
				#endif\n\
				#ifdef USE_POINTS\n\
					float dist = length( gl_PointCoord.xy - vec2(0.5) );\n\
					if( dist > 0.45 )\n\
						discard;\n\
				#endif\n\
			#endif\n\
			#ifdef USE_COLOR\n\
				color *= v_color;\n\
			#endif\n\
			gl_FragColor = color;\n\
		}\
	';

	//based on https://inconvergent.net/2019/depth-of-field/
	/*
	function LGraphRenderGeometryDOF() {
		this.addInput("in", "geometry");
		this.addInput("mat4", "mat4");
		this.addInput("tex", "texture");
		this.properties = {
			enabled: true,
			lines: true,
			point_size: 0.1,
			fixed_size: false,
			additive: true,
			color: [1,1,1],
			opacity: 1
		};

		this.color = vec4.create([1,1,1,1]);

		this.uniforms = {
			u_point_size: 1,
			u_perspective: 1,
			u_point_perspective: 1,
			u_color: this.color
		};

		this.geometry_id = -1;
		this.version = -1;
		this.mesh = null;
	}

	LGraphRenderGeometryDOF.widgets_info = {
		color: { widget: "color" }
	};

	LGraphRenderGeometryDOF.prototype.updateMesh = function(geometry)
	{
		var buffer = this.buffer;
		if(!this.buffer || this.buffer.data.length != geometry.vertices.length)
			this.buffer = new GL.Buffer( GL.ARRAY_BUFFER, geometry.vertices,3,GL.DYNAMIC_DRAW);
		else
		{
			this.buffer.data.set( geometry.vertices );
			this.buffer.upload(GL.DYNAMIC_DRAW);
		}

		if(!this.mesh)
			this.mesh = new GL.Mesh();

		this.mesh.addBuffer("vertices",this.buffer);
		this.geometry_id = this.mesh.id = geometry._id;
		this.version = this.mesh.version = geometry._version;
	}

	LGraphRenderGeometryDOF.prototype.onExecute = function() {

		if(!this.properties.enabled)
			return;

		var geometry = this.getInputData(0);
		if(!geometry)
			return;
		if(this.version != geometry._version || this.geometry_id != geometry._id )
			this.updateMesh( geometry );

		if(!LiteGraph.LGraphRender.onRequestCameraMatrices)
		{
			console.warn("cannot render geometry, LiteGraph.onRequestCameraMatrices is null, remember to fill this with a callback(view_matrix, projection_matrix,viewprojection_matrix) to use 3D rendering from the graph");
			return;
		}

		LiteGraph.LGraphRender.onRequestCameraMatrices( view_matrix, projection_matrix,viewprojection_matrix );
		var shader = null;

		var texture = this.getInputData(2);
		
		if(texture)
		{
			shader = gl.shaders["textured_points"];
			if(!shader)
				shader = gl.shaders["textured_points"] = new GL.Shader( LGraphRenderGeometryDOF.vertex_shader_code, LGraphRenderGeometryDOF.fragment_shader_code, { USE_TEXTURED_POINTS:"" });
		}
		else
		{
			shader = gl.shaders["points"];
			if(!shader)
				shader = gl.shaders["points"] = new GL.Shader( LGraphRenderGeometryDOF.vertex_shader_code, LGraphRenderGeometryDOF.fragment_shader_code, { USE_POINTS: "" });
		}

		this.color.set( this.properties.color );
		this.color[3] = this.properties.opacity;

		var m = this.getInputData(1);
		if(m)
			model_matrix.set(m);
		else
			mat4.identity( model_matrix );

		this.uniforms.u_point_size = this.properties.point_size;
		this.uniforms.u_point_perspective = this.properties.fixed_size ? 0 : 1;
		this.uniforms.u_perspective = gl.viewport_data[3] * projection_matrix[5];

		shader.uniforms( global_uniforms );
		shader.uniforms( this.uniforms );

		if(this.properties.opacity >= 1)
			gl.disable( gl.BLEND );
		else
			gl.enable( gl.BLEND );

		gl.enable( gl.DEPTH_TEST );
		if( this.properties.additive )
		{
			gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
			gl.depthMask( false );
		}
		else
			gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

		shader.draw( this.mesh, GL.POINTS );

		gl.disable( gl.BLEND );
		gl.depthMask( true );
	}

	LiteGraph.registerNodeType( "geometry/render_dof", LGraphRenderGeometryDOF );

	LGraphRenderGeometryDOF.vertex_shader_code = '\
		precision mediump float;\n\
		attribute vec3 a_vertex;\n\
		varying vec3 v_vertex;\n\
		attribute vec3 a_normal;\n\
		varying vec3 v_normal;\n\
		#ifdef USE_COLOR\n\
			attribute vec4 a_color;\n\
			varying vec4 v_color;\n\
		#endif\n\
		attribute vec2 a_coord;\n\
		varying vec2 v_coord;\n\
		#ifdef USE_SIZE\n\
			attribute float a_extra;\n\
		#endif\n\
		#ifdef USE_INSTANCING\n\
			attribute mat4 u_model;\n\
		#else\n\
			uniform mat4 u_model;\n\
		#endif\n\
		uniform mat4 u_viewprojection;\n\
		uniform float u_point_size;\n\
		uniform float u_perspective;\n\
		uniform float u_point_perspective;\n\
		float computePointSize(float radius, float w)\n\
		{\n\
			if(radius < 0.0)\n\
				return -radius;\n\
			return u_perspective * radius / w;\n\
		}\n\
		void main() {\n\
			v_coord = a_coord;\n\
			#ifdef USE_COLOR\n\
				v_color = a_color;\n\
			#endif\n\
			v_vertex = ( u_model * vec4( a_vertex, 1.0 )).xyz;\n\
			v_normal = ( u_model * vec4( a_normal, 0.0 )).xyz;\n\
			gl_Position = u_viewprojection * vec4(v_vertex,1.0);\n\
			gl_PointSize = u_point_size;\n\
			#ifdef USE_SIZE\n\
				gl_PointSize = a_extra;\n\
			#endif\n\
			if(u_point_perspective != 0.0)\n\
				gl_PointSize = computePointSize( gl_PointSize, gl_Position.w );\n\
		}\
	';

	LGraphRenderGeometryDOF.fragment_shader_code = '\
		precision mediump float;\n\
		uniform vec4 u_color;\n\
		#ifdef USE_COLOR\n\
			varying vec4 v_color;\n\
		#endif\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		void main() {\n\
			vec4 color = u_color;\n\
			#ifdef USE_TEXTURED_POINTS\n\
				color *= texture2D(u_texture, gl_PointCoord.xy);\n\
			#else\n\
				#ifdef USE_TEXTURE\n\
				  color *= texture2D(u_texture, v_coord);\n\
				  if(color.a < 0.1)\n\
					discard;\n\
				#endif\n\
				#ifdef USE_POINTS\n\
					float dist = length( gl_PointCoord.xy - vec2(0.5) );\n\
					if( dist > 0.45 )\n\
						discard;\n\
				#endif\n\
			#endif\n\
			#ifdef USE_COLOR\n\
				color *= v_color;\n\
			#endif\n\
			gl_FragColor = color;\n\
		}\
	';
	*/



})(this);