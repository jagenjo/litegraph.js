(function(global) {
    var LiteGraph = global.LiteGraph;
    var LGraphTexture = global.LGraphTexture;

    //Works with Litegl.js to create WebGL nodes
    if (typeof GL != "undefined") {
        // Texture Lens *****************************************
        function LGraphFXLens() {
            this.addInput("Texture", "Texture");
            this.addInput("Aberration", "number");
            this.addInput("Distortion", "number");
            this.addInput("Blur", "number");
            this.addOutput("Texture", "Texture");
            this.properties = {
                aberration: 1.0,
                distortion: 1.0,
                blur: 1.0,
                precision: LGraphTexture.DEFAULT
            };

            if (!LGraphFXLens._shader) {
                LGraphFXLens._shader = new GL.Shader(
                    GL.Shader.SCREEN_VERTEX_SHADER,
                    LGraphFXLens.pixel_shader
                );
                LGraphFXLens._texture = new GL.Texture(3, 1, {
                    format: gl.RGB,
                    wrap: gl.CLAMP_TO_EDGE,
                    magFilter: gl.LINEAR,
                    minFilter: gl.LINEAR,
                    pixel_data: [255, 0, 0, 0, 255, 0, 0, 0, 255]
                });
            }
        }

        LGraphFXLens.title = "Lens";
        LGraphFXLens.desc = "Camera Lens distortion";
        LGraphFXLens.widgets_info = {
            precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
        };

        LGraphFXLens.prototype.onExecute = function() {
            var tex = this.getInputData(0);
            if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
                this.setOutputData(0, tex);
                return;
            }

            if (!tex) {
                return;
            }

            this._tex = LGraphTexture.getTargetTexture(
                tex,
                this._tex,
                this.properties.precision
            );

            var aberration = this.properties.aberration;
            if (this.isInputConnected(1)) {
                aberration = this.getInputData(1);
                this.properties.aberration = aberration;
            }

            var distortion = this.properties.distortion;
            if (this.isInputConnected(2)) {
                distortion = this.getInputData(2);
                this.properties.distortion = distortion;
            }

            var blur = this.properties.blur;
            if (this.isInputConnected(3)) {
                blur = this.getInputData(3);
                this.properties.blur = blur;
            }

            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            var mesh = Mesh.getScreenQuad();
            var shader = LGraphFXLens._shader;
            //var camera = LS.Renderer._current_camera;

            this._tex.drawTo(function() {
                tex.bind(0);
                shader
                    .uniforms({
                        u_texture: 0,
                        u_aberration: aberration,
                        u_distortion: distortion,
                        u_blur: blur
                    })
                    .draw(mesh);
            });

            this.setOutputData(0, this._tex);
        };

        LGraphFXLens.pixel_shader =
            "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform float u_aberration;\n\
			uniform float u_distortion;\n\
			uniform float u_blur;\n\
			\n\
			void main() {\n\
				vec2 coord = v_coord;\n\
				float dist = distance(vec2(0.5), coord);\n\
				vec2 dist_coord = coord - vec2(0.5);\n\
				float percent = 1.0 + ((0.5 - dist) / 0.5) * u_distortion;\n\
				dist_coord *= percent;\n\
				coord = dist_coord + vec2(0.5);\n\
				vec4 color = texture2D(u_texture,coord, u_blur * dist);\n\
				color.r = texture2D(u_texture,vec2(0.5) + dist_coord * (1.0+0.01*u_aberration), u_blur * dist ).r;\n\
				color.b = texture2D(u_texture,vec2(0.5) + dist_coord * (1.0-0.01*u_aberration), u_blur * dist ).b;\n\
				gl_FragColor = color;\n\
			}\n\
			";
        /*
			float normalized_tunable_sigmoid(float xs, float k)\n\
			{\n\
				xs = xs * 2.0 - 1.0;\n\
				float signx = sign(xs);\n\
				float absx = abs(xs);\n\
				return signx * ((-k - 1.0)*absx)/(2.0*(-2.0*k*absx+k-1.0)) + 0.5;\n\
			}\n\
		*/

        LiteGraph.registerNodeType("fx/lens", LGraphFXLens);
        global.LGraphFXLens = LGraphFXLens;

        /* not working yet
	function LGraphDepthOfField()
	{
		this.addInput("Color","Texture");
		this.addInput("Linear Depth","Texture");
		this.addInput("Camera","camera");
		this.addOutput("Texture","Texture");
		this.properties = { high_precision: false };
	}

	LGraphDepthOfField.title = "Depth Of Field";
	LGraphDepthOfField.desc = "Applies a depth of field effect";

	LGraphDepthOfField.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		var depth = this.getInputData(1);
		var camera = this.getInputData(2);

		if(!tex || !depth || !camera) 
		{
			this.setOutputData(0, tex);
			return;
		}

		var precision = gl.UNSIGNED_BYTE;
		if(this.properties.high_precision)
			precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;			
		if(!this._temp_texture || this._temp_texture.type != precision ||
			this._temp_texture.width != tex.width || this._temp_texture.height != tex.height)
			this._temp_texture = new GL.Texture( tex.width, tex.height, { type: precision, format: gl.RGBA, filter: gl.LINEAR });

		var shader = LGraphDepthOfField._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphDepthOfField._pixel_shader );

		var screen_mesh = Mesh.getScreenQuad();

		gl.disable( gl.DEPTH_TEST );
		gl.disable( gl.BLEND );

		var camera_position = camera.getEye();
		var focus_point = camera.getCenter();
		var distance = vec3.distance( camera_position, focus_point );
		var far = camera.far;
		var focus_range = distance * 0.5;

		this._temp_texture.drawTo( function() {
			tex.bind(0);
			depth.bind(1);
			shader.uniforms({u_texture:0, u_depth_texture:1, u_resolution: [1/tex.width, 1/tex.height], u_far: far, u_focus_point: distance, u_focus_scale: focus_range }).draw(screen_mesh);
		});

		this.setOutputData(0, this._temp_texture);
	}

	//from http://tuxedolabs.blogspot.com.es/2018/05/bokeh-depth-of-field-in-single-pass.html
	LGraphDepthOfField._pixel_shader = "\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture; //Image to be processed\n\
		uniform sampler2D u_depth_texture; //Linear depth, where 1.0 == far plane\n\
		uniform vec2 u_iresolution; //The size of a pixel: vec2(1.0/width, 1.0/height)\n\
		uniform float u_far; // Far plane\n\
		uniform float u_focus_point;\n\
		uniform float u_focus_scale;\n\
		\n\
		const float GOLDEN_ANGLE = 2.39996323;\n\
		const float MAX_BLUR_SIZE = 20.0;\n\
		const float RAD_SCALE = 0.5; // Smaller = nicer blur, larger = faster\n\
		\n\
		float getBlurSize(float depth, float focusPoint, float focusScale)\n\
		{\n\
		 float coc = clamp((1.0 / focusPoint - 1.0 / depth)*focusScale, -1.0, 1.0);\n\
		 return abs(coc) * MAX_BLUR_SIZE;\n\
		}\n\
		\n\
		vec3 depthOfField(vec2 texCoord, float focusPoint, float focusScale)\n\
		{\n\
		 float centerDepth = texture2D(u_depth_texture, texCoord).r * u_far;\n\
		 float centerSize = getBlurSize(centerDepth, focusPoint, focusScale);\n\
		 vec3 color = texture2D(u_texture, v_coord).rgb;\n\
		 float tot = 1.0;\n\
		\n\
		 float radius = RAD_SCALE;\n\
		 for (float ang = 0.0; ang < 100.0; ang += GOLDEN_ANGLE)\n\
		 {\n\
		  vec2 tc = texCoord + vec2(cos(ang), sin(ang)) * u_iresolution * radius;\n\
			\n\
		  vec3 sampleColor = texture2D(u_texture, tc).rgb;\n\
		  float sampleDepth = texture2D(u_depth_texture, tc).r * u_far;\n\
		  float sampleSize = getBlurSize( sampleDepth, focusPoint, focusScale );\n\
		  if (sampleDepth > centerDepth)\n\
		   sampleSize = clamp(sampleSize, 0.0, centerSize*2.0);\n\
			\n\
		  float m = smoothstep(radius-0.5, radius+0.5, sampleSize);\n\
		  color += mix(color/tot, sampleColor, m);\n\
		  tot += 1.0;\n\
		  radius += RAD_SCALE/radius;\n\
		  if(radius>=MAX_BLUR_SIZE)\n\
			 return color / tot;\n\
		 }\n\
		 return color / tot;\n\
		}\n\
		void main()\n\
		{\n\
			gl_FragColor = vec4( depthOfField( v_coord, u_focus_point, u_focus_scale ), 1.0 );\n\
			//gl_FragColor = vec4( texture2D(u_depth_texture, v_coord).r );\n\
		}\n\
		";

	LiteGraph.registerNodeType("fx/DOF", LGraphDepthOfField );
	global.LGraphDepthOfField = LGraphDepthOfField;
	*/

        //*******************************************************

        function LGraphFXBokeh() {
            this.addInput("Texture", "Texture");
            this.addInput("Blurred", "Texture");
            this.addInput("Mask", "Texture");
            this.addInput("Threshold", "number");
            this.addOutput("Texture", "Texture");
            this.properties = {
                shape: "",
                size: 10,
                alpha: 1.0,
                threshold: 1.0,
                high_precision: false
            };
        }

        LGraphFXBokeh.title = "Bokeh";
        LGraphFXBokeh.desc = "applies an Bokeh effect";

        LGraphFXBokeh.widgets_info = { shape: { widget: "texture" } };

        LGraphFXBokeh.prototype.onExecute = function() {
            var tex = this.getInputData(0);
            var blurred_tex = this.getInputData(1);
            var mask_tex = this.getInputData(2);
            if (!tex || !mask_tex || !this.properties.shape) {
                this.setOutputData(0, tex);
                return;
            }

            if (!blurred_tex) {
                blurred_tex = tex;
            }

            var shape_tex = LGraphTexture.getTexture(this.properties.shape);
            if (!shape_tex) {
                return;
            }

            var threshold = this.properties.threshold;
            if (this.isInputConnected(3)) {
                threshold = this.getInputData(3);
                this.properties.threshold = threshold;
            }

            var precision = gl.UNSIGNED_BYTE;
            if (this.properties.high_precision) {
                precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;
            }
            if (
                !this._temp_texture ||
                this._temp_texture.type != precision ||
                this._temp_texture.width != tex.width ||
                this._temp_texture.height != tex.height
            ) {
                this._temp_texture = new GL.Texture(tex.width, tex.height, {
                    type: precision,
                    format: gl.RGBA,
                    filter: gl.LINEAR
                });
            }

            //iterations
            var size = this.properties.size;

            var first_shader = LGraphFXBokeh._first_shader;
            if (!first_shader) {
                first_shader = LGraphFXBokeh._first_shader = new GL.Shader(
                    Shader.SCREEN_VERTEX_SHADER,
                    LGraphFXBokeh._first_pixel_shader
                );
            }

            var second_shader = LGraphFXBokeh._second_shader;
            if (!second_shader) {
                second_shader = LGraphFXBokeh._second_shader = new GL.Shader(
                    LGraphFXBokeh._second_vertex_shader,
                    LGraphFXBokeh._second_pixel_shader
                );
            }

            var points_mesh = this._points_mesh;
            if (
                !points_mesh ||
                points_mesh._width != tex.width ||
                points_mesh._height != tex.height ||
                points_mesh._spacing != 2
            ) {
                points_mesh = this.createPointsMesh(tex.width, tex.height, 2);
            }

            var screen_mesh = Mesh.getScreenQuad();

            var point_size = this.properties.size;
            var min_light = this.properties.min_light;
            var alpha = this.properties.alpha;

            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);

            this._temp_texture.drawTo(function() {
                tex.bind(0);
                blurred_tex.bind(1);
                mask_tex.bind(2);
                first_shader
                    .uniforms({
                        u_texture: 0,
                        u_texture_blur: 1,
                        u_mask: 2,
                        u_texsize: [tex.width, tex.height]
                    })
                    .draw(screen_mesh);
            });

            this._temp_texture.drawTo(function() {
                //clear because we use blending
                //gl.clearColor(0.0,0.0,0.0,1.0);
                //gl.clear( gl.COLOR_BUFFER_BIT );
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE, gl.ONE);

                tex.bind(0);
                shape_tex.bind(3);
                second_shader
                    .uniforms({
                        u_texture: 0,
                        u_mask: 2,
                        u_shape: 3,
                        u_alpha: alpha,
                        u_threshold: threshold,
                        u_pointSize: point_size,
                        u_itexsize: [1.0 / tex.width, 1.0 / tex.height]
                    })
                    .draw(points_mesh, gl.POINTS);
            });

            this.setOutputData(0, this._temp_texture);
        };

        LGraphFXBokeh.prototype.createPointsMesh = function(
            width,
            height,
            spacing
        ) {
            var nwidth = Math.round(width / spacing);
            var nheight = Math.round(height / spacing);

            var vertices = new Float32Array(nwidth * nheight * 2);

            var ny = -1;
            var dx = (2 / width) * spacing;
            var dy = (2 / height) * spacing;
            for (var y = 0; y < nheight; ++y) {
                var nx = -1;
                for (var x = 0; x < nwidth; ++x) {
                    var pos = y * nwidth * 2 + x * 2;
                    vertices[pos] = nx;
                    vertices[pos + 1] = ny;
                    nx += dx;
                }
                ny += dy;
            }

            this._points_mesh = GL.Mesh.load({ vertices2D: vertices });
            this._points_mesh._width = width;
            this._points_mesh._height = height;
            this._points_mesh._spacing = spacing;

            return this._points_mesh;
        };

        /*
	LGraphTextureBokeh._pixel_shader = "precision highp float;\n\
			varying vec2 a_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_shape;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_texture, gl_PointCoord );\n\
				color *= v_color * u_alpha;\n\
				gl_FragColor = color;\n\
			}\n";
	*/

        LGraphFXBokeh._first_pixel_shader =
            "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_texture_blur;\n\
			uniform sampler2D u_mask;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				vec4 blurred_color = texture2D(u_texture_blur, v_coord);\n\
				float mask = texture2D(u_mask, v_coord).x;\n\
			   gl_FragColor = mix(color, blurred_color, mask);\n\
			}\n\
			";

        LGraphFXBokeh._second_vertex_shader =
            "precision highp float;\n\
			attribute vec2 a_vertex2D;\n\
			varying vec4 v_color;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_mask;\n\
			uniform vec2 u_itexsize;\n\
			uniform float u_pointSize;\n\
			uniform float u_threshold;\n\
			void main() {\n\
				vec2 coord = a_vertex2D * 0.5 + 0.5;\n\
				v_color = texture2D( u_texture, coord );\n\
				v_color += texture2D( u_texture, coord + vec2(u_itexsize.x, 0.0) );\n\
				v_color += texture2D( u_texture, coord + vec2(0.0, u_itexsize.y));\n\
				v_color += texture2D( u_texture, coord + u_itexsize);\n\
				v_color *= 0.25;\n\
				float mask = texture2D(u_mask, coord).x;\n\
				float luminance = length(v_color) * mask;\n\
				/*luminance /= (u_pointSize*u_pointSize)*0.01 */;\n\
				luminance -= u_threshold;\n\
				if(luminance < 0.0)\n\
				{\n\
					gl_Position.x = -100.0;\n\
					return;\n\
				}\n\
				gl_PointSize = u_pointSize;\n\
				gl_Position = vec4(a_vertex2D,0.0,1.0);\n\
			}\n\
			";

        LGraphFXBokeh._second_pixel_shader =
            "precision highp float;\n\
			varying vec4 v_color;\n\
			uniform sampler2D u_shape;\n\
			uniform float u_alpha;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_shape, gl_PointCoord );\n\
				color *= v_color * u_alpha;\n\
				gl_FragColor = color;\n\
			}\n";

        LiteGraph.registerNodeType("fx/bokeh", LGraphFXBokeh);
        global.LGraphFXBokeh = LGraphFXBokeh;

        //************************************************

        function LGraphFXGeneric() {
            this.addInput("Texture", "Texture");
            this.addInput("value1", "number");
            this.addInput("value2", "number");
            this.addOutput("Texture", "Texture");
            this.properties = {
                fx: "halftone",
                value1: 1,
                value2: 1,
                precision: LGraphTexture.DEFAULT
            };
        }

        LGraphFXGeneric.title = "FX";
        LGraphFXGeneric.desc = "applies an FX from a list";

        LGraphFXGeneric.widgets_info = {
            fx: {
                widget: "combo",
                values: ["halftone", "pixelate", "lowpalette", "noise", "gamma"]
            },
            precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
        };
        LGraphFXGeneric.shaders = {};

        LGraphFXGeneric.prototype.onExecute = function() {
            if (!this.isOutputConnected(0)) {
                return;
            } //saves work

            var tex = this.getInputData(0);
            if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
                this.setOutputData(0, tex);
                return;
            }

            if (!tex) {
                return;
            }

            this._tex = LGraphTexture.getTargetTexture(
                tex,
                this._tex,
                this.properties.precision
            );

            //iterations
            var value1 = this.properties.value1;
            if (this.isInputConnected(1)) {
                value1 = this.getInputData(1);
                this.properties.value1 = value1;
            }

            var value2 = this.properties.value2;
            if (this.isInputConnected(2)) {
                value2 = this.getInputData(2);
                this.properties.value2 = value2;
            }

            var fx = this.properties.fx;
            var shader = LGraphFXGeneric.shaders[fx];
            if (!shader) {
                var pixel_shader_code = LGraphFXGeneric["pixel_shader_" + fx];
                if (!pixel_shader_code) {
                    return;
                }

                shader = LGraphFXGeneric.shaders[fx] = new GL.Shader(
                    Shader.SCREEN_VERTEX_SHADER,
                    pixel_shader_code
                );
            }

            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            var mesh = Mesh.getScreenQuad();
            var camera = global.LS ? LS.Renderer._current_camera : null;
            var camera_planes;
            if (camera) {
                camera_planes = [
                    LS.Renderer._current_camera.near,
                    LS.Renderer._current_camera.far
                ];
            } else {
                camera_planes = [1, 100];
            }

            var noise = null;
            if (fx == "noise") {
                noise = LGraphTexture.getNoiseTexture();
            }

            this._tex.drawTo(function() {
                tex.bind(0);
                if (fx == "noise") {
                    noise.bind(1);
                }

                shader
                    .uniforms({
                        u_texture: 0,
                        u_noise: 1,
                        u_size: [tex.width, tex.height],
                        u_rand: [Math.random(), Math.random()],
                        u_value1: value1,
                        u_value2: value2,
                        u_camera_planes: camera_planes
                    })
                    .draw(mesh);
            });

            this.setOutputData(0, this._tex);
        };

        LGraphFXGeneric.pixel_shader_halftone =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			\n\
			float pattern() {\n\
				float s = sin(u_value1 * 3.1415), c = cos(u_value1 * 3.1415);\n\
				vec2 tex = v_coord * u_size.xy;\n\
				vec2 point = vec2(\n\
				   c * tex.x - s * tex.y ,\n\
				   s * tex.x + c * tex.y \n\
				) * u_value2;\n\
				return (sin(point.x) * sin(point.y)) * 4.0;\n\
			}\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				float average = (color.r + color.g + color.b) / 3.0;\n\
				gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);\n\
			}\n";

        LGraphFXGeneric.pixel_shader_pixelate =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			\n\
			void main() {\n\
				vec2 coord = vec2( floor(v_coord.x * u_value1) / u_value1, floor(v_coord.y * u_value2) / u_value2 );\n\
				vec4 color = texture2D(u_texture, coord);\n\
				gl_FragColor = color;\n\
			}\n";

        LGraphFXGeneric.pixel_shader_lowpalette =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				gl_FragColor = floor(color * u_value1) / u_value1;\n\
			}\n";

        LGraphFXGeneric.pixel_shader_noise =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_noise;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			uniform vec2 u_rand;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				vec3 noise = texture2D(u_noise, v_coord * vec2(u_size.x / 512.0, u_size.y / 512.0) + u_rand).xyz - vec3(0.5);\n\
				gl_FragColor = vec4( color.xyz + noise * u_value1, color.a );\n\
			}\n";

        LGraphFXGeneric.pixel_shader_gamma =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_value1;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				float gamma = 1.0 / u_value1;\n\
				gl_FragColor = vec4( pow( color.xyz, vec3(gamma) ), color.a );\n\
			}\n";

        LiteGraph.registerNodeType("fx/generic", LGraphFXGeneric);
        global.LGraphFXGeneric = LGraphFXGeneric;

        // Vigneting ************************************

        function LGraphFXVigneting() {
            this.addInput("Tex.", "Texture");
            this.addInput("intensity", "number");

            this.addOutput("Texture", "Texture");
            this.properties = {
                intensity: 1,
                invert: false,
                precision: LGraphTexture.DEFAULT
            };

            if (!LGraphFXVigneting._shader) {
                LGraphFXVigneting._shader = new GL.Shader(
                    Shader.SCREEN_VERTEX_SHADER,
                    LGraphFXVigneting.pixel_shader
                );
            }
        }

        LGraphFXVigneting.title = "Vigneting";
        LGraphFXVigneting.desc = "Vigneting";

        LGraphFXVigneting.widgets_info = {
            precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
        };

        LGraphFXVigneting.prototype.onExecute = function() {
            var tex = this.getInputData(0);

            if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
                this.setOutputData(0, tex);
                return;
            }

            if (!tex) {
                return;
            }

            this._tex = LGraphTexture.getTargetTexture(
                tex,
                this._tex,
                this.properties.precision
            );

            var intensity = this.properties.intensity;
            if (this.isInputConnected(1)) {
                intensity = this.getInputData(1);
                this.properties.intensity = intensity;
            }

            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);

            var mesh = Mesh.getScreenQuad();
            var shader = LGraphFXVigneting._shader;
            var invert = this.properties.invert;

            this._tex.drawTo(function() {
                tex.bind(0);
                shader
                    .uniforms({
                        u_texture: 0,
                        u_intensity: intensity,
                        u_isize: [1 / tex.width, 1 / tex.height],
                        u_invert: invert ? 1 : 0
                    })
                    .draw(mesh);
            });

            this.setOutputData(0, this._tex);
        };

        LGraphFXVigneting.pixel_shader =
            "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_intensity;\n\
			uniform int u_invert;\n\
			\n\
			void main() {\n\
				float luminance = 1.0 - length( v_coord - vec2(0.5) ) * 1.414;\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				if(u_invert == 1)\n\
					luminance = 1.0 - luminance;\n\
				luminance = mix(1.0, luminance, u_intensity);\n\
			   gl_FragColor = vec4( luminance * color.xyz, color.a);\n\
			}\n\
			";

        LiteGraph.registerNodeType("fx/vigneting", LGraphFXVigneting);
        global.LGraphFXVigneting = LGraphFXVigneting;
    }
})(this);
