/*
 * grunt-wordpress-deploy
 * https://github.com/webrain/grunt-wordpress-deploy
 *
 * Copyright (c) 2013 Webrain
 * Licensed under the MIT license.
 */

'use strict';

var grunt = require('grunt');
var shell = require('shelljs');

module.exports = function(grunt) {
  var target = grunt.option('target') || task_options['target'];
  var git_repo = grunt.config.get('wordpressupdate')['git_repo'];
  var servers = grunt.config('wordpressupdate')['servers'];
  var server = servers[target];

  grunt.registerTask('pull_site', 'pulls the files and DB from the remote server', function() {
    if ( typeof target === "undefined" || typeof server === "undefined" || target === "local")  {
      grunt.fail.warn("Invalid target specified. Did you pass the wrong argument? Please check your task configuration.", 6);
    }

    console.log("pulling site from " + target);
    // Pull database
    grunt.task.run('pull_db');
    grunt.task.run('sshexec:check_for_wp_repo');
    grunt.task.run('sshexec:check_for_cap');

    // Pulls WordPress files. Also pulls wp-content files if no repo is specified
    grunt.task.run('pull_files');
    grunt.task.run('check_wp_config');
    if (git_repo) {
      grunt.task.run('sshexec:check_content_repo_url');
      grunt.task.run('pull_content_repo');
    }
  });

  grunt.registerTask('pull_content_repo', 'pulls the remote repo', function() {
    shell.cd(servers['local']['path'] + '/wp-content');
    var local_origin = shell.exec('git config --get remote.origin.url');
    if (local_origin.code !== 0) {
      console.log("Creating local repo");
      //shell.exec('cd ../ && rm -rf wp-content && mkdir wp-content && cd wp-content');
      shell.cd(servers['local']['path']);
      shell.rm('-rf', 'wp-content');
      shell.mkdir('wp-content');
      shell.cd('wp-content');
      shell.exec('git clone ' + git_repo + ' .');
      shell.exec('git checkout ' + server.git_branch);
    } else if (local_origin.output !== git_repo) {
      grunt.fail.warn("Local origin is wrong! Expected '" + git_repo + "', but found '" + local_origin.output + "'.\n", 6);
    } else {
      shell.exec('git remote update');
      shell.exec('git checkout ' + server.git_branch);
      shell.exec('git pull -f origin ' + server.git_branch);
    }
  });

  grunt.registerTask('check_wp_config', 'checks for and creates (if necessary) the wp-config.php file', function() {
    shell.cd(servers['local'].path);
    var has_config = shell.exec('ls wp-config.php');
    has_config = !has_config.code;

    if (!has_config) {
      var has_sample_config = shell.exec('ls wp-config-sample.php');
      if (has_sample_config.code !== 0) {
        grunt.fail.warn("Missing local wp-config.php AND wp-config-sample.php");
      }

      var wp_config = grunt.file.read('wp-config-sample.php');
      wp_config = wp_config.replace('database_name_here', servers['local'].database);
      wp_config = wp_config.replace('username_here', servers['local'].user);
      wp_config = wp_config.replace('password_here', servers['local'].pass);
      wp_config = wp_config.replace('localhost', servers['local'].host);
      wp_config = wp_config.replace('wp_', grunt.config('wordpressupdate')['wp_prefix']);
      wp_config = wp_config.replace("define('WP_DEBUG', false);", "define('WP_DEBUG', true);");
      console.log("Creating wp-config.php from wp-config-sample.php using Grunt settings.");
      grunt.file.write('wp-config.php', wp_config);
    }
  });

  grunt.registerTask('open_permissions', 'sets wp-content permissions to be open enough for WP auto-updates', function() {
    shell.cd(servers['local']['path'] + '/wp-content');
    shell.mkdir('uploads');
    shell.mkdir('upgrade');
    shell.exec('sudo find . -type d -exec chmod 777 {} +');
  });

  grunt.registerTask('close_permissions', 'resets wp-content permissions to production-ready values', function() {
    shell.cd(servers['local']['path'] + '/wp-content');
    shell.exec('sudo find . -type d -exec chmod 755 {} +');
    shell.exec('sudo chmod 775 uploads');
    shell.exec('sudo chown -R ' + servers['local'].file_owner + ":" + servers['local'].file_group + ' .');
  });

  grunt.registerTask('push_site', 'pushes the WP Core and Plugins to the remote server', function() {

  });
};
