module.exports = function(grunt) {
    grunt.loadNpmTasks('svg_fallback');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        svg_fallback: {
            options: {
                //debug: true,
                svgclass: "svgicon",
                closetags: false,
                movestyles: true,
                // usei8class: true,
                //svgstyle: "pointer-events: none; visibility: hidden;"
            },
            your_target: {
                src: 'src/',
                dest: 'out/'
            }
        }
    });
};
