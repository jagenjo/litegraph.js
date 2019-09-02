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
		this.addOutput("out", "geometry");
		this.addOutput("points", "array");
		this.properties = {
			radius: 1,
			num_points: 4096,
			regular: false,
			mode: LGraphPoints3D.SPHERE
		};

		this.points = new Float32Array( this.properties.num_points * 3 );
		this.must_update = true;
		this.version = 0;

		this.geometry = {
			vertices: null,
			_id: generateGeometryId()
		}
	}

	global.LGraphPoints3D = LGraphPoints3D;

	LGraphPoints3D.RECTANGLE = 1;
	LGraphPoints3D.CIRCLE = 2;

	LGraphPoints3D.CUBE = 10;
	LGraphPoints3D.SPHERE = 11;
	LGraphPoints3D.HEMISPHERE = 12;
	LGraphPoints3D.INSIDE_SPHERE = 13;

	LGraphPoints3D.MODE_VALUES = { "rectangle":LGraphPoints3D.RECTANGLE, "circle":LGraphPoints3D.CIRCLE, "cube":LGraphPoints3D.CUBE, "sphere":LGraphPoints3D.SPHERE, "hemisphere":LGraphPoints3D.HEMISPHERE, "inside_sphere":LGraphPoints3D.INSIDE_SPHERE };

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
		if(this.must_update)
		{
			this.must_update = false;
			this.updatePoints();
		}

		this.geometry.vertices = this.points;
		this.geometry._version = this.version;

		this.setOutputData( 0, this.geometry );
	}

	LGraphPoints3D.generatePoints = function( radius, num_points, mode, points, regular )
	{
		var size = num_points * 3;
		if(!points || points.length != size)
			points = new Float32Array( size );

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
			}
			else if( mode == LGraphPoints3D.SPHERE)
			{
				var side = Math.floor(Math.sqrt(num_points));
				var temp = vec3.create();
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
			}
			else if( mode == LGraphPoints3D.CIRCLE)
				for(var i = 0; i < size; i+=3)
				{
					var angle = 2 * Math.PI * (i/size);
					points[i] = Math.cos( angle ) * radius;
					points[i+1] = 0;
					points[i+2] = Math.sin( angle ) * radius;
				}
		}
		else
		{
			if( mode == LGraphPoints3D.RECTANGLE)
				for(var i = 0; i < size; i+=3)
				{
					points[i] = (Math.random() - 0.5) * radius * 2;
					points[i+1] = 0;
					points[i+2] = (Math.random() - 0.5) * radius * 2;
				}
			else if( mode == LGraphPoints3D.CUBE)
				for(var i = 0; i < size; i+=3)
				{
					points[i] = (Math.random() - 0.5) * radius * 2;
					points[i+1] = (Math.random() - 0.5) * radius * 2;
					points[i+2] = (Math.random() - 0.5) * radius * 2;
				}
			else if( mode == LGraphPoints3D.SPHERE)
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
			else if( mode == LGraphPoints3D.HEMISPHERE)
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
			else if( mode == LGraphPoints3D.CIRCLE)
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
			else if( mode == LGraphPoints3D.INSIDE_SPHERE)
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
			else
				console.warn("wrong mode in LGraphPoints3D");
		}

		return points;
	}

	LGraphPoints3D.prototype.updatePoints = function() {
		var num_points = this.properties.num_points|0;
		if(num_points < 1)
			num_points = 1;
		if(this.points.length != num_points * 3)
			this.points = new Float32Array( num_points * 3 );

		var points = this.points;
		var radius = this.properties.radius;
		var mode = this.properties.mode;

		this.points = LGraphPoints3D.generatePoints( radius, num_points, mode, this.points, this.properties.regular );

		this.version++;
	}

	LiteGraph.registerNodeType( "geometry/points3D", LGraphPoints3D );

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

	function LGraphRenderGeometry() {
		this.addInput("in", "geometry");
		this.addInput("mat4", "mat4");
		this.addInput("tex", "texture");
		this.addOutput("mesh", "mesh");

		this.properties = {
			enabled: true,
			primitive: GL.TRIANGLES,
			additive: false,
			color: [1,1,1],
			opacity: 1
		};

		this.color = vec4.create([1,1,1,1]);
		this.uniforms = {
			u_color: this.color
		};

		this.version = -1;
		this.mesh = null;
	}

	LGraphRenderGeometry.title = "render";
	LGraphRenderGeometry.desc = "renders a geometry";

	LGraphRenderGeometry.PRIMITIVE_VALUES = { "points":GL.POINTS, "lines":GL.LINES, "line_loop":GL.LINE_LOOP,"line_strip":GL.LINE_STRIP, "triangles":GL.TRIANGLES, "triangle_fan":GL.TRIANGLE_FAN, "triangle_strip":GL.TRIANGLE_STRIP };

	LGraphRenderGeometry.widgets_info = {
		primitive: { widget: "combo", values: LGraphRenderGeometry.PRIMITIVE_VALUES },
		color: { widget: "color" }
	};

	LGraphRenderGeometry.prototype.updateMesh = function(geometry)
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

		this.geometry_id = this.mesh.id = geometry._id;
		this.version = this.mesh.version = geometry._version;
		return this.mesh;
	}

	LGraphRenderGeometry.prototype.onExecute = function() {

		if(!this.properties.enabled)
			return;

		var geometry = this.getInputData(0);
		if(!geometry)
			return;
		if( this.version != geometry._version || this.geometry_id != geometry._id )
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
		shader.draw( this.mesh, primitive, "indices" );
		gl.disable( gl.BLEND );
		gl.depthMask( true );
	}

	LiteGraph.registerNodeType( "geometry/render", LGraphRenderGeometry );

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

	LGraphRenderPoints.widgets_info = {
		color: { widget: "color" }
	};

	LGraphRenderPoints.prototype.updateMesh = function(geometry)
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