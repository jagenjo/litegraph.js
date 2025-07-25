module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    
    // File lists for different builds
    fullFiles: ['src/litegraph.js',
      'src/nodes/base.js',
      'src/nodes/events.js',
      'src/nodes/interface.js',
      'src/nodes/input.js',
      'src/nodes/math.js',
      'src/nodes/math3d.js',
      'src/nodes/strings.js',
      'src/nodes/logic.js',
      'src/nodes/graphics.js',
      'src/nodes/gltextures.js',
      'src/nodes/glshaders.js',
      'src/nodes/geometry.js',
      'src/nodes/glfx.js',
      'src/nodes/midi.js',
      'src/nodes/audio.js',
      'src/nodes/network.js'
    ],
    
    miniFiles: ['src/litegraph.js',
      'src/nodes/base.js',
      'src/nodes/events.js',
      'src/nodes/input.js',
      'src/nodes/math.js',
      'src/nodes/strings.js',
      'src/nodes/logic.js',
      'src/nodes/network.js'
    ],
    
    coreFiles: ['src/litegraph.js'],
    
    concat: {
      full: {
        src: '<%= fullFiles %>',
        dest: 'build/litegraph.js'
      },
      mini: {
        src: '<%= miniFiles %>',
        dest: 'build/litegraph_mini.js'
      },
      core: {
        src: '<%= coreFiles %>',
        dest: 'build/litegraph.core.js'
      }
    },
    
    uglify: {
      full: {
        src: 'build/litegraph.js',
        dest: 'build/litegraph.min.js'
      },
      mini: {
        src: 'build/litegraph_mini.js',
        dest: 'build/litegraph_mini.min.js'
      },
      core: {
        src: 'build/litegraph.core.js',
        dest: 'build/litegraph.core.min.js'
      }
    }
  })

  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-uglify')

  grunt.registerTask('build', ['concat', 'uglify'])
  grunt.registerTask('build-full', ['concat:full', 'uglify:full'])
  grunt.registerTask('build-mini', ['concat:mini', 'uglify:mini']) 
  grunt.registerTask('build-core', ['concat:core', 'uglify:core'])
}
