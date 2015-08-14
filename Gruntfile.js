/*
 * grunt-wordpress-update
 * https://github.com/TWGerard/grunt-wordpress-update
 *
 * Copyright (c) 2015 LRXD
 */

'use strict';

module.exports = function(grunt) {

  var sshconfig = {};
  var wordpressdeploy = {
    options: {
      backup_dir: "backups/",
      rsync_args: ['--verbose', '--progress', '-rlpt', '--compress', '--omit-dir-times', '--delete'],
      exclusions: ['Gruntfile.js', '.git/', 'tmp/*', 'backups/', 'wp-config.php', '.htaccess', 'wp-content/uploads', 'cap/', 'composer.json', 'composer.lock', 'README.md', '.gitignore', 'package.json', 'node_modules']
    },
  };

  // Add servers to configs
  var servers = grunt.config.get('wordpressupdate')['servers'];
  var git_repo = grunt.config.get('wordpressupdate')['git_repo'];

  for (var s in servers) {
    var server = servers[s];
    sshconfig[server.title] = {
      host: server.ssh_host,
      username: server.ssh_user,
      agent: process.env.SSH_AUTH_SOCK,
      agentForward: true
    };
    wordpressdeploy[server.title] = server;
    wordpressdeploy[server.title].ssh_host = server.ssh_user + "@" + server.ssh_host;
  }

  // Skip repo stuff if we have a repo
  if (git_repo) {
    wordpressdeploy.options.exclusions.push("wp-content/themes");
    wordpressdeploy.options.exclusions.push("wp-content/plugins");
  }
 
  grunt.initConfig({
    git_repo: git_repo,
    wordpressdeploy: wordpressdeploy,
    sshconfig: sshconfig,
    sshexec: {
      git_status: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path + 'wp-content',
          'git status',
          'git remote -v'
        ].join(' && '),
        options: {
          callback: function(stdout) {
            console.log("CALLBACK");
            console.log(stdout);
          },
          config: (grunt.option('target') || task_options['target']),
        }
      },
      git_push: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path + '/wp-content',
          //'git push origin ' + servers[(grunt.option('target') || task_options['target'])].git_branch
        ].join(' && '),
        options: {
          config: (grunt.option('target') || task_options['target']),
        }
      },
      check_for_wp_repo: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path,
          'git remote -v'
        ].join(' && ' ),
        options: {
          callback: function(stdout) {
            if (stdout.indexOf("github.com/WordPress/WordPress.git") !== -1) {
              // we have a WP repo
              console.log("WP repo found");
              grunt.task.run('sshexec:delete_wp_repo');
            }
          },
          ignoreErrors: true,
          config: (grunt.option('target') || task_options['target']),
        }
      },
      delete_wp_repo: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path,
          'rm -rf .git'
        ].join(' && '),
        options: {
          config: (grunt.option('target') || task_options['target']),
        }
      },
      check_for_cap: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path,
          'ls -al cap/current'
        ].join(' && ' ),
        options: {
          callback: function(stdout) {
            if (stdout.indexOf("No such file or directory") === -1) {
              console.log("Found Capistrano");
              grunt.task.run('sshexec:clean_cap');
            }
          },
          ignoreErrors: true,
          config: (grunt.option('target') || task_options['target']),
        }
      },
      clean_cap: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path,
          'rm -rf ../private/cap',
          'cp -r cap ../private/cap',
          'rm -rf wp-content',
          'cp -rL cap/current wp-content',
          'rm -rf wp-content/REVISION',
          'rm -rf wp-content/uploads',
          'mv cap/shared/uploads wp-content/uploads',
          'mv cap/shared/cached-copy/.git wp-content/.git',
          'mv cap/shared/cached-copy/.gitignore wp-content/.gitignore',
          'rm -rf cap'
        ].join(' && '),
        options: {
          callback: function(stdout) {
          },
          config: (grunt.option('target') || task_options['target']),
        }
      },
    }
  });

  // Loud our tasks
  grunt.loadTasks('node_modules/grunt-wordpress-update/tasks');
 
  // Load dependancy tasks
  grunt.loadTasks('node_modules/grunt-wordpress-update/node_modules/grunt-wordpress-deploy/tasks');
  grunt.loadTasks('node_modules/grunt-wordpress-update/node_modules/grunt-ssh/tasks');
 
  // Register default task
  grunt.registerTask('default', ['sshexec:git_status']);

};