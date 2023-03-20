module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "overrides": [
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "globals": {
        "gl": true,
        "GL": true,
        "LS": true,
        "Uint8Array": true,
        "Uint32Array": true,
        "Float32Array": true,
        "LGraphCanvas": true,
        "LGraph": true,
        "LGraphNode": true,
        "LiteGraph": true,
        "LGraphTexture": true,
        "Mesh": true,
        "Shader": true,
        "enableWebGLCanvas": true,
        "vec2": true,
        "vec3": true,
        "vec4": true,
        "DEG2RAD": true,
        "isPowerOfTwo": true,
        "cloneCanvas": true,
        "createCanvas": true,
        "hex2num": true,
        "colorToString": true,
        "showElement": true,
        "quat": true,
        "AudioSynth": true,
        "SillyClient": true
    },
    "rules": {
        "no-console": "off",
        "no-empty": "warn",
        "no-redeclare": "warn",
        "no-inner-declarations": "warn",
        "no-constant-condition": "warn",
        "no-unused-vars": "warn",
        "no-mixed-spaces-and-tabs": "warn",
        "no-unreachable": "warn",
        "curly": ["warn", "all"]
    }
}
