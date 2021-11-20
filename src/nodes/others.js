(function(global) {
    var LiteGraph = global.LiteGraph;
    
    /* in types :: run in console :: var s=""; LiteGraph.slot_types_in.forEach(function(el){s+=el+"\n";}); console.log(s); */
    
    if(typeof LiteGraph.slot_types_default_in == "undefined") LiteGraph.slot_types_default_in = {}; //[];
    LiteGraph.slot_types_default_in["_event_"] = "widget/button";
    LiteGraph.slot_types_default_in["array"] = "basic/array";
    LiteGraph.slot_types_default_in["boolean"] = "basic/boolean";
    LiteGraph.slot_types_default_in["number"] = "widget/number";
    LiteGraph.slot_types_default_in["object"] = "basic/data";
    LiteGraph.slot_types_default_in["string"] = ["basic/string","string/concatenate"];
    LiteGraph.slot_types_default_in["vec2"] = "math3d/xy-to-vec2";
    LiteGraph.slot_types_default_in["vec3"] = "math3d/xyz-to-vec3";
    LiteGraph.slot_types_default_in["vec4"] = "math3d/xyzw-to-vec4";
    
	LiteGraph.slot_types_default_in["audio"] = ["audio/source","audio/media_source"];
	LiteGraph.slot_types_default_in["canvas"] = "graphics/canvas";
	LiteGraph.slot_types_default_in["geometry"] = ["geometry/polygon","geometry/eval"];
	LiteGraph.slot_types_default_in["image"] = ["graphics/image","graphics/video","graphics/webcam"];
	LiteGraph.slot_types_default_in["mat4"] = "math3d/mat4";
	LiteGraph.slot_types_default_in["quat"] = ["math3d/quaternion","math3d/rotation"];
	LiteGraph.slot_types_default_in["table"] = "string/toTable";
	
    /* out types :: run in console :: var s=""; LiteGraph.slot_types_out.forEach(function(el){s+=el+"\n";}); console.log(s); */
    if(typeof LiteGraph.slot_types_default_out == "undefined") LiteGraph.slot_types_default_out = {};
    LiteGraph.slot_types_default_out["_event_"] = ["logic/IF","events/sequence","events/log","events/counter"];
    LiteGraph.slot_types_default_out["array"] = ["basic/watch","basic/set_array","basic/array[]"];
    LiteGraph.slot_types_default_out["boolean"] = ["logic/IF","basic/watch","math/branch","math/gate"];
    LiteGraph.slot_types_default_out["number"] = ["basic/watch"
												  ,{node:"math/operation",properties:{OP:"*"},title:"A*B"}
												  ,{node:"math/operation",properties:{OP:"/"},title:"A/B"}
												  ,{node:"math/operation",properties:{OP:"+"},title:"A+B"}
												  ,{node:"math/operation",properties:{OP:"-"},title:"A-B"}
												  ,{node:"math/compare",outputs:[["A==B", "boolean"]],title:"A==B"}
												  ,{node:"math/compare",outputs:[["A>B", "boolean"]],title:"A>B"}
												  ,{node:"math/compare",outputs:[["A<B", "boolean"]],title:"A<B"}
												];
    LiteGraph.slot_types_default_out["object"] = ["basic/object_property","basic/keys",["string/toString","basic/watch"]];
    LiteGraph.slot_types_default_out["string"] = ["basic/watch","string/compare","string/concatenate","string/contains"];
    LiteGraph.slot_types_default_out["vec2"] = "math3d/vec2-to-xy";
    LiteGraph.slot_types_default_out["vec3"] = "math3d/vec3-to-xyz";
    LiteGraph.slot_types_default_out["vec4"] = "math3d/vec4-to-xyzw";
	
	LiteGraph.slot_types_default_out["audio"] = ["audio/destination","audio/mixer","audio/analyser"];
	LiteGraph.slot_types_default_out["canvas"] = ["graphics/frame","graphics/drawImage"];
	LiteGraph.slot_types_default_out["geometry"] = ["geometry/points_to_instances","geometry/extrude","geometry/eval","geometry/connectPoints","geometry/transform"];
	LiteGraph.slot_types_default_out["image"] = ["graphics/frame","graphics/drawImage"];
	//LiteGraph.slot_types_default_out["mat4"] = "geometry/transform";
	LiteGraph.slot_types_default_out["quat"] = ["math3d/rotate_vec3","math3d/rotation"];
	LiteGraph.slot_types_default_out["table"] = "string/toTable";
	
})(this);