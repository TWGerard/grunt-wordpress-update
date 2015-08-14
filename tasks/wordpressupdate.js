/*
 * grunt-wordpress-deploy
 * https://github.com/webrain/grunt-wordpress-deploy
 *
 * Copyright (c) 2013 Webrain
 * Licensed under the MIT license.
 */

'use strict';

var grunt = require('grunt');

module.exports = function(grunt) {

  console.log("update/tasks/wordpressupdate.js");


  grunt.registerTask('pull_site', 'pulls the files and DB from the remote server', function() {
    var target = grunt.option('target') || task_options['target'];
    if ( typeof target === "undefined" || typeof grunt.config.get('wordpressdeploy')[target] === "undefined" || target === "local")  {
      grunt.fail.warn("Invalid target specified. Did you pass the wrong argument? Please check your task configuration.", 6);
    }

    console.log("pulling site from " + target);
    // Pull database
    grunt.task.run('pull_db');
    // Pulls WordPress files. Also pulls wp-content files if no repo is specified
    grunt.task.run('pull_files');
    if (git_repo) {
      grunt.task.run('sshexec:git_status');
    }
  });

};
