module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    projectFiles: ['src/litegraph.js',
      'src/nodes/base.js',
      'src/nodes/events.js',
      'src/nodes/interface.js',
      'src/nodes/input.js',
      'src/nodes/math.js',
      'src/nodes/logic.js',
      'src/nodes/image.js',
      'src/nodes/gltextures.js',
      'src/nodes/glfx.js',
      'src/nodes/midi.js',
      'src/nodes/audio.js'
    ],
    concat: {
      build: {
        src: '<%= projectFiles %>',
        dest: 'build/litegraph.js'
      }
    },
    copy: {
      parts: {
        files: [
          {
            expand: true,
            flatten: true,
            cwd: '',
            src: ['README.md'],
            dest: 'build/'
          }
        ]
      }
    },
    clean: {
      build: {src: ['build/*']}
    },
    closureCompiler: {

      options: {
        compilerFile: 'node_modules/google-closure-compiler/compiler.jar',
        compilerOpts: {
          formatting: 'pretty_print',
          warning_level: 'default'
        },
        d32: false, // will use 'java -client -d32 -jar compiler.jar'
        TieredCompilation: false// will use 'java -server -XX:+TieredCompilation -jar compiler.jar',
        // ,output_wrapper: '"var LiteGraph = (function(){%output% return LiteGraph;}).call(this);"'      //* Make container for all
      },
      targetName: {
        src: '<%= projectFiles %>',
        dest: 'build/litegraph.min.js'
      }
    }
  })

  grunt.registerTask('buildPackage', function () {
    var pkg = grunt.config.data.pkg
    var newPackage = {
      version: pkg.version,
      name: 'litegraph.js', //* Static name without ogranisation
      main: 'litegraph.js',
      description: pkg.description,
      dependencies: pkg.dependencies,
      author: pkg.author,
      license: 'MIT',
      scripts: {

      }
    }

    grunt.file.write('build/package.json', JSON.stringify(newPackage, undefined, 2))
  })

  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-closure-tools')
  grunt.loadNpmTasks('grunt-contrib-clean')

  grunt.registerTask('build', ['buildPackage', 'copy:parts', 'concat:build', 'closureCompiler'])
}
